import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Validation schema
const mbiCheckSchema = z.object({
  mbi: z.string().min(11, 'MBI must be at least 11 characters'),
  testType: z.enum(['IMMUNE', 'NEURO'], { required_error: 'Test type is required' }),
});

// Helper function to calculate days between dates
function daysBetween(date1: Date, date2: Date): number {
  const timeDiff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

// Helper function to check if a status indicates consultation/approval
function isConsultationStatus(status: string): boolean {
  return ['SENT_TO_CONSULT', 'APPROVED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'KIT_RETURNING', 'COLLECTIONS', 'KIT_COMPLETED'].includes(status);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = mbiCheckSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { mbi, testType } = validation.data;

    // Find all existing leads with this MBI
    const existingLeads = await prisma.lead.findMany({
      where: { mbi },
      select: {
        id: true,
        testType: true,
        createdAt: true,
        status: true,
        advocateReviewedAt: true,
        consultDate: true,
        vendor: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // If no existing leads, MBI is available
    if (existingLeads.length === 0) {
      return NextResponse.json({
        status: 'ALLOWED',
        message: 'MBI is available for this test type',
        existingLeads: []
      });
    }

    // ENHANCED BUSINESS RULES FOR SENT_TO_CONSULT TRACKING
    console.log(`🔍 Checking duplicate rules for MBI: ${mbi}, Test Type: ${testType}`);
    
    for (const existing of existingLeads) {
      const daysSince = daysBetween(existing.createdAt, new Date());
      const isConsulted = isConsultationStatus(existing.status);

      console.log(`📋 Existing lead: ${existing.id}, Status: ${existing.status}, Test: ${existing.testType}, Days: ${daysSince}, Consulted: ${isConsulted}`);

      // RULE 1: Same test type = ALWAYS block (regardless of status or time)
      if (existing.testType === testType) {
        const blockReason = isConsulted 
          ? `Patient already consulted for ${testType} test (Status: ${existing.status}). Cannot submit duplicate.`
          : `Patient already has ${testType} test in system. Cannot submit duplicate.`;

        return NextResponse.json({
          status: 'BLOCKED',
          reason: 'SAME_TEST',
          message: blockReason,
          existingLeads: [{
            id: existing.id,
            testType: existing.testType,
            submittedAt: existing.createdAt.toISOString(),
            daysSince,
            vendor: existing.vendor.name,
            status: existing.status,
            wasConsulted: isConsulted,
            consultationDate: existing.consultDate?.toISOString() || null
          }]
        });
      }

      // RULE 2: Different test type but patient has been CONSULTED for ANY test < 21 days ago
      if (isConsulted && daysSince < 21) {
        return NextResponse.json({
          status: 'BLOCKED',
          reason: 'RECENT_CONSULTATION',
          message: `Patient was consulted for ${existing.testType} test ${daysSince} days ago (Status: ${existing.status}). Must wait 21 days between different tests after consultation.`,
          daysSince,
          requiredWaitDays: 21,
          existingLeads: [{
            id: existing.id,
            testType: existing.testType,
            submittedAt: existing.createdAt.toISOString(),
            daysSince,
            vendor: existing.vendor.name,
            status: existing.status,
            wasConsulted: isConsulted,
            consultationDate: existing.consultDate?.toISOString() || null
          }]
        });
      }

      // RULE 3: Different test type but NOT consulted yet, still < 21 days = block
      if (!isConsulted && daysSince < 21) {
        return NextResponse.json({
          status: 'BLOCKED',
          reason: 'TOO_SOON',
          message: `Patient submitted ${existing.testType} test ${daysSince} days ago (Status: ${existing.status}). Must wait 21 days between different tests.`,
          daysSince,
          requiredWaitDays: 21,
          existingLeads: [{
            id: existing.id,
            testType: existing.testType,
            submittedAt: existing.createdAt.toISOString(),
            daysSince,
            vendor: existing.vendor.name,
            status: existing.status,
            wasConsulted: isConsulted,
            consultationDate: existing.consultDate?.toISOString() || null
          }]
        });
      }
    }

    // RULE 4: Different test type and >= 21 days = allow
    const mostRecentLead = existingLeads[0];
    const daysSinceMostRecent = daysBetween(mostRecentLead.createdAt, new Date());
    const wasConsulted = isConsultationStatus(mostRecentLead.status);

    const allowMessage = wasConsulted
      ? `Available for ${testType} test (previous ${mostRecentLead.testType} consultation was ${daysSinceMostRecent} days ago)`
      : `Available for ${testType} test (previous ${mostRecentLead.testType} test was ${daysSinceMostRecent} days ago)`;

    console.log(`✅ Duplicate check passed: ${allowMessage}`);

    return NextResponse.json({
      status: 'ALLOWED',
      message: allowMessage,
      existingLeads: existingLeads.map(lead => ({
        id: lead.id,
        testType: lead.testType,
        submittedAt: lead.createdAt.toISOString(),
        daysSince: daysBetween(lead.createdAt, new Date()),
        vendor: lead.vendor.name,
        status: lead.status,
        wasConsulted: isConsultationStatus(lead.status),
        consultationDate: lead.consultDate?.toISOString() || null
      }))
    });

  } catch (error) {
    console.error('Error checking MBI duplicate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
