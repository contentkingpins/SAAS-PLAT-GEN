import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple auth check for now - will improve later
async function verifyAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }
  return { authenticated: true };
}

// GET /api/admin/teams - Fetch all teams
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const teams = await prisma.team.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
} 