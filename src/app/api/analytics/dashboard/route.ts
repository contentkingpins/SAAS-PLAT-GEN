import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '../../../../lib/auth/middleware';

const prisma = new PrismaClient();

// GET /api/analytics/dashboard - Get dashboard metrics
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'week';
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch metrics from database
    const totalLeads = await prisma.lead.count();
    const leadsToday = await prisma.lead.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });
    const leadsThisWeek = await prisma.lead.count({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });
    const leadsThisMonth = await prisma.lead.count({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Conversion rates calculation
    const submittedLeads = await prisma.lead.count();
    const qualifiedLeads = await prisma.lead.count({
      where: {
        status: { in: ['QUALIFIED', 'SENT_TO_CONSULT', 'APPROVED', 'READY_TO_SHIP', 'SHIPPED', 'KIT_COMPLETED', 'RETURNED'] }
      }
    });
    const approvedLeads = await prisma.lead.count({
      where: {
        status: { in: ['APPROVED', 'READY_TO_SHIP', 'SHIPPED', 'KIT_COMPLETED', 'RETURNED'] }
      }
    });
    const shippedLeads = await prisma.lead.count({
      where: {
        status: { in: ['SHIPPED', 'KIT_COMPLETED', 'RETURNED'] }
      }
    });
    const completedLeads = await prisma.lead.count({
      where: {
        status: { in: ['KIT_COMPLETED', 'RETURNED'] }
      }
    });

    // Test type breakdown
    const immuneLeads = await prisma.lead.count({
      where: { testType: 'IMMUNE' }
    });
    const neuroLeads = await prisma.lead.count({
      where: { testType: 'NEURO' }
    });
    const immuneCompleted = await prisma.lead.count({
      where: { 
        testType: 'IMMUNE',
        status: { in: ['KIT_COMPLETED', 'RETURNED'] }
      }
    });
    const neuroCompleted = await prisma.lead.count({
      where: { 
        testType: 'NEURO',
        status: { in: ['KIT_COMPLETED', 'RETURNED'] }
      }
    });

    // Vendor performance
    const vendorPerformance = await prisma.vendor.findMany({
      include: {
        leads: {
          select: {
            status: true
          }
        }
      }
    });

    const vendorStats = vendorPerformance.map(vendor => ({
      vendorId: vendor.id,
      vendorName: vendor.name,
      totalLeads: vendor.leads.length,
      qualifiedLeads: vendor.leads.filter(lead => 
        ['QUALIFIED', 'SENT_TO_CONSULT', 'APPROVED', 'READY_TO_SHIP', 'SHIPPED', 'KIT_COMPLETED', 'RETURNED'].includes(lead.status)
      ).length,
      completedKits: vendor.leads.filter(lead => 
        ['KIT_COMPLETED', 'RETURNED'].includes(lead.status)
      ).length,
      conversionRate: vendor.leads.length > 0 ? 
        vendor.leads.filter(lead => ['KIT_COMPLETED', 'RETURNED'].includes(lead.status)).length / vendor.leads.length : 0
    }));

    const dashboardMetrics = {
      totalLeads,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
      conversionRates: {
        submittedToQualified: submittedLeads > 0 ? qualifiedLeads / submittedLeads : 0,
        qualifiedToApproved: qualifiedLeads > 0 ? approvedLeads / qualifiedLeads : 0,
        approvedToShipped: approvedLeads > 0 ? shippedLeads / approvedLeads : 0,
        shippedToCompleted: shippedLeads > 0 ? completedLeads / shippedLeads : 0,
        overallConversion: submittedLeads > 0 ? completedLeads / submittedLeads : 0,
      },
      byTestType: {
        immune: {
          total: immuneLeads,
          completed: immuneCompleted,
          conversionRate: immuneLeads > 0 ? immuneCompleted / immuneLeads : 0,
        },
        neuro: {
          total: neuroLeads,
          completed: neuroCompleted,
          conversionRate: neuroLeads > 0 ? neuroCompleted / neuroLeads : 0,
        },
      },
      vendorPerformance: vendorStats.sort((a, b) => b.totalLeads - a.totalLeads),
      agentPerformance: {
        advocates: [],
        collections: [],
      },
    };

    return NextResponse.json(dashboardMetrics);
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
} 