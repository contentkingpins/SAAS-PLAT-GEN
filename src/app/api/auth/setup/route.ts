import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

 main
// POST /api/auth/setup - Create test accounts for development
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setup endpoint called - checking database connection...');

    // Test database connection first
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');

    // Create test vendor if doesn't exist
    let testVendor;
    try {
      testVendor = await prisma.vendor.upsert({
        where: { code: 'TEST_CORP' },
        update: {},
        create: {
          name: 'Test Corporation',
          code: 'TEST_CORP',
          staticCode: 'TST001',
          isActive: true
        }
      });
      console.log('✅ Test vendor created/found:', testVendor.id);
    } catch (vendorError) {
      console.error('❌ Error creating vendor:', vendorError);
      throw vendorError;
    }

    // Create test team if doesn't exist
    let testTeam;
    try {
      testTeam = await prisma.team.findFirst({
        where: { name: 'Test Advocates Team' }
      });
      
      if (!testTeam) {
        testTeam = await prisma.team.create({
          data: {
            name: 'Test Advocates Team',
            type: 'advocates',
            description: 'Test team for development',
            isActive: true
          }
        });
      }
      console.log('✅ Test team created/found:', testTeam.id);
    } catch (teamError) {
      console.error('❌ Error creating team:', teamError);
      throw teamError;
    }

    // Test accounts to create
    const testAccounts = [
      {
        email: 'admin@healthcare.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN' as const,
        vendorId: null,
        teamId: null
      },
      {
        email: 'vendor@testcorp.com',
        password: 'vendor123',
        firstName: 'Vendor',
        lastName: 'Manager',
        role: 'VENDOR' as const,
        vendorId: testVendor.id,
        teamId: null
      },
      {
        email: 'advocate@healthcare.com',
        password: 'advocate123',
        firstName: 'Advocate',
        lastName: 'Agent',
        role: 'ADVOCATE' as const,
        vendorId: null,
        teamId: testTeam.id
      },
      {
        email: 'collections@healthcare.com',
        password: 'collections123',
        firstName: 'Collections',
        lastName: 'Agent',
        role: 'COLLECTIONS' as const,
        vendorId: null,
        teamId: null
      }
    ];

    const createdUsers = [];

    for (const account of testAccounts) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: account.email }
        });

        if (existingUser) {
          console.log(`⚠️ User ${account.email} already exists, skipping...`);
          createdUsers.push({
            email: account.email,
            status: 'already_exists',
            role: existingUser.role
          });
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(account.password, 12);

        // Create user
        const newUser = await prisma.user.create({
          data: {
            email: account.email,
            password: hashedPassword,
            firstName: account.firstName,
            lastName: account.lastName,
            role: account.role,
            vendorId: account.vendorId,
            teamId: account.teamId,
            isActive: true
          }
        });

        console.log(`✅ Created user: ${account.email} with role ${account.role}`);
        
        createdUsers.push({
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          status: 'created',
          firstName: newUser.firstName,
          lastName: newUser.lastName
        });

      } catch (userError) {
        console.error(`❌ Error creating user ${account.email}:`, userError);
        createdUsers.push({
          email: account.email,
          status: 'error',
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
      }
    }

    // Test a simple query to verify everything is working
    const userCount = await prisma.user.count();
    const vendorCount = await prisma.vendor.count();
    const teamCount = await prisma.team.count();

    console.log('📊 Database status:', { users: userCount, vendors: vendorCount, teams: teamCount });

    return NextResponse.json({
      success: true,
      message: 'Database setup completed successfully',
      database: {
        connected: true,
        users: userCount,
        vendors: vendorCount,
        teams: teamCount
      },
      testAccounts: createdUsers,
      instructions: {
        login: 'Use any of the test accounts to login',
        credentials: testAccounts.map(acc => ({
          email: acc.email,
          password: acc.password,
          role: acc.role
        }))
      }
    });

  } catch (error) {
    console.error('💥 Setup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      details: {
        message: 'Database connection or setup failed',
        timestamp: new Date().toISOString(),
        suggestion: 'Check DATABASE_URL environment variable and RDS connection'
      }
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/auth/setup - Check setup status
export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    const userCount = await prisma.user.count();
    const vendorCount = await prisma.vendor.count();
    const teamCount = await prisma.team.count();

    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        users: userCount,
        vendors: vendorCount,
        teams: teamCount
      },
      setup: userCount > 0 ? 'complete' : 'needed'
    });

  } catch (error) {
    console.error('Database connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      },
      setup: 'failed'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();

// POST /api/auth/setup - Create initial users for testing
export async function POST(request: NextRequest) {
  try {
    // Check if any users already exist
    const existingUsers = await prisma.user.count();
    
    if (existingUsers > 0) {
      return NextResponse.json(
        { error: 'Users already exist. Setup can only be run once.' },
        { status: 400 }
      );
    }

    // Create initial users
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@healthcare.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Create a test vendor first
    const testVendor = await prisma.vendor.create({
      data: {
        name: 'Test Vendor Corp',
        code: 'TEST001',
        staticCode: 'TST001',
        isActive: true,
      },
    });

    // Create vendor user
    const vendorUser = await prisma.user.create({
      data: {
        email: 'vendor@healthcare.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Vendor',
        role: 'VENDOR',
        vendorId: testVendor.id,
        isActive: true,
      },
    });

    // Create advocate team
    const advocateTeam = await prisma.team.create({
      data: {
        name: 'Advocate Team 1',
        type: 'advocates',
        description: 'Primary advocate team for lead qualification',
        isActive: true,
      },
    });

    // Create primary advocate user
    const advocateUser = await prisma.user.create({
      data: {
        email: 'advocate@healthcare.com',
        password: hashedPassword,
        firstName: 'Lead',
        lastName: 'Advocate',
        role: 'ADVOCATE',
        teamId: advocateTeam.id,
        isActive: true,
      },
    });

    // Create 10 additional patient advocate logins
    const advocateNames = [
      { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@healthcare.com' },
      { firstName: 'Michael', lastName: 'Davis', email: 'michael.davis@healthcare.com' },
      { firstName: 'Emily', lastName: 'Rodriguez', email: 'emily.rodriguez@healthcare.com' },
      { firstName: 'David', lastName: 'Wilson', email: 'david.wilson@healthcare.com' },
      { firstName: 'Jessica', lastName: 'Brown', email: 'jessica.brown@healthcare.com' },
      { firstName: 'Robert', lastName: 'Miller', email: 'robert.miller@healthcare.com' },
      { firstName: 'Ashley', lastName: 'Garcia', email: 'ashley.garcia@healthcare.com' },
      { firstName: 'Christopher', lastName: 'Martinez', email: 'christopher.martinez@healthcare.com' },
      { firstName: 'Amanda', lastName: 'Taylor', email: 'amanda.taylor@healthcare.com' },
      { firstName: 'Joshua', lastName: 'Anderson', email: 'joshua.anderson@healthcare.com' },
    ];

    const createdAdvocates = [];
    for (const advocate of advocateNames) {
      const newAdvocate = await prisma.user.create({
        data: {
          email: advocate.email,
          password: hashedPassword,
          firstName: advocate.firstName,
          lastName: advocate.lastName,
          role: 'ADVOCATE',
          teamId: advocateTeam.id,
          isActive: true,
        },
      });
      createdAdvocates.push(newAdvocate);
    }

    // Create collections team
    const collectionsTeam = await prisma.team.create({
      data: {
        name: 'Collections Team 1',
        type: 'collections',
        description: 'Primary collections team for kit follow-up',
        isActive: true,
      },
    });

    // Create collections user
    const collectionsUser = await prisma.user.create({
      data: {
        email: 'collections@healthcare.com',
        password: hashedPassword,
        firstName: 'Lead',
        lastName: 'Collections',
        role: 'COLLECTIONS',
        teamId: collectionsTeam.id,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Initial users created successfully',
      users: [
        {
          email: 'admin@healthcare.com',
          role: 'ADMIN',
          password: 'admin123'
        },
        {
          email: 'vendor@healthcare.com',
          role: 'VENDOR',
          password: 'admin123'
        },
        {
          email: 'advocate@healthcare.com',
          role: 'ADVOCATE',
          password: 'admin123'
        },
        {
          email: 'collections@healthcare.com',
          role: 'COLLECTIONS',
          password: 'admin123'
        },
        ...advocateNames.map(advocate => ({
          email: advocate.email,
          role: 'ADVOCATE',
          password: 'admin123'
        }))
      ]
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to create initial users', details: error },
      { status: 500 }
    );
 main
  }
} 