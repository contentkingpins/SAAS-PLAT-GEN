import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;

    if (!code) {
      return NextResponse.json({ error: 'Vendor code is required' }, { status: 400 });
    }

    // Find vendor by code
    const vendor = await prisma.vendor.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        staticCode: true,
        isActive: true,
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (!vendor.isActive) {
      return NextResponse.json({ error: 'Vendor is inactive' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: vendor
    });

  } catch (error) {
    console.error('Error fetching vendor by code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor information' },
      { status: 500 }
    );
  }
} 
