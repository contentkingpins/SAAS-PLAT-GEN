import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AlertService } from '../../../../../lib/services/alertService';

const prisma = new PrismaClient();

// Validation schema for alert acknowledgment
const alertAckSchema = z.object({
  alertId: z.string(),
  agentId: z.string(),
});

// GET /api/leads/[id]/alerts - Get alerts for a specific lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check for duplicate alerts (this will create new ones if needed)
    const alertResult = await AlertService.checkForDuplicateAlert(id);

    return NextResponse.json({
      success: true,
      ...alertResult
    });

  } catch (error: any) {
    console.error('Error fetching lead alerts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST /api/leads/[id]/alerts - Acknowledge an alert
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = alertAckSchema.parse(body);

    // Verify the alert belongs to this lead
    const alert = await prisma.leadAlert.findFirst({
      where: {
        id: validatedData.alertId,
        leadId: id
      }
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: 'Alert not found for this lead' },
        { status: 404 }
      );
    }

    if (alert.isAcknowledged) {
      return NextResponse.json(
        { success: false, error: 'Alert already acknowledged' },
        { status: 400 }
      );
    }

    // Acknowledge the alert
    const success = await AlertService.acknowledgeAlert(
      validatedData.alertId, 
      validatedData.agentId
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to acknowledge alert' },
        { status: 500 }
      );
    }

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

    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
} 