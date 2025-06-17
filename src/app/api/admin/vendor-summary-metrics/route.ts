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

    // Get all vendors with their leads in a single optimized query
    const vendors = await prisma.vendor.findMany({
      where: {
        isActive: true // Only active vendors
      },
      include: {
        leads: {
          select: {
            id: true,
            testType: true,
            status: true,
            doctorApprovalStatus: true,
            contactAttempts: true,
            createdAt: true
          }
        },
        // Include sub-vendors and their leads
        subVendors: {
          where: {
            isActive: true
          },
          include: {
            leads: {
              select: {
                id: true,
                testType: true,
                status: true,
                doctorApprovalStatus: true,
                contactAttempts: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    // Calculate metrics for each vendor
    const vendorMetrics = vendors.map(vendor => {
      // Combine vendor's direct leads with sub-vendor leads
      const allLeads = [
        ...vendor.leads,
        ...vendor.subVendors.flatMap(subVendor => subVendor.leads)
      ];

      const totalLeads = allLeads.length;

      // Test type percentages
      const immuneLeads = allLeads.filter(lead => lead.testType === 'IMMUNE').length;
      const neuroLeads = allLeads.filter(lead => lead.testType === 'NEURO').length;
      
      const immunePercentage = totalLeads > 0 ? (immuneLeads / totalLeads) * 100 : 0;
      const neuroPercentage = totalLeads > 0 ? (neuroLeads / totalLeads) * 100 : 0;

      // Denial percentage (leads that reached consultation but were denied by doctor)
      const sentToConsultLeads = allLeads.filter(lead => 
        ['SENT_TO_CONSULT', 'APPROVED', 'READY_TO_SHIP', 'SHIPPED', 'KIT_COMPLETED', 'RETURNED', 'DOESNT_QUALIFY'].includes(lead.status)
      );
      const deniedLeads = allLeads.filter(lead => 
        lead.doctorApprovalStatus === 'DECLINED'
      );
      
      const denialPercentage = sentToConsultLeads.length > 0 ? (deniedLeads.length / sentToConsultLeads.length) * 100 : 0;

      // Chase rate (leads requiring multiple contact attempts or in collections)
      const collectionsLeads = allLeads.filter(lead => lead.status === 'COLLECTIONS');
      const highContactAttemptLeads = allLeads.filter(lead => lead.contactAttempts > 2);
      const leadsRequiringChase = new Set([
        ...collectionsLeads.map(l => l.id),
        ...highContactAttemptLeads.map(l => l.id)
      ]).size;
      
      const chaseRate = totalLeads > 0 ? (leadsRequiringChase / totalLeads) * 100 : 0;

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorCode: vendor.code,
        immunePercentage: Math.round(immunePercentage * 10) / 10, // Round to 1 decimal
        neuroPercentage: Math.round(neuroPercentage * 10) / 10,
        denialPercentage: Math.round(denialPercentage * 10) / 10,
        chaseRate: Math.round(chaseRate * 10) / 10,
        totalLeads,
        sentToConsult: sentToConsultLeads.length,
        subVendorCount: vendor.subVendors.length
      };
    });

    // Sort by total leads (highest first)
    vendorMetrics.sort((a, b) => b.totalLeads - a.totalLeads);

    return NextResponse.json({
      success: true,
      vendors: vendorMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error calculating vendor summary metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate vendor metrics', details: error.message },
      { status: 500 }
    );
  }
} 