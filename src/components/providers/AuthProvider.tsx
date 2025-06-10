'use client';

import React, { useEffect, ReactNode } from 'react';
import useStore from '@/store/useStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setToken, logout } = useStore();

  useEffect(() => {
    // Check for existing token in localStorage on app startup
    if (typeof window !== 'undefined') {
      const existingToken = localStorage.getItem('authToken');

      if (existingToken) {
        // Verify the token is still valid by checking if it's expired
        try {
          const payload = JSON.parse(atob(existingToken.split('.')[1]));
          const currentTime = Date.now() / 1000;

          if (payload.exp && payload.exp > currentTime) {
            // Token is still valid, restore it
            setToken(existingToken);
          } else {
            // Token is expired, clear it
            console.log('Token expired, clearing auth state');
            logout();
          }
        } catch (error) {
          // Invalid token format, clear it
          console.log('Invalid token format, clearing auth state');
          logout();
        }
      }
    }
  }, [setToken, logout]);

  return <>{children}</>;
}