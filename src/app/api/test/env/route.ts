import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'undefined',
        DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
        DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
        DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 30) || 'not set',
        JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
        AWS_REGION: process.env.AWS_REGION || 'not set',
        AMPLIFY_BRANCH: process.env.AMPLIFY_BRANCH || 'not set',
        // Check if specific parts of the URL are accessible
        URL_PARTS: process.env.DATABASE_URL ? {
          hasPostgresql: process.env.DATABASE_URL.includes('postgresql://'),
          hasHealthcareapi: process.env.DATABASE_URL.includes('healthcareapi'),
          hasAWSHost: process.env.DATABASE_URL.includes('amazonaws.com'),
          hasPort5432: process.env.DATABASE_URL.includes(':5432'),
          hasHealthcareDB: process.env.DATABASE_URL.includes('healthcare_db')
        } : 'URL not available'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 