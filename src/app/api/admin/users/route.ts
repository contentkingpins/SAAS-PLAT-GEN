import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

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
const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'VENDOR', 'ADVOCATE', 'COLLECTIONS']),
  vendorId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// GET /api/admin/users - Fetch all users
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const teamId = searchParams.get('teamId');
    const vendorId = searchParams.get('vendorId');

    const whereClause: any = {};
    
    if (role) {
      whereClause.role = role;
    }
    
    if (teamId) {
      whereClause.teamId = teamId;
    }
    
    if (vendorId) {
      whereClause.vendorId = vendorId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
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
        leadsAsAdvocate: {
          select: {
            id: true,
            status: true,
          },
        },
        leadsAsCollections: {
          select: {
            id: true,
            status: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Remove password from response
    const sanitizedUsers = users.map(({ password, ...user }) => user);

    return NextResponse.json(sanitizedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const validatedData = userCreateSchema.parse(body);

    // Check for existing user with same email
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const { password, ...userData } = validatedData;
    
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
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
    const { password: _, ...sanitizedUser } = user;

    return NextResponse.json(sanitizedUser, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 