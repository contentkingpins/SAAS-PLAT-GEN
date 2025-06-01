'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
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
import { signOut } from 'aws-amplify/auth';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import useStore from '@/store/useStore';
import { wsService } from '@/lib/utils/websocket';

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
  const router = useRouter();
  const { user, logout, isConnected } = useStore();
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState(5);

  useEffect(() => {
    // Connect to WebSocket
    wsService.connect();
    wsService.joinRoom('admin');

    return () => {
      wsService.leaveRoom('admin');
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Healthcare Lead Management - Admin Portal
          </Typography>
          
          <Chip
            icon={isConnected ? null : undefined}
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            size="small"
            sx={{ mr: 2 }}
          />

          <IconButton color="inherit" sx={{ mr: 2 }}>
            <Badge badgeContent={notifications} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          <IconButton
            color="inherit"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
              {user?.firstName?.[0]}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem disabled>
              <AccountCircle sx={{ mr: 1 }} />
              {user?.email}
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

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        <Container maxWidth={false} sx={{ mt: 2, mb: 2 }}>
          <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
            </Tabs>
          </Paper>

          <TabPanel value={tabValue} index={0}>
            <AnalyticsDashboard />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" gutterBottom>
              Agent Management
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6">Active Agents</Typography>
                    <Button variant="contained" startIcon={<People />}>
                      Add New Agent
                    </Button>
                  </Box>
                  {/* Agent list would go here */}
                  <Typography color="text.secondary">
                    Agent management interface coming soon...
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h5" gutterBottom>
              Reports
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: 200 }}>
                  <Typography variant="h6" gutterBottom>
                    Daily Reports
                  </Typography>
                  <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                    Generate Daily Report
                  </Button>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: 200 }}>
                  <Typography variant="h6" gutterBottom>
                    Monthly Reports
                  </Typography>
                  <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                    Generate Monthly Report
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h5" gutterBottom>
              File Uploads
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
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
              </Grid>
              <Grid item xs={12} md={4}>
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
              </Grid>
              <Grid item xs={12} md={4}>
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
              </Grid>
            </Grid>
          </TabPanel>
        </Container>
      </Box>
    </Box>
  );
} 