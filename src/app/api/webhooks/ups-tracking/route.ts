import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Validate UPS webhook credentials
    const credential = request.headers.get('credential');
    const userAgent = request.headers.get('user-agent');
    
    if (!credential || userAgent !== 'UPSPubSubTrackingService') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate credential against your stored secret
    const expectedCredential = process.env.UPS_WEBHOOK_CREDENTIAL;
    if (credential !== expectedCredential) {
      return NextResponse.json({ error: 'Invalid credential' }, { status: 401 });
    }

    const body = await request.json();
    const {
      trackingNumber,
      localActivityDate,
      localActivityTime,
      activityLocation,
      activityStatus,
      actualDeliveryDate,
      actualDeliveryTime
    } = body;

    console.log('🚚 UPS Webhook received:', {
      trackingNumber,
      activityType: activityStatus.type,
      activityCode: activityStatus.code,
      description: activityStatus.description
    });

    // Find lead by tracking number (check both outbound and inbound)
    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { trackingNumber: trackingNumber }, // Outbound tracking
          { inboundTrackingNumber: trackingNumber } // Inbound tracking
        ]
      }
    });

    if (!lead) {
      console.log('⚠️ No lead found for tracking number:', trackingNumber);
      return NextResponse.json({ message: 'Lead not found' }, { status: 200 });
    }

    // Determine if this is outbound or inbound tracking
    const isOutbound = lead.trackingNumber === trackingNumber;
    const eventType = isOutbound ? 'OUTBOUND' : 'INBOUND';

    // Create tracking event record
    await prisma.trackingEvent.create({
      data: {
        leadId: lead.id,
        trackingNumber,
        eventType,
        activityType: activityStatus.type,
        activityCode: activityStatus.code,
        description: activityStatus.description,
        location: activityLocation ? 
          `${activityLocation.city}, ${activityLocation.stateProvince} ${activityLocation.postalCode}` : null,
        eventDate: new Date(`${localActivityDate.substring(0,4)}-${localActivityDate.substring(4,6)}-${localActivityDate.substring(6,8)}`),
        eventTime: `${localActivityTime.substring(0,2)}:${localActivityTime.substring(2,4)}:${localActivityTime.substring(4,6)}`,
      }
    });

    // Update lead status based on activity type
    let statusUpdate: any = {
      lastTrackingUpdate: new Date()
    };

    if (isOutbound) {
      // Handle outbound tracking events
      switch (activityStatus.type) {
        case 'D': // Delivered
          statusUpdate.status = 'DELIVERED';
          statusUpdate.kitDeliveredDate = actualDeliveryDate ? 
            new Date(`${actualDeliveryDate.substring(0,4)}-${actualDeliveryDate.substring(4,6)}-${actualDeliveryDate.substring(6,8)}`) : 
            new Date();
          break;
        case 'I': // In Transit
          if (lead.status === 'APPROVED') {
            statusUpdate.status = 'SHIPPED';
          }
          break;
        case 'X': // Exception
          // Create alert for collections team
          await prisma.leadAlert.create({
            data: {
              leadId: lead.id,
              type: 'SHIPPING_EXCEPTION',
              severity: 'HIGH',
              message: `Shipping exception: ${activityStatus.description}`,
              isAcknowledged: false
            }
          });
          break;
      }
    } else {
      // Handle inbound tracking events
      switch (activityStatus.type) {
        case 'D': // Kit returned to lab
          statusUpdate.status = 'KIT_COMPLETED';
          statusUpdate.kitReturnedDate = actualDeliveryDate ? 
            new Date(`${actualDeliveryDate.substring(0,4)}-${actualDeliveryDate.substring(4,6)}-${actualDeliveryDate.substring(6,8)}`) : 
            new Date();
          break;
        case 'I': // Return kit in transit
          if (['DELIVERED', 'SHIPPED'].includes(lead.status)) {
            statusUpdate.status = 'KIT_RETURNING';
          }
          break;
      }
    }

    // Update lead with new status
    await prisma.lead.update({
      where: { id: lead.id },
      data: statusUpdate
    });

    console.log('✅ Lead updated:', {
      leadId: lead.id,
      patientName: `${lead.firstName} ${lead.lastName}`,
      oldStatus: lead.status,
      newStatus: statusUpdate.status || lead.status,
      eventType,
      trackingNumber
    });

    // Send notifications based on status change
    if (statusUpdate.status) {
      await sendTrackingNotification(lead, statusUpdate.status, eventType, activityLocation);
    }

    return NextResponse.json({ message: 'Tracking event processed successfully' }, { status: 200 });

  } catch (error) {
    console.error('❌ UPS Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendTrackingNotification(lead: any, newStatus: string, eventType: string, location: any) {
  try {
    // Send SMS to patient
    if (eventType === 'OUTBOUND' && newStatus === 'DELIVERED') {
      // Patient notification: "Your test kit has been delivered"
      console.log('📱 SMS: Test kit delivered to', lead.firstName, lead.lastName);
    }
    
    if (eventType === 'INBOUND' && newStatus === 'KIT_COMPLETED') {
      // Lab notification: "Kit received, processing results"
      console.log('🔬 Lab: Kit received from', lead.firstName, lead.lastName);
    }

    // Create alert for collections team when kit is delivered
    if (newStatus === 'DELIVERED') {
      await prisma.leadAlert.create({
        data: {
          type: 'DATA_QUALITY',
          severity: 'MEDIUM',
          message: `Test kit delivered to ${lead.firstName} ${lead.lastName}. Ready for follow-up.`,
          leadId: lead.id,
          isAcknowledged: false
        }
      });
    }

  } catch (error) {
    console.error('Notification error:', error);
  }
} 