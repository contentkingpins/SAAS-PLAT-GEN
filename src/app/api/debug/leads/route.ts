import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    console.log('🔍 Fetching all leads for debugging...');

    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mbi: true,
        phone: true,
        status: true,
        vendorCode: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to recent 50 leads
    });

    console.log(`📊 Found ${leads.length} leads in system`);
    
    const summary = {
      totalLeads: leads.length,
      leadSample: leads.slice(0, 10).map(lead => ({
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        mbi: lead.mbi,
        phone: lead.phone,
        status: lead.status,
        vendor: lead.vendorCode,
        created: lead.createdAt
      })),
      phoneFormats: leads.slice(0, 10).map(lead => ({
        name: `${lead.firstName} ${lead.lastName}`,
        phone: lead.phone,
        phoneLength: lead.phone?.length || 0
      }))
    };

    return NextResponse.json({
      success: true,
      message: `Found ${leads.length} leads in system`,
      data: summary
    });

  } catch (error: any) {
    console.error('❌ Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads', details: error.message },
      { status: 500 }
    );
  }
} 