import { NextRequest, NextResponse } from 'next/server';
import { AlertService } from '../../../../lib/services/alertService';
import { verifyAdminAuth } from '../../../../lib/auth/middleware';

// GET /api/admin/alerts - Get all active alerts for admin overview
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    const alerts = await AlertService.getAllActiveAlerts(limit);
    
    return NextResponse.json({
      success: true,
      alerts: alerts,
      total: alerts.length
    });
  } catch (error: any) {
    console.error('Error fetching admin alerts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
} 
