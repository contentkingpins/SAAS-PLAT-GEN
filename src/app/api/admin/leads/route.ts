import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch leads with vendor information
    const leads = await prisma.lead.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
            staticCode: true,
          }
        },
        advocate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        collectionsAgent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await prisma.lead.count({ where });

    // Format the response
    const formattedLeads = leads.map(lead => ({
      id: lead.id,
      mbi: lead.mbi,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      status: lead.status,
      testType: lead.testType,
      vendorId: lead.vendorId,
      vendor: lead.vendor,
      advocate: lead.advocate,
      collectionsAgent: lead.collectionsAgent,
      advocateDisposition: lead.advocateDisposition,
      collectionsDisposition: lead.collectionsDisposition,
      contactAttempts: lead.contactAttempts,
      lastContactAttempt: lead.lastContactAttempt,
      nextCallbackDate: lead.nextCallbackDate,
      kitShippedDate: lead.kitShippedDate,
      trackingNumber: lead.trackingNumber,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedLeads,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + leads.length < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching admin leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();

    // Create new lead (for admin purposes)
    const lead = await prisma.lead.create({
      data: {
        mbi: body.mbi,
        firstName: body.firstName,
        lastName: body.lastName,
        dateOfBirth: body.dateOfBirth,
        phone: body.phone,
        street: body.address?.street || body.street || '',
        city: body.address?.city || body.city || '',
        state: body.address?.state || body.state || '',
        zipCode: body.address?.zipCode || body.zipCode || '',
        vendorId: body.vendorId,
        subVendorId: body.subVendorId,
        vendorCode: body.vendorCode,
        status: body.status || 'SUBMITTED',
        testType: body.testType,
        contactAttempts: 0,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
            staticCode: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: lead
    });

  } catch (error) {
    console.error('Error creating admin lead:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}
