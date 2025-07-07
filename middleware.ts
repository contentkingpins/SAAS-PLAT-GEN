import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'ADMIN' | 'VENDOR' | 'ADVOCATE' | 'COLLECTIONS';
  vendorId?: string;
  teamId?: string;
}

// Verify JWT token and return user info
async function verifyAuth(request: NextRequest): Promise<{ user?: AuthUser; error?: string; status: number }> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'No authorization token provided', status: 401 };
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      const user: AuthUser = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        vendorId: decoded.vendorId,
        teamId: decoded.teamId,
      };

      return { user, status: 200 };
    } catch (jwtError) {
      return { error: 'Invalid or expired token', status: 401 };
    }
  } catch (error) {
    return { error: 'Authentication failed', status: 401 };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes and static files
  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    pathname.includes('.') ||
    pathname === '/login' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check for authentication on protected routes
  const authResult = await verifyAuth(request);
  
  if (authResult.error) {
    // For API routes, return JSON error response
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    // For page routes, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based access control
  const user = authResult.user!;
  
  if (pathname.startsWith('/admin') && user.role !== 'ADMIN') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  if (pathname.startsWith('/vendor') && !['ADMIN', 'VENDOR'].includes(user.role)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  if (pathname.startsWith('/advocate') && !['ADMIN', 'ADVOCATE'].includes(user.role)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  if (pathname.startsWith('/collections') && !['ADMIN', 'COLLECTIONS'].includes(user.role)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // Add user info to request headers for downstream use
  const response = NextResponse.next();
  response.headers.set('x-user-id', user.userId);
  response.headers.set('x-user-role', user.role);
  if (user.vendorId) {
    response.headers.set('x-vendor-id', user.vendorId);
  }

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
} 