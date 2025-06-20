import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';
import { generateUniqueVendorCode, generateUniqueStaticCode } from '@/lib/utils/vendorCodeGenerator';
import bcrypt from 'bcryptjs';

// Validation schemas
const vendorCreateSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(3).optional(), // Made optional for auto-generation
  staticCode: z.string().min(3).optional(), // Made optional for auto-generation
  parentVendorId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  // New fields for automatic user creation
  contactEmail: z.string().email('Invalid email address').optional(),
  contactFirstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  contactLastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  createUserAccount: z.boolean().default(true), // Default to creating user account
});

const vendorUpdateSchema = vendorCreateSchema.partial();

// GET /api/admin/vendors - Fetch all vendors
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        parentVendor: true,
        subVendors: true,
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        leads: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// POST /api/admin/vendors - Create new vendor
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const validatedData = vendorCreateSchema.parse(body);

    // Determine if this is a sub-vendor
    const isSubVendor = !!validatedData.parentVendorId;

    // Auto-generate codes if not provided
    const vendorCode = validatedData.code || await generateUniqueVendorCode(validatedData.name, isSubVendor, prisma);
    const staticCode = validatedData.staticCode || await generateUniqueStaticCode(validatedData.name, isSubVendor, prisma);

    console.log(`🎯 Generated codes for "${validatedData.name}": code=${vendorCode}, staticCode=${staticCode}`);

    // Check for unique codes if they were manually provided
    if (validatedData.code || validatedData.staticCode) {
      const existingVendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            ...(validatedData.code ? [{ code: validatedData.code }] : []),
            ...(validatedData.staticCode ? [{ staticCode: validatedData.staticCode }] : []),
          ],
        },
      });

      if (existingVendor) {
        return NextResponse.json(
          { success: false, error: 'Vendor code or static code already exists' },
          { status: 400 }
        );
      }
    }

    // Generate default contact info if not provided
    const contactEmail = validatedData.contactEmail || `${vendorCode.toLowerCase()}@vendor.com`;
    const contactFirstName = validatedData.contactFirstName || validatedData.name.split(' ')[0] || 'Vendor';
    const contactLastName = validatedData.contactLastName || validatedData.name.split(' ').slice(1).join(' ') || 'User';

    // Check if user with this email already exists
    if (validatedData.createUserAccount) {
      const existingUser = await prisma.user.findUnique({
        where: { email: contactEmail },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: `User with email ${contactEmail} already exists. Please use a different email or uncheck "Create User Account".` },
          { status: 400 }
        );
      }
    }

    // Use transaction to create vendor and user together
    const result = await prisma.$transaction(async (tx) => {
      // Create vendor first
      const vendor = await tx.vendor.create({
        data: {
          name: validatedData.name,
          code: vendorCode,
          staticCode: staticCode,
          parentVendorId: validatedData.parentVendorId || null,
          isActive: validatedData.isActive,
        },
      });

      let user = null;
      let defaultPassword = null;

      // Create user account if requested
      if (validatedData.createUserAccount) {
        // Generate a secure default password
        defaultPassword = `${vendorCode}2024!`;
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        user = await tx.user.create({
          data: {
            email: contactEmail,
            password: hashedPassword,
            firstName: contactFirstName,
            lastName: contactLastName,
            role: 'VENDOR',
            vendorId: vendor.id,
            isActive: true,
          },
        });
      }

      // Fetch the complete vendor with relations
      const completeVendor = await tx.vendor.findUnique({
        where: { id: vendor.id },
        include: {
          parentVendor: true,
          subVendors: true,
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          leads: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      return { vendor: completeVendor, user, defaultPassword };
    });

    const response: any = {
      success: true,
      data: result.vendor,
      autoGenerated: {
        code: !validatedData.code,
        staticCode: !validatedData.staticCode,
      },
    };

    // Include user creation info if user was created
    if (result.user && result.defaultPassword) {
      response.userAccount = {
        created: true,
        email: result.user.email,
        defaultPassword: result.defaultPassword,
        message: `Vendor login created! Email: ${result.user.email}, Password: ${result.defaultPassword}`,
      };
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}
