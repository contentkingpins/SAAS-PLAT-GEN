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

    // STRONG AUTO-ASSIGNMENT: Assign lead to advocate if unassigned
    let assignmentMade = false;
    let assignmentMessage = '';
    
    if (authResult.user?.role === 'ADVOCATE') {
      console.log('🔍 === ADVOCATE LEAD ACCESS DEBUG ===');
      console.log('🔍 Auth user object:', JSON.stringify(authResult.user, null, 2));
      console.log('🔍 Auth user.userId (assignment value):', authResult.user.userId);
      console.log('🔍 Auth user.userId type:', typeof authResult.user.userId);
      console.log('🔍 Lead current advocateId:', lead.advocateId);
      console.log('🔍 Lead advocateId type:', typeof lead.advocateId);
      console.log('🔍 Lead status:', lead.status);
      console.log('🔍 === COMPARISON TEST ===');
      console.log('🔍 String comparison (advocateId === userId):', lead.advocateId === authResult.user.userId);
      console.log('🔍 String conversion comparison:', String(lead.advocateId) === String(authResult.user.userId));
      
      if (!lead.advocateId) {
        // Lead is unassigned - assign it to current advocate
        const assignableStatuses = ['SUBMITTED', 'ADVOCATE_REVIEW'];
        
        if (assignableStatuses.includes(lead.status)) {
          console.log('🎯 === AUTO-ASSIGNMENT STARTING ===');
          console.log('🎯 Assigning lead to advocate ID:', authResult.user.userId);
          
          try {
            // Use a transaction to ensure data consistency
            const updatedLead = await prisma.lead.update({
              where: { id },
              data: {
                advocateId: authResult.user.userId,
                status: 'ADVOCATE_REVIEW',
                advocateReviewedAt: new Date()
              },
              include: {
                advocate: {
                  select: { id: true, firstName: true, lastName: true }
                }
              }
            });
            
            assignmentMade = true;
            assignmentMessage = `✅ Lead has been automatically assigned to you and moved to your "My Leads" tab.`;
            
            console.log('✅ === ASSIGNMENT SUCCESS ===');
            console.log('✅ Lead ID:', id);
            console.log('✅ Assigned to advocate ID:', updatedLead.advocateId);
            console.log('✅ Advocate details:', updatedLead.advocate);
            console.log('✅ New status:', updatedLead.status);
            console.log('✅ Assignment timestamp:', updatedLead.advocateReviewedAt);
            
            // Update the lead object for the response
            lead.advocateId = updatedLead.advocateId;
            lead.status = updatedLead.status;
            lead.advocate = updatedLead.advocate;
            
          } catch (assignmentError) {
            console.error('❌ === ASSIGNMENT FAILED ===');
            console.error('❌ Error:', assignmentError);
            assignmentMessage = 'Assignment failed - please try again';
          }
        } else {
          console.log('⚠️ Lead status not assignable:', lead.status);
          assignmentMessage = `Lead status "${lead.status}" is not assignable to advocates`;
        }
      } else if (lead.advocateId !== authResult.user.userId) {
        // Lead is assigned to a different advocate - deny access
        console.log('🚫 === ACCESS DENIED ===');
        console.log('🚫 Lead advocateId:', lead.advocateId, '(type:', typeof lead.advocateId, ')');
        console.log('🚫 Auth userId:', authResult.user.userId, '(type:', typeof authResult.user.userId, ')');
        console.log('🚫 Lead assigned to different advocate');
        
        return NextResponse.json({
          success: false,
          error: 'This lead is already assigned to another advocate and is no longer available in the general pool.',
          assignedTo: lead.advocate ? `${lead.advocate.firstName} ${lead.advocate.lastName}` : 'Another advocate',
          debugInfo: {
            leadAdvocateId: lead.advocateId,
            currentUserId: authResult.user.userId,
            leadAdvocateIdType: typeof lead.advocateId,
            currentUserIdType: typeof authResult.user.userId
          }
        }, { status: 403 });
      } else {
        console.log('✅ === OWN LEAD ACCESS ===');
        console.log('✅ Advocate accessing their own assigned lead');
        console.log('✅ Lead advocateId:', lead.advocateId);
        console.log('✅ Auth userId:', authResult.user.userId);
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
      assignmentMessage: assignmentMessage, // Message about assignment
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
    console.log('🔧 === LEAD UPDATE API DEBUG ===');
    console.log('🔧 Lead ID to update:', params.id);
    
    // Verify authentication first
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      console.log('🔧 Authentication failed:', authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    console.log('🔧 Auth successful. User:', authResult.user?.role, authResult.user?.userId);

    // Only allow ADMIN, ADVOCATE, and COLLECTIONS to update leads
    const allowedRoles = ['ADMIN', 'ADVOCATE', 'COLLECTIONS'];
    if (!allowedRoles.includes(authResult.user?.role || '')) {
      console.log('🔧 Access denied. User role:', authResult.user?.role);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    
    console.log('🔧 === REQUEST BODY DEBUG ===');
    console.log('🔧 Raw request body:', JSON.stringify(body, null, 2));
    console.log('🔧 Body keys:', Object.keys(body));
    console.log('🔧 Body values sample:', {
      advocateDisposition: body.advocateDisposition,
      firstName: body.firstName,
      lastName: body.lastName,
      status: body.status
    });

    // Validate the request body
    console.log('🔧 === VALIDATION DEBUG ===');
    let validatedData;
    try {
      validatedData = leadUpdateSchema.parse(body);
      console.log('🔧 ✅ Validation successful');
      console.log('🔧 Validated data keys:', Object.keys(validatedData));
    } catch (validationError) {
      console.log('🔧 ❌ Validation failed:', validationError);
      if (validationError instanceof z.ZodError) {
        console.log('🔧 Validation errors:', validationError.errors);
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: validationError.errors
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Check if lead exists
    console.log('🔧 === DATABASE CHECK ===');
    const existingLead = await prisma.lead.findUnique({
      where: { id },
      include: {
        advocate: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!existingLead) {
      console.log('🔧 ❌ Lead not found:', id);
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    console.log('🔧 ✅ Lead found:', existingLead.firstName, existingLead.lastName);
    console.log('🔧 Current advocateId:', existingLead.advocateId);
    console.log('🔧 Requesting user:', authResult.user?.userId);

    // Prepare update data
    console.log('🔧 === UPDATE DATA PREPARATION ===');
    const updateData: any = { ...validatedData };

    // Convert date strings to Date objects
    if (validatedData.advocateReviewedAt) {
      updateData.advocateReviewedAt = new Date(validatedData.advocateReviewedAt);
      console.log('🔧 Converted advocateReviewedAt to Date object');
    }

    console.log('🔧 Final update data keys:', Object.keys(updateData));
    console.log('🔧 Final update data sample:', {
      advocateDisposition: updateData.advocateDisposition,
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      status: updateData.status,
      advocateId: updateData.advocateId
    });

    // Update the lead
    console.log('🔧 === DATABASE UPDATE ===');
    let updatedLead;
    try {
      updatedLead = await prisma.lead.update({
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
      console.log('🔧 ✅ Database update successful');
      console.log('🔧 Updated lead ID:', updatedLead.id);
      console.log('🔧 New advocateId:', updatedLead.advocateId);
      console.log('🔧 New status:', updatedLead.status);
    } catch (dbError) {
      console.log('🔧 ❌ Database update failed:', dbError);
      throw dbError;
    }

    // Handle duplicate marking
    if (validatedData.advocateDisposition === 'DUPE' && validatedData.advocateId) {
      console.log('🔧 Marking lead as duplicate');
      await AlertService.markLeadAsDuplicate(id, validatedData.advocateId);
    }

    console.log('🔧 === SUCCESS RESPONSE ===');
    console.log('🔧 Preparing response with updated lead data');

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
    console.log('🔧 === ERROR IN LEAD UPDATE ===');
    console.log('🔧 Error type:', error.constructor.name);
    console.log('🔧 Error message:', error.message);
    console.log('🔧 Error code:', error.code);
    console.log('🔧 Error stack:', error.stack?.substring(0, 500));

    if (error instanceof z.ZodError) {
      console.log('🔧 Zod validation error details:', error.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('🔧 Unexpected error updating lead:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update lead',
        debug: {
          errorType: error.constructor.name,
          errorCode: error.code,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}
