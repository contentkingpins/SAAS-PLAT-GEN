const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
});

async function cleanupTestData() {
  console.log('🧹 Starting test data cleanup...\n');
  
  try {
    // Start a transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      
      // 1. Count current data for reporting
      console.log('📊 Current database state:');
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
      
      Object.entries(currentCounts).forEach(([table, count]) => {
        console.log(`   ${table}: ${count} records`);
      });
      console.log('');

      // 2. Delete related data first (due to foreign key constraints)
      console.log('🗑️  Cleaning up related data...');
      
      // Delete lead alerts
      const deletedAlerts = await tx.leadAlert.deleteMany({});
      console.log(`   ✅ Deleted ${deletedAlerts.count} lead alerts`);
      
      // Delete compliance checklists
      const deletedChecklists = await tx.complianceChecklist.deleteMany({});
      console.log(`   ✅ Deleted ${deletedChecklists.count} compliance checklists`);
      
      // Delete contact attempts
      const deletedAttempts = await tx.contactAttempt.deleteMany({});
      console.log(`   ✅ Deleted ${deletedAttempts.count} contact attempts`);
      
      // Delete callbacks
      const deletedCallbacks = await tx.callback.deleteMany({});
      console.log(`   ✅ Deleted ${deletedCallbacks.count} callbacks`);
      
      // Delete file uploads
      const deletedUploads = await tx.fileUpload.deleteMany({});
      console.log(`   ✅ Deleted ${deletedUploads.count} file uploads`);
      
      // Delete daily metrics
      const deletedMetrics = await tx.dailyMetrics.deleteMany({});
      console.log(`   ✅ Deleted ${deletedMetrics.count} daily metrics`);

      // 3. Delete all leads
      console.log('\n🎯 Cleaning up leads...');
      const deletedLeads = await tx.lead.deleteMany({});
      console.log(`   ✅ Deleted ${deletedLeads.count} leads`);

      // 4. Clean up vendors (keep system vendors, remove test vendors)
      console.log('\n🏢 Cleaning up test vendors...');
      
      // Get list of vendors before cleanup
      const allVendors = await tx.vendor.findMany({
        select: { id: true, name: true, code: true }
      });
      
      // Delete test vendors (common test vendor codes/names)
      const testVendorPatterns = [
        'TEST',
        'DEMO', 
        'SAMPLE',
        'BASELINE',
        'EXAMPLE'
      ];
      
      let deletedVendors = 0;
      for (const vendor of allVendors) {
        const isTestVendor = testVendorPatterns.some(pattern => 
          vendor.code.toUpperCase().includes(pattern) || 
          vendor.name.toUpperCase().includes(pattern)
        );
        
        if (isTestVendor) {
          await tx.vendor.delete({ where: { id: vendor.id } });
          console.log(`   ✅ Deleted test vendor: ${vendor.name} (${vendor.code})`);
          deletedVendors++;
        }
      }
      
      if (deletedVendors === 0) {
        console.log('   ℹ️  No test vendors found to delete');
      }

      // 5. Clean up test users (keep admin users)
      console.log('\n👥 Cleaning up test users...');
      
      // Delete users with test email patterns or test vendor associations
      const testUsers = await tx.user.findMany({
        where: {
          OR: [
            { email: { contains: 'test' } },
            { email: { contains: 'demo' } },
            { email: { contains: 'sample' } },
            { email: { contains: 'example' } },
            { firstName: { contains: 'Test' } },
            { lastName: { contains: 'Test' } },
            // Keep admin users
            { AND: [
              { role: { not: 'ADMIN' } },
              { email: { not: { endsWith: '@healthcare.com' } } }
            ]}
          ]
        }
      });
      
      for (const user of testUsers) {
        // Skip if this is an important admin user
        if (user.role === 'ADMIN' || user.email.includes('admin')) {
          continue;
        }
        
        await tx.user.delete({ where: { id: user.id } });
        console.log(`   ✅ Deleted test user: ${user.firstName} ${user.lastName} (${user.email})`);
      }

      // 6. Clean up test teams
      console.log('\n🏆 Cleaning up test teams...');
      const testTeams = await tx.team.findMany({
        where: {
          OR: [
            { name: { contains: 'Test' } },
            { name: { contains: 'Demo' } },
            { name: { contains: 'Sample' } }
          ]
        }
      });
      
      for (const team of testTeams) {
        await tx.team.delete({ where: { id: team.id } });
        console.log(`   ✅ Deleted test team: ${team.name}`);
      }

      console.log('\n📊 Final database state:');
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
      
      Object.entries(finalCounts).forEach(([table, count]) => {
        console.log(`   ${table}: ${count} records`);
      });

    });

    console.log('\n✅ Test data cleanup completed successfully!');
    console.log('🎉 Your database is now clean and ready for production use.');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupTestData()
    .then(() => {
      console.log('\n🏁 Cleanup script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTestData }; 