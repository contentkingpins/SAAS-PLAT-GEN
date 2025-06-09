import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth/middleware';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { vendorId } = params;

    // Verify the user has access to this vendor (vendors can only see their own leads, admins can see all)
    if (authResult.user?.role !== 'ADMIN' && authResult.user?.vendorId !== vendorId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch leads for this vendor and all their sub-vendors
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { vendorId: vendorId }, // Direct vendor leads
          { 
            vendor: {
              parentVendorId: vendorId // Sub-vendor leads
            }
          }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mbi: true,
        status: true,
        testType: true,
        createdAt: true,
        vendor: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit to 100 most recent leads
    });

    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('Error fetching vendor leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
} 