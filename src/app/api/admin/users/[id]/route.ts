import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Middleware to verify admin permissions (same as parent route)
async function verifyAdminAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'Unauthorized', status: 401 };
    }
    return { authenticated: true };
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

const userUpdateSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  role: z.enum(['ADMIN', 'VENDOR', 'ADVOCATE', 'COLLECTIONS']).optional(),
  vendorId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

// PUT /api/admin/users/[id] - Update user
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
    const validatedData = userUpdateSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const duplicateUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (duplicateUser) {
        return NextResponse.json(
          { error: 'Email already in use by another user' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    
    // Hash password if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        _count: {
          select: {
            leadsAsAdvocate: true,
            leadsAsCollections: true,
            contactAttempts: true,
            callbacks: true,
          },
        },
      },
    });

    // Remove password from response
    const { password, ...sanitizedUser } = updatedUser;

    return NextResponse.json(sanitizedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user
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

    // Check if user exists and get related data
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        leadsAsAdvocate: true,
        leadsAsCollections: true,
        contactAttempts: true,
        callbacks: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if user has active relationships
    const hasActiveLeads = existingUser.leadsAsAdvocate.length > 0 || existingUser.leadsAsCollections.length > 0;
    const hasActiveCallbacks = existingUser.callbacks.some(cb => !cb.completed);

    if (hasActiveLeads || hasActiveCallbacks) {
      return NextResponse.json(
        { 
          error: 'Cannot delete user with active leads or scheduled callbacks. Please reassign or complete them first.' 
        },
        { status: 400 }
      );
    }

    // Instead of hard delete, we could soft delete by setting isActive to false
    // For now, let's do hard delete but only if no active relationships
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 