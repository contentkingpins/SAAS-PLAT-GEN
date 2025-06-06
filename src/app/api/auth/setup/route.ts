import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
  }
} 