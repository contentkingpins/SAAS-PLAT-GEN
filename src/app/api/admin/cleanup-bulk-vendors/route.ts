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
    console.log('🔄 Starting COMPREHENSIVE bulk vendor cleanup...');

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

    // Find ALL vendors EXCEPT BULK_UPLOAD (since all existing vendors are from bulk imports)
    // We'll exclude any system/admin vendors if they exist
    const allBulkVendors = await prisma.vendor.findMany({
      where: {
        AND: [
          { code: { not: 'BULK_UPLOAD' } },
          // Exclude any potential system vendors
          { code: { not: { in: ['SYSTEM', 'ADMIN', 'DEFAULT'] } } },
          { name: { not: { in: ['SYSTEM', 'ADMIN', 'DEFAULT'] } } }
        ]
      },
      include: {
        leads: {
          select: { id: true, firstName: true, lastName: true }
        },
        users: {
          select: { id: true, email: true }
        }
      }
    });

    console.log(`📊 Found ${allBulkVendors.length} bulk import vendors to consolidate:`);
    allBulkVendors.forEach(vendor => {
      console.log(`   - ${vendor.name} (${vendor.code}): ${vendor.leads.length} leads, ${vendor.users.length} users`);
    });

    let totalLeadsMigrated = 0;
    let vendorsToDelete: string[] = [];
    let usersToReassign: string[] = [];

    // Process each bulk vendor
    for (const vendor of allBulkVendors) {
      const leadCount = vendor.leads.length;
      const userCount = vendor.users.length;
      
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
        console.log(`  ✅ Migrated ${leadCount} leads from ${vendor.name}`);
      }

      if (userCount > 0) {
        console.log(`👥 Found ${userCount} users associated with vendor "${vendor.name}"`);
        // We'll need to handle users separately - either reassign or note them
        vendor.users.forEach(user => {
          usersToReassign.push(`${user.email} (from ${vendor.name})`);
        });
      }

      // Mark vendor for deletion (we'll handle users separately)
      vendorsToDelete.push(vendor.id);
    }

    // Handle users before deleting vendors
    if (usersToReassign.length > 0) {
      console.log(`⚠️  Warning: Found ${usersToReassign.length} users that need to be handled:`);
      usersToReassign.forEach(userInfo => console.log(`   - ${userInfo}`));
      
      // For now, we'll just log this and not delete vendors with users
      // You can manually handle these users through the admin interface
      const vendorsWithUsers = allBulkVendors.filter(v => v.users.length > 0).map(v => v.id);
      vendorsToDelete = vendorsToDelete.filter(id => !vendorsWithUsers.includes(id));
      
      console.log(`🔄 Skipping deletion of ${vendorsWithUsers.length} vendors with users - handle manually`);
    }

    // Delete the now-empty bulk vendors (only those without users)
    if (vendorsToDelete.length > 0) {
      await prisma.vendor.deleteMany({
        where: {
          id: { in: vendorsToDelete }
        }
      });
      console.log(`🗑️ Deleted ${vendorsToDelete.length} empty bulk vendors`);
    }

    const summary = {
      vendorsFound: allBulkVendors.length,
      leadsMigrated: totalLeadsMigrated,
      vendorsDeleted: vendorsToDelete.length,
      vendorsWithUsersSkipped: allBulkVendors.length - vendorsToDelete.length,
      usersNeedingAttention: usersToReassign.length,
      bulkUploadVendorId: bulkUploadVendor.id
    };

    console.log('🎉 COMPREHENSIVE bulk vendor cleanup completed:', summary);

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${totalLeadsMigrated} leads to BULK_UPLOAD vendor and cleaned up ${vendorsToDelete.length} old vendors`,
      summary,
      usersNeedingAttention: usersToReassign.length > 0 ? usersToReassign : undefined
    });

  } catch (error: any) {
    console.error('❌ Error during comprehensive bulk vendor cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup bulk vendors', details: error.message },
      { status: 500 }
    );
  }
} 