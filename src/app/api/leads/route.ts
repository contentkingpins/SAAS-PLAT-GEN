import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for lead creation
const leadCreateSchema = z.object({
  mbi: z.string().min(11).max(11),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string().datetime(),
  phone: z.string().regex(/^\d{10}$/),
  street: z.string().min(5),
  city: z.string().min(2),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}$/),
  vendorId: z.string(),
  vendorCode: z.string(),
  subVendorId: z.string().optional(),
  testType: z.enum(['IMMUNE', 'NEURO']).optional(),
});

// POST /api/leads - Create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = leadCreateSchema.parse(body);

    // Check for duplicate MBI
    const existingLead = await prisma.lead.findUnique({
      where: { mbi: validatedData.mbi },
    });

    if (existingLead) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Lead with this MBI already exists',
          existingLeadId: existingLead.id
        },
        { status: 400 }
      );
    }

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        mbi: validatedData.mbi,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        dateOfBirth: new Date(validatedData.dateOfBirth),
        phone: validatedData.phone,
        street: validatedData.street,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        vendorId: validatedData.vendorId,
        vendorCode: validatedData.vendorCode,
        subVendorId: validatedData.subVendorId,
        testType: validatedData.testType,
        status: 'SUBMITTED',
        contactAttempts: 0,
        isDuplicate: false,
        hasActiveAlerts: false,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        mbi: lead.mbi,
        firstName: lead.firstName,
        lastName: lead.lastName,
        dateOfBirth: lead.dateOfBirth.toISOString(),
        phone: lead.phone,
        address: {
          street: lead.street,
          city: lead.city,
          state: lead.state,
          zipCode: lead.zipCode,
        },
        vendorId: lead.vendorId,
        vendorCode: lead.vendorCode,
        subVendorId: lead.subVendorId,
        status: lead.status,
        testType: lead.testType,
        contactAttempts: lead.contactAttempts,
        isDuplicate: lead.isDuplicate,
        hasActiveAlerts: lead.hasActiveAlerts,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        vendor: lead.vendor,
      },
    }, { status: 201 });

  } catch (error) {
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

    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lead' },
      { status: 500 }
    );
  }
} 