import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DATABASE CONNECTION TEST ===');
    
    // Check environment variables
    const envCheck = {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 20) + '...',
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING'
    };
    
    console.log('Environment check:', envCheck);
    
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL environment variable not found',
        envCheck
      }, { status: 500 });
    }
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Prisma connected successfully');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query successful:', result);
    
    // Count leads
    const leadCount = await prisma.lead.count();
    console.log('✅ Lead count:', leadCount);
    
    await prisma.$disconnect();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      envCheck,
      testQuery: result,
      leadCount
    });
    
  } catch (error: any) {
    console.error('❌ Database connection failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Database connection failed',
      envCheck: {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
        DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING'
      }
    }, { status: 500 });
  }
} 