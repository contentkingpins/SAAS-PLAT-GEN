import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Auth } from 'aws-amplify';
import { z } from 'zod';

const prisma = new PrismaClient();

// Middleware to verify admin permissions
async function verifyAdminAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'Unauthorized', status: 401 };
    }

    const token = authHeader.substring(7);
    // Verify token with AWS Cognito and check for admin role
    // Implementation depends on your auth setup
    
    return { authenticated: true };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

// Validation schemas
const vendorCreateSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(3),
  staticCode: z.string().min(3),
  parentVendorId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
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

    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
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

    // Check for unique codes
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { code: validatedData.code },
          { staticCode: validatedData.staticCode },
        ],
      },
    });

    if (existingVendor) {
      return NextResponse.json(
        { error: 'Vendor code or static code already exists' },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.create({
      data: validatedData,
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

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
} 