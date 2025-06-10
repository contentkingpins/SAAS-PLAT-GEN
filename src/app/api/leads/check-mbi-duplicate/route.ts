import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

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

    // Check business rules
    for (const existing of existingLeads) {
      const daysSince = daysBetween(existing.createdAt, new Date());

      // Rule 1: Same test type = always block
      if (existing.testType === testType) {
        return NextResponse.json({
          status: 'BLOCKED',
          reason: 'SAME_TEST',
          message: `Patient already has ${testType} test in system. Cannot submit duplicate.`,
          existingLeads: [{
            id: existing.id,
            testType: existing.testType,
            submittedAt: existing.createdAt.toISOString(),
            daysSince,
            vendor: existing.vendor.name,
            status: existing.status
          }]
        });
      }

      // Rule 2: Different test type but < 21 days = block
      if (daysSince < 21) {
        return NextResponse.json({
          status: 'BLOCKED',
          reason: 'TOO_SOON',
          message: `Patient submitted ${existing.testType} test ${daysSince} days ago. Must wait 21 days between different tests.`,
          daysSince,
          requiredWaitDays: 21,
          existingLeads: [{
            id: existing.id,
            testType: existing.testType,
            submittedAt: existing.createdAt.toISOString(),
            daysSince,
            vendor: existing.vendor.name,
            status: existing.status
          }]
        });
      }
    }

    // Rule 3: Different test type and >= 21 days = allow
    const mostRecentLead = existingLeads[0];
    const daysSinceMostRecent = daysBetween(mostRecentLead.createdAt, new Date());

    return NextResponse.json({
      status: 'ALLOWED',
      message: `Available for ${testType} test (previous ${mostRecentLead.testType} test was ${daysSinceMostRecent} days ago)`,
      existingLeads: existingLeads.map(lead => ({
        id: lead.id,
        testType: lead.testType,
        submittedAt: lead.createdAt.toISOString(),
        daysSince: daysBetween(lead.createdAt, new Date()),
        vendor: lead.vendor.name,
        status: lead.status
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
