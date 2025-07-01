import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upsService } from '@/lib/services/upsService';
import { verifyAdminAuth } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Find the lead and verify it's approved
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    if (lead.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Lead must be in APPROVED status to ship' },
        { status: 400 }
      );
    }

    if (lead.trackingNumber) {
      return NextResponse.json(
        { error: 'Lead already has a tracking number' },
        { status: 400 }
      );
    }

    console.log('🚚 Auto-shipping approved lead:', leadId);

    // Create UPS shipping label
    const shippingResult = await upsService.createShippingLabel({
      leadId: lead.id,
      recipient: {
        name: `${lead.firstName} ${lead.lastName}`,
        address: {
          street: lead.street,
          city: lead.city,
          state: lead.state,
          zipCode: lead.zipCode
        },
        phone: lead.phone
      },
      package: {
        weight: '1.0',
        dimensions: '12x8x4',
        description: 'Medical Test Kit'
      }
    });

    if (!shippingResult.success) {
      console.error('❌ Shipping label creation failed:', shippingResult.error);
      return NextResponse.json(
        { error: `Shipping failed: ${shippingResult.error}` },
        { status: 500 }
      );
    }

    // Update lead with shipping information
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'SHIPPED',
        trackingNumber: shippingResult.trackingNumber,
        inboundTrackingNumber: shippingResult.returnTrackingNumber,
        kitShippedDate: new Date(),
        lastTrackingUpdate: new Date(),
        collectionsNotes: lead.collectionsNotes 
          ? `${lead.collectionsNotes}\n\n📦 SHIPPED: ${new Date().toISOString()}\nTracking: ${shippingResult.trackingNumber}\nReturn Tracking: ${shippingResult.returnTrackingNumber}`
          : `📦 SHIPPED: ${new Date().toISOString()}\nTracking: ${shippingResult.trackingNumber}\nReturn Tracking: ${shippingResult.returnTrackingNumber}`
      }
    });

    // Create initial tracking event
    await prisma.trackingEvent.create({
      data: {
        leadId: lead.id,
        trackingNumber: shippingResult.trackingNumber!,
        eventType: 'OUTBOUND',
        activityType: 'S',
        activityCode: 'SH',
        description: 'SHIPPED - Label Created',
        location: 'Atlanta, GA 30309',
        eventDate: new Date(),
        eventTime: new Date().toTimeString().substring(0, 8)
      }
    });

    // Create return tracking event
    if (shippingResult.returnTrackingNumber) {
      await prisma.trackingEvent.create({
        data: {
          leadId: lead.id,
          trackingNumber: shippingResult.returnTrackingNumber,
          eventType: 'INBOUND',
          activityType: 'S',
          activityCode: 'RT',
          description: 'RETURN LABEL CREATED',
          location: 'Atlanta, GA 30309',
          eventDate: new Date(),
          eventTime: new Date().toTimeString().substring(0, 8)
        }
      });
    }

    // Create notification alert for collections team
    await prisma.leadAlert.create({
      data: {
        type: 'DATA_QUALITY',
        severity: 'MEDIUM',
        message: `Test kit shipped to ${lead.firstName} ${lead.lastName}. Tracking: ${shippingResult.trackingNumber}`,
        leadId: lead.id,
        isAcknowledged: false
      }
    });

    console.log('✅ Lead shipped successfully:', {
      leadId: lead.id,
      patientName: `${lead.firstName} ${lead.lastName}`,
      trackingNumber: shippingResult.trackingNumber,
      returnTrackingNumber: shippingResult.returnTrackingNumber
    });

    // Send patient notification (SMS/Email would go here)
    console.log('📱 Patient notification: Kit shipped to', lead.firstName, lead.lastName);

    return NextResponse.json({
      success: true,
      message: 'Lead shipped successfully',
      data: {
        leadId: updatedLead.id,
        status: updatedLead.status,
        trackingNumber: updatedLead.trackingNumber,
        returnTrackingNumber: updatedLead.inboundTrackingNumber,
        kitShippedDate: updatedLead.kitShippedDate,
        labelUrl: shippingResult.labelUrl,
        returnLabelUrl: shippingResult.returnLabelUrl
      }
    });

  } catch (error) {
    console.error('❌ Auto-ship lead error:', error);
    return NextResponse.json(
      { error: 'Failed to ship lead', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get leads ready to ship (approved but not yet shipped)
    const readyToShip = await prisma.lead.findMany({
      where: {
        status: 'APPROVED',
        trackingNumber: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        city: true,
        state: true,
        vendorCode: true,
        createdAt: true,
        doctorApprovalDate: true
      },
      orderBy: {
        doctorApprovalDate: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      count: readyToShip.length,
      leads: readyToShip
    });

  } catch (error) {
    console.error('❌ Get ready-to-ship leads error:', error);
    return NextResponse.json(
      { error: 'Failed to get ready-to-ship leads' },
      { status: 500 }
    );
  }
} 