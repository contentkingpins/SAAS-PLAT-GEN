import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth/middleware';

const prisma = new PrismaClient();

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

    // Calculate metrics for this vendor and all their sub-vendors
    const totalLeads = await prisma.lead.count({
      where: {
        OR: [
          { vendorId: vendorId }, // Direct vendor leads
          { 
            vendor: {
              parentVendorId: vendorId // Sub-vendor leads
            }
          }
        ]
      }
    });

    const qualifiedLeads = await prisma.lead.count({
      where: {
        AND: [
          {
            OR: [
              { vendorId: vendorId }, // Direct vendor leads
              { 
                vendor: {
                  parentVendorId: vendorId // Sub-vendor leads
                }
              }
            ]
          },
          {
            status: 'QUALIFIED'
          }
        ]
      }
    });

    // Count accepted denials - leads that went through advocate review and became qualified
    // This represents leads that were initially flagged but then accepted after review
    const acceptedDenials = await prisma.lead.count({
      where: {
        AND: [
          {
            OR: [
              { vendorId: vendorId }, // Direct vendor leads
              { 
                vendor: {
                  parentVendorId: vendorId // Sub-vendor leads
                }
              }
            ]
          },
          {
            // Leads that went through advocate review and were qualified despite initial concerns
            status: 'QUALIFIED',
            advocateReviewedAt: {
              not: null // Had an advocate review
            },
            advocateDisposition: {
              not: null // Had a disposition set
            }
          }
        ]
      }
    });

    // Calculate conversion rate (qualified leads / total leads)
    const conversionRate = totalLeads > 0 ? qualifiedLeads / totalLeads : 0;

    const metrics = {
      totalLeads,
      qualifiedLeads,
      acceptedDenials,
      conversionRate
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Error calculating vendor metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate metrics' },
      { status: 500 }
    );
  }
} 