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

    // Create advocate user
    const advocateUser = await prisma.user.create({
      data: {
        email: 'advocate@healthcare.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Advocate',
        role: 'ADVOCATE',
        teamId: advocateTeam.id,
        isActive: true,
      },
    });

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
        firstName: 'Test',
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
        }
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