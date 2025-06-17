import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id: vendorId } = params;

    // Verify the user has access to this vendor (vendors can only see their own metrics, admins can see all)
    if (authResult.user?.role !== 'ADMIN' && authResult.user?.vendorId !== vendorId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get this vendor's sub-vendors with their leads
    const subVendors = await prisma.vendor.findMany({
      where: {
        parentVendorId: vendorId,
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
    });

    // Calculate metrics for each sub-vendor
    const subVendorMetrics = subVendors.map(subVendor => {
      const allLeads = subVendor.leads;
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
        vendorId: subVendor.id,
        vendorName: subVendor.name,
        vendorCode: subVendor.code,
        immunePercentage: Math.round(immunePercentage * 10) / 10,
        neuroPercentage: Math.round(neuroPercentage * 10) / 10,
        denialPercentage: Math.round(denialPercentage * 10) / 10,
        chaseRate: Math.round(chaseRate * 10) / 10,
        totalLeads,
        sentToConsult: sentToConsultLeads.length
      };
    });

    // Sort by total leads (highest first)
    subVendorMetrics.sort((a, b) => b.totalLeads - a.totalLeads);

    return NextResponse.json({
      success: true,
      parentVendorId: vendorId,
      subVendors: subVendorMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error calculating sub-vendor metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate sub-vendor metrics', details: error.message },
      { status: 500 }
    );
  }
} 