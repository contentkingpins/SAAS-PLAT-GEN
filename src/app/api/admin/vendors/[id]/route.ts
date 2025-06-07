import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Simple auth check for now - will improve later
async function verifyAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }
  return { authenticated: true };
}

const vendorUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(3).optional(),
  staticCode: z.string().min(3).optional(),
  parentVendorId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/admin/vendors/[id] - Update vendor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = vendorUpdateSchema.parse(body);

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Check for unique codes if they're being updated
    if (validatedData.code || validatedData.staticCode) {
      const duplicateVendor = await prisma.vendor.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                validatedData.code ? { code: validatedData.code } : {},
                validatedData.staticCode ? { staticCode: validatedData.staticCode } : {},
              ].filter(condition => Object.keys(condition).length > 0),
            },
          ],
        },
      });

      if (duplicateVendor) {
        return NextResponse.json(
          { error: 'Vendor code or static code already exists' },
          { status: 400 }
        );
      }
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
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

    return NextResponse.json({ success: true, data: updatedVendor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/vendors/[id] - Delete vendor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = params;

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        leads: true,
        users: true,
        subVendors: true,
      },
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if vendor has leads or users
    if (existingVendor.leads.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with existing leads' },
        { status: 400 }
      );
    }

    if (existingVendor.users.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with existing users' },
        { status: 400 }
      );
    }

    if (existingVendor.subVendors.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with sub-vendors' },
        { status: 400 }
      );
    }

    await prisma.vendor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
} 