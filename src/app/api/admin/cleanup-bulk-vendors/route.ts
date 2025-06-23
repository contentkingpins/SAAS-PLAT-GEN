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
    console.log('🔄 Starting bulk vendor cleanup...');

    // First, ensure BULK_UPLOAD vendor exists
    let bulkUploadVendor = await prisma.vendor.findFirst({
      where: { code: 'BULK_UPLOAD' }
    });

    if (!bulkUploadVendor) {
      bulkUploadVendor = await prisma.vendor.create({
        data: {
          name: 'BULK_UPLOAD',
          code: 'BULK_UPLOAD',
          staticCode: 'BULK_UPLOAD',
          isActive: true
        }
      });
      console.log('✅ Created BULK_UPLOAD vendor');
    }

    // Find all vendors that look like bulk upload vendors
    // These typically have codes like VENDOR001, VENDOR002, etc. or match CSV data
    const bulkVendors = await prisma.vendor.findMany({
      where: {
        OR: [
          { code: { startsWith: 'VENDOR' } },
          { code: { in: ['VENDOR001', 'VENDOR002', 'VENDOR003', 'VENDOR004', 'VENDOR005'] } },
          { name: { startsWith: 'VENDOR' } },
          // Add other patterns that might indicate bulk upload vendors
          { code: { contains: 'BULK' } },
          { name: { contains: 'BULK' } }
        ],
        // Don't include the actual BULK_UPLOAD vendor
        NOT: { code: 'BULK_UPLOAD' }
      },
      include: {
        leads: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    console.log(`📊 Found ${bulkVendors.length} potential bulk upload vendors to clean up`);

    let totalLeadsMigrated = 0;
    let vendorsToDelete: string[] = [];

    // Process each bulk vendor
    for (const vendor of bulkVendors) {
      const leadCount = vendor.leads.length;
      
      if (leadCount > 0) {
        console.log(`📦 Migrating ${leadCount} leads from vendor "${vendor.name}" (${vendor.code}) to BULK_UPLOAD`);
        
        // Update all leads from this vendor to use BULK_UPLOAD
        await prisma.lead.updateMany({
          where: { vendorId: vendor.id },
          data: {
            vendorId: bulkUploadVendor.id,
            vendorCode: 'BULK_UPLOAD'
          }
        });

        totalLeadsMigrated += leadCount;
        vendorsToDelete.push(vendor.id);
        
        console.log(`  ✅ Migrated ${leadCount} leads from ${vendor.name}`);
      } else {
        // No leads, just mark for deletion
        vendorsToDelete.push(vendor.id);
        console.log(`  🗑️ Marking empty vendor "${vendor.name}" for deletion`);
      }
    }

    // Delete the now-empty bulk vendors
    if (vendorsToDelete.length > 0) {
      await prisma.vendor.deleteMany({
        where: {
          id: { in: vendorsToDelete }
        }
      });
      console.log(`🗑️ Deleted ${vendorsToDelete.length} empty bulk vendors`);
    }

    const summary = {
      vendorsProcessed: bulkVendors.length,
      leadsMigrated: totalLeadsMigrated,
      vendorsDeleted: vendorsToDelete.length,
      bulkUploadVendorId: bulkUploadVendor.id
    };

    console.log('🎉 Bulk vendor cleanup completed:', summary);

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${totalLeadsMigrated} leads to BULK_UPLOAD vendor and cleaned up ${vendorsToDelete.length} old vendors`,
      summary
    });

  } catch (error: any) {
    console.error('❌ Error during bulk vendor cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup bulk vendors', details: error.message },
      { status: 500 }
    );
  }
} 