import { NextRequest, NextResponse } from 'next/server';
import { AlertService } from '@/lib/services/alertService';
import { prisma } from '@/lib/prisma';

declare global {
  var broadcastMBIAlert: ((alert: any) => void) | undefined;
  var broadcastNewLead: ((lead: any) => void) | undefined;
  var broadcastDashboardUpdate: ((update: any) => void) | undefined;
}

// Helper function to generate unique MBI
function generateMBI() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    if (i === 1 || i === 5 || i === 9) {
      result += '-';
    } else {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return result;
}

// Helper function to normalize phone numbers
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Helper function to broadcast real-time alerts
function broadcastAlert(alert: any) {
  if (typeof global.broadcastMBIAlert === 'function') {
    global.broadcastMBIAlert({
      type: 'mbi_duplicate_alert',
      severity: alert.severity,
      leadId: alert.leadId,
      vendorId: alert.vendorId || 'unknown',
      message: alert.message,
      metadata: alert.metadata,
      timestamp: new Date()
    });
  }
}

// Duplicate detection function using our existing algorithm
async function checkForDuplicates(leadData: any) {
  const { firstName, lastName, dateOfBirth, phone, address } = leadData;
  
  // Search for potential duplicates
  const potentialDuplicates = await prisma.lead.findMany({
    where: {
      OR: [
        // Exact name + DOB match
        {
          firstName: { equals: firstName, mode: 'insensitive' },
          lastName: { equals: lastName, mode: 'insensitive' },
          dateOfBirth: dateOfBirth
        },
        // Exact name + similar DOB (within 2 years)
        {
          firstName: { equals: firstName, mode: 'insensitive' },
          lastName: { equals: lastName, mode: 'insensitive' },
          dateOfBirth: {
            gte: new Date(new Date(dateOfBirth).getTime() - 2 * 365 * 24 * 60 * 60 * 1000),
            lte: new Date(new Date(dateOfBirth).getTime() + 2 * 365 * 24 * 60 * 60 * 1000)
          }
        },
        // Same phone number
        {
          phone: phone
        }
      ]
    },
    include: {
      vendor: {
        select: { name: true, code: true }
      }
    }
  });

  const duplicateResults = [];

  for (const duplicate of potentialDuplicates) {
    const isExactMatch = 
      duplicate.firstName.toLowerCase() === firstName.toLowerCase() &&
      duplicate.lastName.toLowerCase() === lastName.toLowerCase() &&
      duplicate.dateOfBirth.toISOString().split('T')[0] === new Date(dateOfBirth).toISOString().split('T')[0];

    const isPhoneMatch = duplicate.phone === phone;
    
    const isSimilarAddress = 
      duplicate.street.toLowerCase().includes(address.street.toLowerCase()) ||
      (duplicate.city.toLowerCase() === address.city.toLowerCase() && 
       duplicate.zipCode === address.zipCode);

    let severity: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    let message = '';
    let criteria = [];

    if (isExactMatch) {
      severity = 'HIGH';
      criteria.push('exact name and date of birth');
    }

    if (isPhoneMatch) {
      severity = 'HIGH';
      criteria.push('phone number');
    }

    if (isSimilarAddress) {
      criteria.push('similar address');
    }

    if (criteria.length > 0) {
      message = `Potential duplicate found matching ${criteria.join(', ')} - ${duplicate.firstName} ${duplicate.lastName} from ${duplicate.vendor.name}`;
      
      duplicateResults.push({
        severity,
        message,
        metadata: {
          duplicateLeadId: duplicate.id,
          duplicateLeadName: `${duplicate.firstName} ${duplicate.lastName}`,
          duplicateVendor: duplicate.vendor.name,
          matchingCriteria: criteria,
          submittedAt: duplicate.createdAt
        }
      });
    }
  }

  return duplicateResults;
}

