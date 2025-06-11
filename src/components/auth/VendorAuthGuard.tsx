'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import useStore from '@/store/useStore';

interface VendorAuthGuardProps {
  children: ReactNode;
}

export function VendorAuthGuard({ children }: VendorAuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, token } = useStore();

  useEffect(() => {
    // Check if user is authenticated and has vendor role
    if (!isAuthenticated || !user || !token) {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    if (user.role !== 'vendor' && user.role !== 'admin') {
      console.log('User is not a vendor or admin, redirecting to login');
      router.push('/login');
      return;
    }

    if (!user.vendorId && user.role === 'vendor') {
      console.log('Vendor user has no vendorId, redirecting to login');
      router.push('/login');
      return;
    }

    console.log('User authenticated as vendor:', {
      userId: user.id,
      role: user.role,
      vendorId: user.vendorId,
      hasToken: !!token
    });
  }, [user, isAuthenticated, token, router]);

  // Show loading while checking authentication
  if (!isAuthenticated || !user || !token) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // Show loading if user doesn't have proper role
  if (user.role !== 'vendor' && user.role !== 'admin') {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Checking permissions...
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}