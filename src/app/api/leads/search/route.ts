import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { verifyAuth } from '@/lib/auth/middleware';

// GET /api/leads/search - Search leads for agents/advocates
export async function GET(request: NextRequest) {
  try {
    // Verify authentication first
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Only allow ADMIN, ADVOCATE, and COLLECTIONS agents to search leads
    const allowedRoles = ['ADMIN', 'ADVOCATE', 'COLLECTIONS'];
    if (!allowedRoles.includes(authResult.user?.role || '')) {
      return NextResponse.json({ error: 'Access denied. Search requires advocate, collections, or admin role.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Search query must be at least 2 characters'
      }, { status: 400 });
    }

    // Build comprehensive search conditions
    const searchConditions: Prisma.LeadWhereInput[] = [];

    // Search by full name (first + last)
    const nameParts = query.split(' ').filter(part => part.length > 0);
    if (nameParts.length >= 2) {
      searchConditions.push({
        AND: [
          { firstName: { contains: nameParts[0], mode: Prisma.QueryMode.insensitive } },
          { lastName: { contains: nameParts[1], mode: Prisma.QueryMode.insensitive } }
        ]
      });
    }

    // Search by first name or last name individually
    searchConditions.push(
      { firstName: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { lastName: { contains: query, mode: Prisma.QueryMode.insensitive } }
    );

    // Search by phone number (remove all non-digits)
    const phoneQuery = query.replace(/\D/g, '');
    if (phoneQuery.length >= 3) {
      searchConditions.push({ phone: { contains: phoneQuery } });
    }

    // Search by MBI (exact match, case insensitive)
    const mbiQuery = query.replace(/-/g, '').toUpperCase();
    if (mbiQuery.length >= 3) {
      searchConditions.push({ mbi: { contains: mbiQuery, mode: Prisma.QueryMode.insensitive } });
    }

    // Search by city or state
    searchConditions.push(
      { city: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { state: { contains: query, mode: Prisma.QueryMode.insensitive } }
    );

    // Execute search
    const leads = await prisma.lead.findMany({
      where: {
        OR: searchConditions
      },
      take: limit,
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        vendor: {
          select: { name: true, code: true }
        },
        advocate: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        collectionsAgent: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        alerts: {
          where: { isAcknowledged: false },
          select: {
            id: true,
            type: true,
            severity: true,
            message: true,
            createdAt: true
          }
        }
      }
    });

    // Format results for display
    const formattedResults = leads.map(lead => ({
      id: lead.id,
      mbi: lead.mbi,
      fullName: `${lead.firstName} ${lead.lastName}`,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      formattedPhone: lead.phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'),
      dateOfBirth: lead.dateOfBirth,
      age: lead.dateOfBirth ? Math.floor((Date.now() - new Date(lead.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      address: {
        street: lead.street,
        city: lead.city,
        state: lead.state,
        zipCode: lead.zipCode,
        full: `${lead.street}, ${lead.city}, ${lead.state} ${lead.zipCode}`.trim()
      },
      vendor: lead.vendor,
      testType: lead.testType,
      status: lead.status,
      statusLabel: getStatusLabel(lead.status),
      advocate: lead.advocate,
      collectionsAgent: lead.collectionsAgent,
      isDuplicate: lead.isDuplicate,
      hasActiveAlerts: lead.hasActiveAlerts,
      activeAlerts: lead.alerts,
      lastContactAttempt: lead.lastContactAttempt,
      nextCallbackDate: lead.nextCallbackDate,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      // Quick access info for agents
      quickInfo: {
        lastActivity: lead.updatedAt,
        daysSinceSubmission: Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
        currentAssignment: lead.advocate ? `Advocate: ${lead.advocate.firstName} ${lead.advocate.lastName}` :
                          lead.collectionsAgent ? `Collections: ${lead.collectionsAgent.firstName} ${lead.collectionsAgent.lastName}` :
                          'Unassigned'
      }
    }));

    return NextResponse.json({
      success: true,
      data: formattedResults,
      meta: {
        query: query,
        resultsCount: formattedResults.length,
        searchType: 'comprehensive',
        searchedFields: ['name', 'phone', 'mbi', 'location']
      }
    });

  } catch (error) {
    console.error('Error searching leads:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during search'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to get user-friendly status labels
function getStatusLabel(status: string): string {
  const statusLabels: { [key: string]: string } = {
    'SUBMITTED': 'New Submission',
    'ADVOCATE_REVIEW': 'Under Review',
    'QUALIFIED': 'Qualified',
    'SENT_TO_CONSULT': 'Consultation Scheduled',
    'CONSULTED': 'Consultation Completed',
    'COLLECTIONS': 'In Collections',
    'SHIPPED': 'Product Shipped',
    'COMPLETED': 'Completed',
    'REJECTED': 'Rejected',
    'CANCELLED': 'Cancelled'
  };
  
  return statusLabels[status] || status;
} 