import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setup endpoint called - checking database connection...');

    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');

    let testVendor = await prisma.vendor.upsert({
      where: { code: 'TEST_CORP' },
      update: {},
      create: {
        name: 'Test Corporation',
        code: 'TEST_CORP',
        staticCode: 'TST001',
        isActive: true
      }
    });

    let testTeam = await prisma.team.findFirst({
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
      const existingUser = await prisma.user.findUnique({
        where: { email: account.email }
      });

      if (existingUser) {
        createdUsers.push({
          email: account.email,
          status: 'already_exists',
          role: existingUser.role
        });
        continue;
      }

      const hashedPassword = await bcrypt.hash(account.password, 12);

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

      createdUsers.push({
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        status: 'created',
        firstName: newUser.firstName,
        lastName: newUser.lastName
      });
    }

    const userCount = await prisma.user.count();
    const vendorCount = await prisma.vendor.count();
    const teamCount = await prisma.team.count();

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
      credentials: testAccounts.map(acc => ({
        email: acc.email,
        password: acc.password,
        role: acc.role
      }))
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

export async function GET(request: NextRequest) {
  try {
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
  }
} 