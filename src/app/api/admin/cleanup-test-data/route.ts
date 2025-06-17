import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    console.log('🧹 Starting test data cleanup via API...');
    
    // Start a transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Count current data for reporting
      const currentCounts = {
        leads: await tx.lead.count(),
        fileUploads: await tx.fileUpload.count(),
        contactAttempts: await tx.contactAttempt.count(),
        callbacks: await tx.callback.count(),
        complianceChecklists: await tx.complianceChecklist.count(),
        leadAlerts: await tx.leadAlert.count(),
        dailyMetrics: await tx.dailyMetrics.count(),
        vendors: await tx.vendor.count(),
        users: await tx.user.count(),
        teams: await tx.team.count()
      };

      // 2. Delete related data first (due to foreign key constraints)
      
      // Delete lead alerts
      const deletedAlerts = await tx.leadAlert.deleteMany({});
      
      // Delete compliance checklists
      const deletedChecklists = await tx.complianceChecklist.deleteMany({});
      
      // Delete contact attempts
      const deletedAttempts = await tx.contactAttempt.deleteMany({});
      
      // Delete callbacks
      const deletedCallbacks = await tx.callback.deleteMany({});
      
      // Delete file uploads
      const deletedUploads = await tx.fileUpload.deleteMany({});
      
      // Delete daily metrics
      const deletedMetrics = await tx.dailyMetrics.deleteMany({});

      // 3. Delete all leads
      const deletedLeads = await tx.lead.deleteMany({});

      // 4. Clean up test vendors
      const testVendorPatterns = ['TEST', 'DEMO', 'SAMPLE', 'BASELINE', 'EXAMPLE'];
      
      const testVendors = await tx.vendor.findMany({
        where: {
          OR: testVendorPatterns.flatMap(pattern => [
            { code: { contains: pattern, mode: 'insensitive' } },
            { name: { contains: pattern, mode: 'insensitive' } }
          ])
        }
      });
      
      let deletedVendorsCount = 0;
      for (const vendor of testVendors) {
        await tx.vendor.delete({ where: { id: vendor.id } });
        deletedVendorsCount++;
      }

      // 5. Clean up test users (keep admin users)
      const testUsers = await tx.user.findMany({
        where: {
          AND: [
            { role: { not: 'ADMIN' } },
            { email: { not: { endsWith: '@healthcare.com' } } },
            {
              OR: [
                { email: { contains: 'test', mode: 'insensitive' } },
                { email: { contains: 'demo', mode: 'insensitive' } },
                { email: { contains: 'sample', mode: 'insensitive' } },
                { email: { contains: 'example', mode: 'insensitive' } },
                { firstName: { contains: 'Test', mode: 'insensitive' } },
                { lastName: { contains: 'Test', mode: 'insensitive' } }
              ]
            }
          ]
        }
      });
      
      let deletedUsersCount = 0;
      for (const user of testUsers) {
        await tx.user.delete({ where: { id: user.id } });
        deletedUsersCount++;
      }

      // 6. Clean up test teams
      const testTeams = await tx.team.findMany({
        where: {
          OR: [
            { name: { contains: 'Test', mode: 'insensitive' } },
            { name: { contains: 'Demo', mode: 'insensitive' } },
            { name: { contains: 'Sample', mode: 'insensitive' } }
          ]
        }
      });
      
      let deletedTeamsCount = 0;
      for (const team of testTeams) {
        await tx.team.delete({ where: { id: team.id } });
        deletedTeamsCount++;
      }

      // Final counts
      const finalCounts = {
        leads: await tx.lead.count(),
        fileUploads: await tx.fileUpload.count(),
        contactAttempts: await tx.contactAttempt.count(),
        callbacks: await tx.callback.count(),
        complianceChecklists: await tx.complianceChecklist.count(),
        leadAlerts: await tx.leadAlert.count(),
        dailyMetrics: await tx.dailyMetrics.count(),
        vendors: await tx.vendor.count(),
        users: await tx.user.count(),
        teams: await tx.team.count()
      };

      return {
        currentCounts,
        finalCounts,
        deletedCounts: {
          leads: deletedLeads.count,
          fileUploads: deletedUploads.count,
          contactAttempts: deletedAttempts.count,
          callbacks: deletedCallbacks.count,
          complianceChecklists: deletedChecklists.count,
          leadAlerts: deletedAlerts.count,
          dailyMetrics: deletedMetrics.count,
          vendors: deletedVendorsCount,
          users: deletedUsersCount,
          teams: deletedTeamsCount
        }
      };
    });

    console.log('✅ Test data cleanup completed successfully via API');
    
    return NextResponse.json({
      success: true,
      message: 'Test data cleanup completed successfully',
      results: result
    });
    
  } catch (error: any) {
    console.error('❌ Error during cleanup via API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cleanup test data', 
        details: error.message 
      },
      { status: 500 }
    );
  }
} 