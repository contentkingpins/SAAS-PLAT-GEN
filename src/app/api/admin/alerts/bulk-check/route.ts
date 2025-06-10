import { NextRequest, NextResponse } from 'next/server';
import { AlertService } from '../../../../../lib/services/alertService';

// Admin authentication helper (reusing from existing admin endpoints)
async function verifyAdminAuth(request: NextRequest) {
  // This should implement the same auth logic as other admin endpoints
  // For now, returning success - in production this would verify JWT token
  return { error: null, status: 200 };
}

// POST /api/admin/alerts/bulk-check - Run bulk duplicate check on all leads
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const result = await AlertService.runBulkDuplicateCheck();

    return NextResponse.json({
      success: true,
      checked: result.checked,
      alertsCreated: result.alertsCreated,
      duplicatesFound: result.duplicatesFound,
      message: `Processed ${result.checked} leads, created ${result.alertsCreated} alerts`
    });
  } catch (error: any) {
    console.error('Error running bulk duplicate check:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to run bulk check' },
      { status: 500 }
    );
  }
}