// POST /api/leads - Create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      dateOfBirth,
      phone,
      address,
      vendorId,
      testType = 'IMMUNE'
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !phone || !address || !vendorId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Invalid vendor ID' },
        { status: 400 }
      );
    }

    // Generate unique MBI
    const mbi = generateMBI();
    const normalizedPhone = normalizePhone(phone);

    // Check for duplicates before creating the lead
    const duplicateResults = await checkForDuplicates({
      firstName,
      lastName,
      dateOfBirth,
      phone: normalizedPhone,
      address,
      vendorId
    });

    // Create the lead
    const newLead = await prisma.lead.create({
      data: {
        mbi,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        phone: normalizedPhone,
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        vendorId,
        vendorCode: vendor.code,
        testType,
        status: 'SUBMITTED',
        contactAttempts: 0,
        isDuplicate: duplicateResults.length > 0,
        hasActiveAlerts: duplicateResults.length > 0
      }
    });

    // Process duplicate alerts if any were found
    if (duplicateResults.length > 0) {
      console.log(`🚨 Duplicates detected for lead ${newLead.id}:`, duplicateResults);

      for (const duplicateInfo of duplicateResults) {
        try {
          // Create alert in database
          const alertRecord = await prisma.leadAlert.create({
            data: {
              leadId: newLead.id,
              type: 'MBI_DUPLICATE',
              severity: duplicateInfo.severity,
              message: duplicateInfo.message,
              metadata: duplicateInfo.metadata,
              isAcknowledged: false
            }
          });

          console.log(`📝 Created alert record:`, alertRecord.id);

          // Broadcast real-time alert
          broadcastAlert({
            ...duplicateInfo,
            leadId: newLead.id,
            vendorId,
            alertId: alertRecord.id
          });

          console.log(`📡 Broadcasted real-time alert for lead ${newLead.id}`);
        } catch (alertError) {
          console.error('Error creating/broadcasting alert:', alertError);
          // Continue with other alerts even if one fails
        }
      }
    }

    // Broadcast new lead creation
    if (typeof global.broadcastNewLead === 'function') {
      global.broadcastNewLead({
        id: newLead.id,
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        mbi: newLead.mbi,
        vendorId: newLead.vendorId,
        testType: newLead.testType,
        status: newLead.status,
        isDuplicate: newLead.isDuplicate,
        hasActiveAlerts: newLead.hasActiveAlerts,
        createdAt: newLead.createdAt
      });
    }

    // Broadcast dashboard update
    if (typeof global.broadcastDashboardUpdate === 'function') {
      global.broadcastDashboardUpdate({
        type: 'new_lead_submitted',
        data: {
          leadId: newLead.id,
          vendorId,
          testType,
          hasDuplicates: duplicateResults.length > 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      lead: {
        id: newLead.id,
        mbi: newLead.mbi,
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        status: newLead.status,
        isDuplicate: newLead.isDuplicate,
        hasActiveAlerts: newLead.hasActiveAlerts,
        duplicateCount: duplicateResults.length,
        createdAt: newLead.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const vendorId = searchParams.get('vendorId');
    const advocateId = searchParams.get('advocateId');
    const collectionsAgentId = searchParams.get('collectionsAgentId');
    const status = searchParams.get('status');
    const hasAlerts = searchParams.get('hasAlerts');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (vendorId) where.vendorId = vendorId;
    if (advocateId) where.advocateId = advocateId;
    if (collectionsAgentId) where.collectionsAgentId = collectionsAgentId;
    if (status) {
      // Handle multiple status values separated by comma
      const statusArray = status.split(',');
      if (statusArray.length > 1) {
        where.status = { in: statusArray };
      } else {
        where.status = status;
      }
    }
    if (hasAlerts === 'true') where.hasActiveAlerts = true;

    // Get leads with pagination
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: { name: true, code: true }
          },
          advocate: {
            select: { id: true, firstName: true, lastName: true }
          },
          collectionsAgent: {
            select: { id: true, firstName: true, lastName: true }
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
      }),
      prisma.lead.count({ where })
    ]);

    // Format response
    const formattedLeads = leads.map(lead => ({
      id: lead.id,
      mbi: lead.mbi,
      firstName: lead.firstName,
      lastName: lead.lastName,
      dateOfBirth: lead.dateOfBirth,
      phone: lead.phone,
      address: {
        street: lead.street,
        city: lead.city,
        state: lead.state,
        zipCode: lead.zipCode
      },
      vendor: lead.vendor,
      advocate: lead.advocate,
      collectionsAgent: lead.collectionsAgent,
      testType: lead.testType,
      status: lead.status,
      isDuplicate: lead.isDuplicate,
      hasActiveAlerts: lead.hasActiveAlerts,
      activeAlerts: lead.alerts,
      contactAttempts: lead.contactAttempts,
      lastContactAttempt: lead.lastContactAttempt,
      nextCallbackDate: lead.nextCallbackDate,
      collectionsDisposition: lead.collectionsDisposition,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: formattedLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 