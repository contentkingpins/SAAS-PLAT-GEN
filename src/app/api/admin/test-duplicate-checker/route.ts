import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';

// Helper function to check if a status indicates consultation/approval
function isConsultationStatus(status: string): boolean {
  return ['SENT_TO_CONSULT', 'APPROVED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'KIT_RETURNING', 'COLLECTIONS', 'KIT_COMPLETED'].includes(status);
}

// Helper function to calculate days between dates
function daysBetween(date1: Date, date2: Date): number {
  const timeDiff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

// GET /api/admin/test-duplicate-checker - Test the duplicate checking system
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    console.log('🧪 === DUPLICATE CHECKER TEST STARTING ===');

    // Test 1: Get all unique MBIs in the system
    const uniqueMBIs = await prisma.lead.groupBy({
      by: ['mbi'],
      _count: { mbi: true },
      orderBy: { _count: { mbi: 'desc' } },
      take: 10 // Top 10 most common MBIs
    });

    // Test 2: Find leads that have reached SENT_TO_CONSULT status
    const consultedLeads = await prisma.lead.findMany({
      where: {
        status: { in: ['SENT_TO_CONSULT', 'APPROVED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'KIT_RETURNING', 'COLLECTIONS', 'KIT_COMPLETED'] }
      },
      select: {
        id: true,
        mbi: true,
        firstName: true,
        lastName: true,
        testType: true,
        status: true,
        createdAt: true,
        consultDate: true,
        vendor: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Test 3: Check for potential duplicates among consulted leads
    const duplicateAnalysis = [];
    for (const lead of consultedLeads.slice(0, 5)) { // Test top 5 consulted leads
      const sameMbiLeads = await prisma.lead.findMany({
        where: {
          mbi: lead.mbi,
          id: { not: lead.id }
        },
        select: {
          id: true,
          testType: true,
          status: true,
          createdAt: true,
          consultDate: true,
          vendor: { select: { name: true, code: true } }
        }
      });

      if (sameMbiLeads.length > 0) {
        const analysis = {
          leadId: lead.id,
          mbi: lead.mbi,
          patientName: `${lead.firstName} ${lead.lastName}`,
          testType: lead.testType,
          status: lead.status,
          consultDate: lead.consultDate,
          isConsulted: isConsultationStatus(lead.status),
          duplicates: sameMbiLeads.map(duplicate => {
            const daysBetween = Math.abs(new Date(duplicate.createdAt).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            const isDuplicateConsulted = isConsultationStatus(duplicate.status);
            
            let ruleViolation = null;
            if (duplicate.testType === lead.testType) {
              ruleViolation = 'SAME_TEST_TYPE';
            } else if (isDuplicateConsulted && daysBetween < 21) {
              ruleViolation = 'RECENT_CONSULTATION';
            } else if (!isDuplicateConsulted && daysBetween < 21) {
              ruleViolation = 'TOO_SOON';
            }

            return {
              id: duplicate.id,
              testType: duplicate.testType,
              status: duplicate.status,
              createdAt: duplicate.createdAt,
              consultDate: duplicate.consultDate,
              isConsulted: isDuplicateConsulted,
              daysBetween: Math.round(daysBetween),
              vendor: duplicate.vendor.name,
              ruleViolation
            };
          })
        };
        duplicateAnalysis.push(analysis);
      }
    }

    // Test 4: Count leads by status to understand workflow
    const statusCounts = await prisma.lead.groupBy({
      by: ['status'],
      _count: { status: true },
      orderBy: { _count: { status: 'desc' } }
    });

    // Test 5: Check active alerts related to duplicates
    const activeAlerts = await prisma.leadAlert.findMany({
      where: {
        type: 'MBI_DUPLICATE',
        isAcknowledged: false
      },
      include: {
        lead: {
          select: {
            id: true,
            mbi: true,
            firstName: true,
            lastName: true,
            testType: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Test 6: Test the actual duplicate checking logic
    const testMBI = '1A2B-C3D-EF45'; // Example MBI format
    const testResults: {
      mbi: string;
      tests: Array<{
        testType: string;
        result: string;
        message: string;
        reason?: string | null;
      }>;
    } = {
      mbi: testMBI,
      tests: []
    };

    // Simulate testing both test types
    for (const testType of ['IMMUNE', 'NEURO']) {
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/leads/check-mbi-duplicate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || ''
          },
          body: JSON.stringify({ mbi: testMBI, testType })
        });

        const result = await response.json();
        testResults.tests.push({
          testType,
          result: result.status,
          message: result.message,
          reason: result.reason || null
        });
             } catch (error) {
         testResults.tests.push({
           testType,
           result: 'ERROR',
           message: `Test failed: ${error instanceof Error ? error.message : String(error)}`
         });
       }
    }

    const summary = {
      system_status: 'OPERATIONAL',
      total_leads: await prisma.lead.count(),
      unique_mbis: uniqueMBIs.length,
      consulted_leads: consultedLeads.length,
      duplicate_groups: duplicateAnalysis.length,
      active_duplicate_alerts: activeAlerts.length,
      test_timestamp: new Date().toISOString()
    };

    console.log('🧪 === DUPLICATE CHECKER TEST COMPLETE ===');
    console.log('📊 Summary:', summary);

    return NextResponse.json({
      success: true,
      summary,
      data: {
        mbi_distribution: uniqueMBIs,
        consulted_leads: consultedLeads,
        duplicate_analysis: duplicateAnalysis,
        status_distribution: statusCounts,
        active_alerts: activeAlerts,
        api_test_results: testResults
      },
      recommendations: [
        'Review duplicate_analysis for potential rule violations',
        'Check active_alerts for unresolved duplicate issues',
        'Monitor consulted_leads for proper SENT_TO_CONSULT tracking',
        'Verify api_test_results show correct blocking/allowing behavior'
      ]
    });

  } catch (error) {
    console.error('❌ Error testing duplicate checker:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to test duplicate checker' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/admin/test-duplicate-checker - Run specific duplicate check test
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { mbi, testType } = body;

    if (!mbi || !testType) {
      return NextResponse.json(
        { error: 'MBI and testType are required' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing duplicate check for MBI: ${mbi}, Test Type: ${testType}`);

    // Call the actual duplicate checking API
    const response = await fetch(`${request.nextUrl.origin}/api/leads/check-mbi-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mbi, testType })
    });

    const result = await response.json();

    // Get detailed information about existing leads with this MBI
    const existingLeads = await prisma.lead.findMany({
      where: { mbi },
      include: {
        vendor: { select: { name: true, code: true } },
        alerts: {
          where: { isAcknowledged: false },
          select: { type: true, severity: true, message: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      test_input: { mbi, testType },
      duplicate_check_result: result,
      existing_leads: existingLeads.map(lead => ({
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        testType: lead.testType,
        status: lead.status,
        consultDate: lead.consultDate,
        isConsulted: isConsultationStatus(lead.status),
        daysSinceCreated: daysBetween(lead.createdAt, new Date()),
        vendor: lead.vendor.name,
        activeAlerts: lead.alerts.length
      })),
      analysis: {
        total_existing_leads: existingLeads.length,
        same_test_type_leads: existingLeads.filter(l => l.testType === testType).length,
        consulted_leads: existingLeads.filter(l => isConsultationStatus(l.status)).length,
        recent_leads: existingLeads.filter(l => daysBetween(l.createdAt, new Date()) < 21).length
      }
    });

  } catch (error) {
    console.error('❌ Error in specific duplicate test:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run specific test' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 