import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { AlertService } from '@/lib/services/alertService';
import { verifyAuth } from '@/lib/auth/middleware';

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
  
  // Editable patient information fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  middleInitial: z.string().optional(),
  gender: z.string().optional(),
  ethnicity: z.string().optional(),
  maritalStatus: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  
  // Address fields
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  
  // Insurance fields
  primaryInsuranceCompany: z.string().optional(),
  primaryPolicyNumber: z.string().optional(),
  
  // Medical history fields
  medicalHistory: z.string().optional(),
  surgicalHistory: z.string().optional(),
  currentMedications: z.string().optional(),
  conditionsHistory: z.string().optional(),
}).partial();

// GET /api/leads/[id] - Get lead with alert checking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== LEAD DETAILS API ENDPOINT ===');
    console.log('Lead ID:', params.id);
    
    // Debug environment variables
    const envDebug = {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'N/A',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV
    };
    console.log('Environment variables:', envDebug);
    
    // Check if DATABASE_URL is available
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL is not available!');
      return NextResponse.json({
        success: false,
        error: 'Database configuration error - DATABASE_URL not found',
        debug: envDebug
      }, { status: 500 });
    }
    
    // Verify authentication first
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Only allow ADMIN, ADVOCATE, and COLLECTIONS to view lead details
    const allowedRoles = ['ADMIN', 'ADVOCATE', 'COLLECTIONS'];
    if (!allowedRoles.includes(authResult.user?.role || '')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = params;
    
    console.log('✅ Environment check passed, attempting database query...');

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

    console.log('✅ Lead found successfully:', lead.firstName, lead.lastName);

    // Auto-assign lead to advocate if conditions are met
    let assignmentMade = false;
    if (authResult.user?.role === 'ADVOCATE' && !lead.advocateId) {
      // Only auto-assign if lead is in a status that allows advocate assignment
      const assignableStatuses = ['SUBMITTED', 'ADVOCATE_REVIEW'];
      
      if (assignableStatuses.includes(lead.status)) {
        console.log('🎯 Auto-assigning lead to advocate:', authResult.user.userId);
        
        // Update lead with advocate assignment
        await prisma.lead.update({
          where: { id },
          data: {
            advocateId: authResult.user.userId,
            status: 'ADVOCATE_REVIEW' // Ensure status is set to ADVOCATE_REVIEW
          }
        });
        
        assignmentMade = true;
        console.log('✅ Lead auto-assigned successfully to advocate:', authResult.user.userId);
      }
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
      autoAssigned: assignmentMade, // Indicate if assignment was made during this request
      lead: {
        id: updatedLead!.id,
        mbi: updatedLead!.mbi,
        firstName: updatedLead!.firstName,
        lastName: updatedLead!.lastName,
        dateOfBirth: updatedLead!.dateOfBirth.toISOString(),
        phone: updatedLead!.phone,
        
        // Additional demographics
        middleInitial: updatedLead!.middleInitial,
        gender: updatedLead!.gender,
        ethnicity: updatedLead!.ethnicity,
        maritalStatus: updatedLead!.maritalStatus,
        height: updatedLead!.height,
        weight: updatedLead!.weight,
        
        // Address
        address: {
          street: updatedLead!.street,
          city: updatedLead!.city,
          state: updatedLead!.state,
          zipCode: updatedLead!.zipCode,
        },
        
        // Insurance information
        insurance: {
          primaryCompany: updatedLead!.primaryInsuranceCompany,
          primaryPolicyNumber: updatedLead!.primaryPolicyNumber,
        },
        
        // Medical history
        medicalHistory: {
          past: updatedLead!.medicalHistory,
          surgical: updatedLead!.surgicalHistory,
          medications: updatedLead!.currentMedications,
          conditions: updatedLead!.conditionsHistory,
        },
        
        // Family history (already parsed by Prisma)
        familyHistory: updatedLead!.familyHistory || null,
        
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
    console.error('❌ Error in lead details API:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 500)
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch lead',
        debug: {
          DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
          errorType: error.constructor.name,
          errorCode: error.code
        }
      },
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
    // Verify authentication first
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Only allow ADMIN, ADVOCATE, and COLLECTIONS to update leads
    const allowedRoles = ['ADMIN', 'ADVOCATE', 'COLLECTIONS'];
    if (!allowedRoles.includes(authResult.user?.role || '')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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
        
        // Additional demographics
        middleInitial: updatedLead.middleInitial,
        gender: updatedLead.gender,
        ethnicity: updatedLead.ethnicity,
        maritalStatus: updatedLead.maritalStatus,
        height: updatedLead.height,
        weight: updatedLead.weight,
        
        // Address
        address: {
          street: updatedLead.street,
          city: updatedLead.city,
          state: updatedLead.state,
          zipCode: updatedLead.zipCode,
        },
        
        // Insurance information
        insurance: {
          primaryCompany: updatedLead.primaryInsuranceCompany,
          primaryPolicyNumber: updatedLead.primaryPolicyNumber,
        },
        
        // Medical history
        medicalHistory: {
          past: updatedLead.medicalHistory,
          surgical: updatedLead.surgicalHistory,
          medications: updatedLead.currentMedications,
          conditions: updatedLead.conditionsHistory,
        },
        
        // Family history (already parsed by Prisma)
        familyHistory: updatedLead.familyHistory || null,
        
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
