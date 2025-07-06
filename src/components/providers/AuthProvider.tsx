'use client';

import React, { useEffect, ReactNode } from 'react';
import useStore from '@/store/useStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initializeAuth } = useStore();

  useEffect(() => {
    // Use the new initializeAuth method for proper token restoration
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
}