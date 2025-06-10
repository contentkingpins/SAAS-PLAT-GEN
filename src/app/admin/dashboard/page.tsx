'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Tab,
  Tabs,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  Assessment,
  Upload,
  Settings,
  Notifications,
  ExitToApp,
  AccountCircle,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import useStore from '@/store/useStore';
import { wsService } from '@/lib/utils/websocket';
import { VendorManagement } from '@/components/admin/VendorManagement';
import { AgentManagement } from '@/components/admin/AgentManagement';
import { PortalLayout } from '@/components/layout/PortalLayout';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDashboard() {
  const { isConnected } = useStore();
  const [tabValue, setTabValue] = useState(0);
  const [notifications, setNotifications] = useState(5);

  useEffect(() => {
    // Connect to WebSocket
    wsService.connect();
    wsService.joinRoom('admin');

    return () => {
      wsService.leaveRoom('admin');
    };
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <PortalLayout
      title="Healthcare Lead Management"
      userRole="admin"
      showConnectionStatus={true}
      showNotifications={true}
      notifications={notifications}
      fullWidth={true}
    >
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="admin dashboard tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<DashboardIcon />}
            iconPosition="start"
            label="Dashboard"
          />
          <Tab
            icon={<People />}
            iconPosition="start"
            label="Agent Management"
          />
          <Tab
            icon={<Assessment />}
            iconPosition="start"
            label="Reports"
          />
          <Tab
            icon={<Upload />}
            iconPosition="start"
            label="File Uploads"
          />
          <Tab
            icon={<People />}
            iconPosition="start"
            label="Vendors"
          />
        </Tabs>
      </Paper>

          <TabPanel value={tabValue} index={0}>
            <AnalyticsDashboard />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <AgentManagement />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h5" gutterBottom>
              Reports
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 3 }}>
              <Box sx={{ flex: '1 1 300px' }}>
                <Paper sx={{ p: 3, height: 200 }}>
                  <Typography variant="h6" gutterBottom>
                    Daily Reports
                  </Typography>
                  <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                    Generate Daily Report
                  </Button>
                </Paper>
              </Box>
              <Box sx={{ flex: '1 1 300px' }}>
                <Paper sx={{ p: 3, height: 200 }}>
                  <Typography variant="h6" gutterBottom>
                    Monthly Reports
                  </Typography>
                  <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                    Generate Monthly Report
                  </Button>
                </Paper>
              </Box>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h5" gutterBottom>
              File Uploads
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 3 }}>
              <Box sx={{ flex: '1 1 250px' }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Upload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Doctor Approvals
                  </Typography>
                  <Button variant="contained" component="label">
                    Upload CSV
                    <input type="file" hidden accept=".csv" />
                  </Button>
                </Paper>
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Upload sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Shipping Reports
                  </Typography>
                  <Button variant="contained" component="label">
                    Upload CSV
                    <input type="file" hidden accept=".csv" />
                  </Button>
                </Paper>
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Upload sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Kit Returns
                  </Typography>
                  <Button variant="contained" component="label">
                    Upload CSV
                    <input type="file" hidden accept=".csv" />
                  </Button>
                </Paper>
              </Box>
            </Box>
          </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <VendorManagement />
      </TabPanel>
    </PortalLayout>
  );
}
