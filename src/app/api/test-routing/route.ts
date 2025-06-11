import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint to verify API routing is working
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'API routing is working correctly!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    route: '/api/test-routing'
  });
} 