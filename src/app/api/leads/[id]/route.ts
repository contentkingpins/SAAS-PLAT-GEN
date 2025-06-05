import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AlertService } from '../../../../lib/services/alertService';

const prisma = new PrismaClient();

// Validation schema for lead updates
const leadUpdateSchema = z.object({
  advocateDisposition: z.enum(['DOESNT_QUALIFY', 'COMPLIANCE_ISSUE', 'PATIENT_DECLINED', 'CALL_BACK', 'CONNECTED_TO_COMPLIANCE', 'CALL_DROPPED', 'DUPE']).optional(),
  advocateNotes: z.string().optional(),
  advocateId: z.string().optional(),
  advocateReviewedAt: z.string().datetime().optional(),
  status: z.enum(['SUBMITTED', 'ADVOCATE_REVIEW', 'QUALIFIED', 'SENT_TO_CONSULT', 'APPROVED', 'READY_TO_SHIP', 'SHIPPED', 'COLLECTIONS', 'KIT_COMPLETED', 'RETURNED']).optional(),
  testType: z.enum(['IMMUNE', 'NEURO']).optional(),
  collectionsAgentId: z.string().optional(),
  collectionsDisposition: z.enum(['NO_ANSWER', 'SCHEDULED_CALLBACK', 'KIT_COMPLETED']).optional(),
  collectionsNotes: z.string().optional(),
}).partial();

// GET /api/leads/[id] - Get lead with alert checking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get the lead
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, name: true, code: true }
        },
        advocate: {
          select: { id: true, firstName: true, lastName: true }
        },
        collectionsAgent: {
          select: { id: true, firstName: true, lastName: true }
        },
        complianceChecklist: true,
        alerts: {
          where: { isAcknowledged: false },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Automatically check for alerts when lead is accessed
    const alertResult = await AlertService.checkForDuplicateAlert(id);

    // Get updated lead with any new alerts
    const updatedLead = await prisma.lead.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, name: true, code: true }
        },
        advocate: {
          select: { id: true, firstName: true, lastName: true }
        },
        collectionsAgent: {
          select: { id: true, firstName: true, lastName: true }
        },
        complianceChecklist: true,
        alerts: {
          where: { isAcknowledged: false },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      lead: {
        id: updatedLead!.id,
        mbi: updatedLead!.mbi,
        firstName: updatedLead!.firstName,
        lastName: updatedLead!.lastName,
        dateOfBirth: updatedLead!.dateOfBirth.toISOString(),
        phone: updatedLead!.phone,
        address: {
          street: updatedLead!.street,
          city: updatedLead!.city,
          state: updatedLead!.state,
          zipCode: updatedLead!.zipCode,
        },
        vendorId: updatedLead!.vendorId,
        vendorCode: updatedLead!.vendorCode,
        subVendorId: updatedLead!.subVendorId,
        status: updatedLead!.status,
        testType: updatedLead!.testType,
        isDuplicate: updatedLead!.isDuplicate,
        hasActiveAlerts: updatedLead!.hasActiveAlerts,
        advocateId: updatedLead!.advocateId,
        advocateDisposition: updatedLead!.advocateDisposition,
        advocateNotes: updatedLead!.advocateNotes,
        advocateReviewedAt: updatedLead!.advocateReviewedAt?.toISOString(),
        collectionsAgentId: updatedLead!.collectionsAgentId,
        collectionsDisposition: updatedLead!.collectionsDisposition,
        collectionsNotes: updatedLead!.collectionsNotes,
        contactAttempts: updatedLead!.contactAttempts,
        lastContactAttempt: updatedLead!.lastContactAttempt?.toISOString(),
        nextCallbackDate: updatedLead!.nextCallbackDate?.toISOString(),
        createdAt: updatedLead!.createdAt,
        updatedAt: updatedLead!.updatedAt,
        vendor: updatedLead!.vendor,
        advocate: updatedLead!.advocate,
        collectionsAgent: updatedLead!.collectionsAgent,
        complianceChecklist: updatedLead!.complianceChecklist,
        alerts: updatedLead!.alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          relatedLeadId: alert.relatedLeadId,
          createdAt: alert.createdAt
        }))
      },
      alertCheck: alertResult
    });

  } catch (error: any) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

// PATCH /api/leads/[id] - Update lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = leadUpdateSchema.parse(body);

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id }
    });

    if (!existingLead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    
    // Convert date strings to Date objects
    if (validatedData.advocateReviewedAt) {
      updateData.advocateReviewedAt = new Date(validatedData.advocateReviewedAt);
    }

    // Update the lead
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        vendor: {
          select: { id: true, name: true, code: true }
        },
        advocate: {
          select: { id: true, firstName: true, lastName: true }
        },
        collectionsAgent: {
          select: { id: true, firstName: true, lastName: true }
        },
        complianceChecklist: true,
        alerts: {
          where: { isAcknowledged: false },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Handle duplicate marking
    if (validatedData.advocateDisposition === 'DUPE' && validatedData.advocateId) {
      await AlertService.markLeadAsDuplicate(id, validatedData.advocateId);
    }

    return NextResponse.json({
      success: true,
      lead: {
        id: updatedLead.id,
        mbi: updatedLead.mbi,
        firstName: updatedLead.firstName,
        lastName: updatedLead.lastName,
        dateOfBirth: updatedLead.dateOfBirth.toISOString(),
        phone: updatedLead.phone,
        address: {
          street: updatedLead.street,
          city: updatedLead.city,
          state: updatedLead.state,
          zipCode: updatedLead.zipCode,
        },
        vendorId: updatedLead.vendorId,
        vendorCode: updatedLead.vendorCode,
        subVendorId: updatedLead.subVendorId,
        status: updatedLead.status,
        testType: updatedLead.testType,
        isDuplicate: updatedLead.isDuplicate,
        hasActiveAlerts: updatedLead.hasActiveAlerts,
        advocateId: updatedLead.advocateId,
        advocateDisposition: updatedLead.advocateDisposition,
        advocateNotes: updatedLead.advocateNotes,
        advocateReviewedAt: updatedLead.advocateReviewedAt?.toISOString(),
        collectionsAgentId: updatedLead.collectionsAgentId,
        collectionsDisposition: updatedLead.collectionsDisposition,
        collectionsNotes: updatedLead.collectionsNotes,
        contactAttempts: updatedLead.contactAttempts,
        lastContactAttempt: updatedLead.lastContactAttempt?.toISOString(),
        nextCallbackDate: updatedLead.nextCallbackDate?.toISOString(),
        createdAt: updatedLead.createdAt,
        updatedAt: updatedLead.updatedAt,
        vendor: updatedLead.vendor,
        advocate: updatedLead.advocate,
        collectionsAgent: updatedLead.collectionsAgent,
        complianceChecklist: updatedLead.complianceChecklist,
        alerts: updatedLead.alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          relatedLeadId: alert.relatedLeadId,
          createdAt: alert.createdAt
        }))
      }
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Error updating lead:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update lead' },
      { status: 500 }
    );
  }
} 