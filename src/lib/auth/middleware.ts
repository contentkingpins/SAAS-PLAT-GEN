import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'ADMIN' | 'VENDOR' | 'ADVOCATE' | 'COLLECTIONS';
  vendorId?: string;
  teamId?: string;
}

// Verify JWT token and return user info
export async function verifyAuth(request: NextRequest): Promise<{ user?: AuthUser; error?: string; status: number }> {
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

// Verify admin authentication
export async function verifyAdminAuth(request: NextRequest): Promise<{ user?: AuthUser; error?: string; status: number }> {
  const authResult = await verifyAuth(request);
  
  if (authResult.error) {
    return authResult;
  }

  if (authResult.user?.role !== 'ADMIN') {
    return { error: 'Admin access required', status: 403 };
  }

  return authResult;
}

// Verify vendor authentication
export async function verifyVendorAuth(request: NextRequest): Promise<{ user?: AuthUser; error?: string; status: number }> {
  const authResult = await verifyAuth(request);
  
  if (authResult.error) {
    return authResult;
  }

  if (!['ADMIN', 'VENDOR'].includes(authResult.user?.role || '')) {
    return { error: 'Vendor access required', status: 403 };
  }

  return authResult;
}

// Verify advocate authentication  
export async function verifyAdvocateAuth(request: NextRequest): Promise<{ user?: AuthUser; error?: string; status: number }> {
  const authResult = await verifyAuth(request);
  
  if (authResult.error) {
    return authResult;
  }

  if (!['ADMIN', 'ADVOCATE'].includes(authResult.user?.role || '')) {
    return { error: 'Advocate access required', status: 403 };
  }

  return authResult;
}

// Verify collections authentication
export async function verifyCollectionsAuth(request: NextRequest): Promise<{ user?: AuthUser; error?: string; status: number }> {
  const authResult = await verifyAuth(request);
  
  if (authResult.error) {
    return authResult;
  }

  if (!['ADMIN', 'COLLECTIONS'].includes(authResult.user?.role || '')) {
    return { error: 'Collections access required', status: 403 };
  }

  return authResult;
} 