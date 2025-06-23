import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { TestType } from '@prisma/client';

// Validation schema for comprehensive lead submission
const leadSubmissionSchema = z.object({
  // Required fields
  mbi: z.string().min(11, 'MBI must be at least 11 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  vendorCode: z.string().min(1, 'Vendor code is required'),
  vendorId: z.string().min(1, 'Vendor ID is required'),


  
  // Address - now required
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'Zip code is required'),
  testType: z.enum(['immune', 'neuro']).optional(),


});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Lead submission request received:', { vendorCode: body.vendorCode, mbi: body.mbi, testType: body.testType });

    // Validate the request body
    const validationResult = leadSubmissionSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify vendor exists and is active
    const vendor = await prisma.vendor.findUnique({
      where: { code: data.vendorCode }, // Use vendorCode instead of vendorId for lookup
      select: { id: true, code: true, isActive: true }
    });

    if (!vendor) {
      console.error('Vendor not found:', data.vendorCode);
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (!vendor.isActive) {
      console.error('Vendor is inactive:', data.vendorCode);
      return NextResponse.json({ error: 'Vendor is inactive' }, { status: 403 });
    }

    // Validate that the vendorId matches the vendorCode (if provided)
    if (data.vendorId && vendor.id !== data.vendorId) {
      console.error('Vendor ID mismatch:', { provided: data.vendorId, actual: vendor.id });
      return NextResponse.json({ error: 'Vendor code and ID mismatch' }, { status: 400 });
    }

    // Check for duplicate MBI
    const existingLead = await prisma.lead.findFirst({
      where: { mbi: data.mbi },
      select: { id: true, status: true }
    });

    if (existingLead) {
      console.error('Duplicate MBI detected:', data.mbi);
      return NextResponse.json(
        {
          error: 'A lead with this MBI already exists',
          existing: {
            id: existingLead.id,
            status: existingLead.status
          }
        },
        { status: 409 }
      );
    }

    // Convert dateOfBirth string to Date object
    const dateOfBirth = new Date(data.dateOfBirth);
    
    // Validate the date is valid
    if (isNaN(dateOfBirth.getTime())) {
      console.error('Invalid date of birth:', data.dateOfBirth);
      return NextResponse.json(
        { error: 'Invalid date of birth format' },
        { status: 400 }
      );
    }

    // Create the lead
    const newLead = await prisma.lead.create({
      data: {
        mbi: data.mbi,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        phone: data.phone,
        
        // Address
        street: data.street || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        
        // Vendor info
        vendorId: vendor.id,
        vendorCode: vendor.code,
        subVendorId: null,
        
        // Status and type
        status: 'SUBMITTED',
        testType: data.testType ? (data.testType.toUpperCase() as TestType) : null,
        
        // Alert tracking
        isDuplicate: false,
        hasActiveAlerts: false,
        
        // Initialize counts
        contactAttempts: 0,
      },
      select: {
        id: true,
        mbi: true,
        firstName: true,
        lastName: true,
        status: true,
        testType: true,
        vendorCode: true,
        createdAt: true,
      },
    });



    // Log the lead creation for tracking
    console.log(`✅ New lead submitted successfully: ${newLead.id} by vendor ${vendor.code}`);

    return NextResponse.json({
      success: true,
      data: {
        id: newLead.id,
        status: newLead.status,
        createdAt: newLead.createdAt,
        vendor: newLead.vendorCode
      },
      message: 'Lead submitted successfully'
    });

  } catch (error) {
    console.error('❌ Error submitting lead:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    // Handle Prisma unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A lead with this information already exists' },
        { status: 409 }
      );
    }

    // Handle Prisma database errors
    if (error instanceof Error && error.message.includes('Prisma')) {
      console.error('Database error:', error.message);
      return NextResponse.json(
        { error: 'Database error occurred. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit lead. Please try again.' },
      { status: 500 }
    );
  } finally {
    // Ensure prisma connection is properly handled
    await prisma.$disconnect();
  }
}

// Optional: Add a GET method to check submission status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('id');
  const mbi = searchParams.get('mbi');

  if (!leadId && !mbi) {
    return NextResponse.json(
      { error: 'Lead ID or MBI is required' },
      { status: 400 }
    );
  }

  try {
    const lead = await prisma.lead.findFirst({
      where: leadId ? { id: leadId } : { mbi: mbi! },
      select: {
        id: true,
        status: true,
        createdAt: true,
        vendor: {
          select: {
            name: true,
            code: true,
          }
        }
      }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: lead
    });

  } catch (error) {
    console.error('Error fetching lead status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead status' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
