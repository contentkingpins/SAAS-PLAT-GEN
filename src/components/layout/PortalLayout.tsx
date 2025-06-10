'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Alert,
} from '@mui/material';
import { PortalHeader } from './PortalHeader';

interface PortalLayoutProps {
  title: string;
  userRole: string;
  children: React.ReactNode;
  showConnectionStatus?: boolean;
  showNotifications?: boolean;
  additionalHeaderInfo?: React.ReactNode;
  notifications?: number;
  subtitle?: string;
  error?: string | null;
  success?: string | null;
  onErrorClose?: () => void;
  onSuccessClose?: () => void;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullWidth?: boolean;
}

export function PortalLayout({
  title,
  userRole,
  children,
  showConnectionStatus = false,
  showNotifications = false,
  additionalHeaderInfo,
  notifications = 0,
  subtitle,
  error,
  success,
  onErrorClose,
  onSuccessClose,
  maxWidth = 'xl',
  fullWidth = false,
}: PortalLayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Standardized Header */}
      <PortalHeader
        title={title}
        userRole={userRole}
        showConnectionStatus={showConnectionStatus}
        showNotifications={showNotifications}
        additionalInfo={additionalHeaderInfo}
        notifications={notifications}
      />

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        <Container 
          maxWidth={fullWidth ? false : maxWidth} 
          sx={{ 
            py: 3,
            ...(fullWidth && { maxWidth: 'none', px: 3 })
          }}
        >
          {/* Page Title and Subtitle */}
          {subtitle && (
            <Box mb={4}>
              <Typography variant="h4" component="h1" gutterBottom>
                {subtitle}
              </Typography>
            </Box>
          )}

          {/* Alert Messages */}
          {error && (
            <Alert 
              severity="error" 
              onClose={onErrorClose} 
              sx={{ mb: 3 }}
            >
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert 
              severity="success" 
              onClose={onSuccessClose} 
              sx={{ mb: 3 }}
            >
              {success}
            </Alert>
          )}

          {/* Portal Content */}
          {children}
        </Container>
      </Box>
    </Box>
  );
} 