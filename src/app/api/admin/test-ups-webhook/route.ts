import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';

/**
 * Test UPS Webhook Endpoint
 * Allows backend developers to test webhook processing with sample data
 */

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { testType, leadId, trackingNumber } = await request.json();

    // Validate inputs
    if (!testType || !leadId) {
      return NextResponse.json({ 
        error: 'Missing required fields: testType, leadId' 
      }, { status: 400 });
    }

    // Create test webhook payload
    const testPayloads = {
      delivered: {
        trackingNumber: trackingNumber || '1Z999AA1234567890',
        localActivityDate: '20250115',
        localActivityTime: '143000',
        activityLocation: {
          city: 'ATLANTA',
          stateProvince: 'GA',
          postalCode: '30309',
          country: 'US'
        },
        activityStatus: {
          type: 'D',
          code: 'KB',
          description: 'DELIVERED'
        },
        actualDeliveryDate: '20250115',
        actualDeliveryTime: '143000'
      },
      inTransit: {
        trackingNumber: trackingNumber || '1Z999AA1234567890',
        localActivityDate: '20250114',
        localActivityTime: '120000',
        activityLocation: {
          city: 'CHICAGO',
          stateProvince: 'IL',
          postalCode: '60601',
          country: 'US'
        },
        activityStatus: {
          type: 'I',
          code: 'IP',
          description: 'IN TRANSIT'
        }
      },
      exception: {
        trackingNumber: trackingNumber || '1Z999AA1234567890',
        localActivityDate: '20250114',
        localActivityTime: '090000',
        activityLocation: {
          city: 'MEMPHIS',
          stateProvince: 'TN',
          postalCode: '38101',
          country: 'US'
        },
        activityStatus: {
          type: 'X',
          code: 'X1',
          description: 'DELIVERY ATTEMPT FAILED'
        }
      }
    };

    const payload = testPayloads[testType as keyof typeof testPayloads];
    if (!payload) {
      return NextResponse.json({ 
        error: 'Invalid testType. Options: delivered, inTransit, exception' 
      }, { status: 400 });
    }

    // Send test webhook to our own endpoint
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/webhooks/ups-tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'credential': process.env.UPS_WEBHOOK_CREDENTIAL || 'test-credential',
        'User-Agent': 'UPSPubSubTrackingService'
      },
      body: JSON.stringify(payload)
    });

    const webhookResult = await webhookResponse.json();

    // Get updated lead to verify changes
    const updatedLead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        trackingEvents: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        alerts: {
          where: { isAcknowledged: false },
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Test webhook ${testType} processed successfully`,
      webhookResponse: {
        status: webhookResponse.status,
        result: webhookResult
      },
      leadUpdate: {
        leadId: updatedLead?.id,
        status: updatedLead?.status,
        lastTrackingUpdate: updatedLead?.lastTrackingUpdate,
        recentEvents: updatedLead?.trackingEvents?.length || 0,
        activeAlerts: updatedLead?.alerts?.length || 0
      },
      testPayload: payload
    });

  } catch (error) {
    console.error('Test UPS webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to test webhook' },
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

    // Get recent tracking events for monitoring
    const recentEvents = await prisma.trackingEvent.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true
          }
        }
      }
    });

    // Get webhook health metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEvents = await prisma.trackingEvent.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    const recentAlerts = await prisma.leadAlert.count({
      where: {
        type: 'SHIPPING_EXCEPTION',
        isAcknowledged: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    return NextResponse.json({
      success: true,
      webhookHealth: {
        eventsToday: todayEvents,
        unacknowledgedAlerts: recentAlerts,
        lastEventTime: recentEvents[0]?.createdAt || null
      },
      recentEvents: recentEvents.map(event => ({
        id: event.id,
        trackingNumber: event.trackingNumber,
        eventType: event.eventType,
        activityType: event.activityType,
        description: event.description,
        location: event.location,
        eventDate: event.eventDate,
        patient: `${event.lead.firstName} ${event.lead.lastName}`,
        leadStatus: event.lead.status,
        createdAt: event.createdAt
      })),
      testInstructions: {
        endpoint: '/api/admin/test-ups-webhook',
        method: 'POST',
        payload: {
          testType: 'delivered | inTransit | exception',
          leadId: 'valid-lead-id',
          trackingNumber: 'optional-tracking-number'
        }
      }
    });

  } catch (error) {
    console.error('Webhook monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to get webhook status' },
      { status: 500 }
    );
  }
} 