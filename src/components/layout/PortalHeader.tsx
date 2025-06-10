'use client';

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Badge,
  Box,
} from '@mui/material';
import {
  AccountCircle,
  ExitToApp,
  Settings,
  Notifications,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';

interface PortalHeaderProps {
  title: string;
  userRole: string;
  showConnectionStatus?: boolean;
  showNotifications?: boolean;
  additionalInfo?: React.ReactNode;
  notifications?: number;
}

export function PortalHeader({ 
  title, 
  userRole, 
  showConnectionStatus = false, 
  showNotifications = false,
  additionalInfo,
  notifications = 0
}: PortalHeaderProps) {
  const router = useRouter();
  const { user, logout, isConnected } = useStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    try {
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getPortalColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return '#1976d2'; // Blue
      case 'vendor': return '#388e3c'; // Green
      case 'advocate': return '#f57c00'; // Orange
      case 'collections': return '#7b1fa2'; // Purple
      default: return '#1976d2';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'Admin Portal';
      case 'vendor': return 'Vendor Portal';
      case 'advocate': return 'Advocate Portal';
      case 'collections': return 'Collections Portal';
      default: return 'Portal';
    }
  };

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{ 
        backgroundColor: getPortalColor(userRole),
        '& .MuiToolbar-root': {
          minHeight: '64px',
        }
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography variant="h6" component="div" sx={{ mr: 2 }}>
            {title}
          </Typography>
          <Chip
            label={getRoleDisplayName(userRole)}
            size="small"
            variant="outlined"
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255, 255, 255, 0.5)',
              mr: 2
            }}
          />
        </Box>

        {/* Additional Info (like Vendor ID) */}
        {additionalInfo && (
          <Box sx={{ mr: 2 }}>
            {additionalInfo}
          </Box>
        )}

        {/* Connection Status */}
        {showConnectionStatus && (
          <Chip
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            size="small"
            sx={{ mr: 2 }}
          />
        )}

        {/* Notifications */}
        {showNotifications && (
          <IconButton color="inherit" sx={{ mr: 2 }}>
            <Badge badgeContent={notifications} color="error">
              <Notifications />
            </Badge>
          </IconButton>
        )}

        {/* User Menu */}
        <IconButton
          color="inherit"
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 32, height: 32 }}>
            {user?.firstName?.[0] || user?.email?.[0] || 'U'}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 200,
            }
          }}
        >
          <MenuItem disabled>
            <AccountCircle sx={{ mr: 1 }} />
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>
            <Settings sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ExitToApp sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
} 