import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth/middleware';
import { z } from 'zod';
import { generateUniqueVendorCode, generateUniqueStaticCode } from '@/lib/utils/vendorCodeGenerator';

// Validation schema for creating downline vendors
const createDownlineSchema = z.object({
  name: z.string().min(2, 'Vendor name must be at least 2 characters'),
  code: z.string().min(3, 'Vendor code must be at least 3 characters').optional(), // Made optional for auto-generation
  staticCode: z.string().min(3, 'Static code must be at least 3 characters').optional(), // Made optional for auto-generation
  isActive: z.boolean(),
  parentVendorId: z.string().min(1, 'Parent vendor ID is required').optional(), // Will be set from URL params
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id: vendorId } = params;

    // Verify the user has access to this vendor
    if (authResult.user?.role !== 'ADMIN' && authResult.user?.vendorId !== vendorId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch downline vendors (sub-vendors where this vendor is the parent)
    const downlineVendors = await prisma.vendor.findMany({
      where: {
        parentVendorId: vendorId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        staticCode: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        leads: {
          select: {
            id: true,
            status: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(downlineVendors);

  } catch (error) {
    console.error('Error fetching downline vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch downline vendors' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id: vendorId } = params;

    // Verify the user has access to this vendor
    if (authResult.user?.role !== 'ADMIN' && authResult.user?.vendorId !== vendorId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = createDownlineSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify the parent vendor exists and the user has access to it
    const parentVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, name: true, isActive: true, parentVendorId: true }
    });

    if (!parentVendor) {
      return NextResponse.json({ error: 'Parent vendor not found' }, { status: 404 });
    }

    if (!parentVendor.isActive) {
      return NextResponse.json({ error: 'Parent vendor is inactive' }, { status: 403 });
    }

    // Check if this is a main vendor (only main vendors can create downlines)
    if (parentVendor.parentVendorId) {
      return NextResponse.json(
        { error: 'Only main vendors can create downline vendors. Sub-vendors cannot create their own downlines.' },
        { status: 403 }
      );
    }

    // Auto-generate codes if not provided (sub-vendor = true)
    const vendorCode = data.code || await generateUniqueVendorCode(data.name, true, prisma);
    const staticCode = data.staticCode || await generateUniqueStaticCode(data.name, true, prisma);

    console.log(`🎯 Generated sub-vendor codes for "${data.name}": code=${vendorCode}, staticCode=${staticCode}`);

    // Check if manually provided codes already exist
    if (data.code || data.staticCode) {
      const existingVendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            ...(data.code ? [{ code: data.code }] : []),
            ...(data.staticCode ? [{ staticCode: data.staticCode }] : []),
          ]
        },
        select: { id: true, code: true, staticCode: true }
      });

      if (existingVendor) {
        if (existingVendor.code === data.code) {
          return NextResponse.json(
            { error: 'Vendor code already exists' },
            { status: 409 }
          );
        }
        if (existingVendor.staticCode === data.staticCode) {
          return NextResponse.json(
            { error: 'Static code already exists' },
            { status: 409 }
          );
        }
      }
    }

    // Create the downline vendor
    const newVendor = await prisma.vendor.create({
      data: {
        name: data.name,
        code: vendorCode,
        staticCode: staticCode,
        isActive: data.isActive,
        parentVendorId: vendorId, // Set the parent
      },
      include: {
        parentVendor: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        leads: {
          select: {
            id: true,
            status: true,
          }
        }
      }
    });

    // Log the creation
    console.log(`Downline vendor created: ${newVendor.id} (${newVendor.code}) under parent ${vendorId}`);

    return NextResponse.json({
      ...newVendor,
      autoGenerated: {
        code: !data.code,
        staticCode: !data.staticCode
      }
    });

  } catch (error) {
    console.error('Error creating downline vendor:', error);

    // Handle Prisma unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A vendor with this code or static code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create downline vendor' },
      { status: 500 }
    );
  }
}
