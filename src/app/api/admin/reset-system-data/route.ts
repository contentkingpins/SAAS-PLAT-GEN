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
    console.log('🧹 Starting comprehensive system data reset...');

    // Track what we're deleting for the response
    const deletionStats = {
      leadAlerts: 0,
      complianceChecklists: 0,
      contactAttempts: 0,
      callbacks: 0,
      leads: 0,
      fileUploads: 0,
      dailyMetrics: 0,
      vendors: 0
    };

    // Step 1: Delete all lead-related data (cascading deletes)
    console.log('🗑️ Deleting lead alerts...');
    const deletedAlerts = await prisma.leadAlert.deleteMany({});
    deletionStats.leadAlerts = deletedAlerts.count;

    console.log('🗑️ Deleting compliance checklists...');
    const deletedChecklists = await prisma.complianceChecklist.deleteMany({});
    deletionStats.complianceChecklists = deletedChecklists.count;

    console.log('🗑️ Deleting contact attempts...');
    const deletedContactAttempts = await prisma.contactAttempt.deleteMany({});
    deletionStats.contactAttempts = deletedContactAttempts.count;

    console.log('🗑️ Deleting callbacks...');
    const deletedCallbacks = await prisma.callback.deleteMany({});
    deletionStats.callbacks = deletedCallbacks.count;

    // Step 2: Delete all leads
    console.log('🗑️ Deleting all leads...');
    const deletedLeads = await prisma.lead.deleteMany({});
    deletionStats.leads = deletedLeads.count;

    // Step 3: Delete file uploads
    console.log('🗑️ Deleting file uploads...');
    const deletedFileUploads = await prisma.fileUpload.deleteMany({});
    deletionStats.fileUploads = deletedFileUploads.count;

    // Step 4: Delete daily metrics
    console.log('🗑️ Deleting daily metrics...');
    const deletedMetrics = await prisma.dailyMetrics.deleteMany({});
    deletionStats.dailyMetrics = deletedMetrics.count;

    // Step 5: Delete all vendors (we'll recreate BULK_UPLOAD later)
    console.log('🗑️ Deleting all vendors...');
    const deletedVendors = await prisma.vendor.deleteMany({});
    deletionStats.vendors = deletedVendors.count;

    // Step 6: Create the BULK_UPLOAD vendor for future use
    console.log('✅ Creating BULK_UPLOAD vendor...');
    const bulkUploadVendor = await prisma.vendor.create({
      data: {
        name: 'BULK_UPLOAD',
        code: 'BULK_UPLOAD',
        staticCode: 'BULK_UPLOAD',
        isActive: true
      }
    });

    console.log('🎉 System data reset completed successfully!');

    const response = {
      success: true,
      message: 'System data reset completed successfully. Ready for fresh data upload.',
      deletionStats,
      newVendor: {
        id: bulkUploadVendor.id,
        name: bulkUploadVendor.name,
        code: bulkUploadVendor.code
      },
      summary: {
        totalRecordsDeleted: Object.values(deletionStats).reduce((sum, count) => sum + count, 0),
        preserved: [
          'User accounts',
          'Teams',
          'Authentication settings',
          'System configuration'
        ]
      }
    };

    console.log('📊 Reset summary:', response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error during system data reset:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reset system data', 
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 