'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import { 
  Phone, 
  Schedule, 
  CheckCircle, 
  Assignment, 
  CallMade,
  AccountCircle,
  ExitToApp,
  Settings,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';
import { apiClient } from '@/lib/api/client';

interface Lead {
  id: string;
  mbi: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  contactAttempts: number;
  lastContactAttempt?: string;
  nextCallbackDate?: string;
  collectionsDisposition?: string;
  kitShippedDate?: string;
  createdAt: string;
}

export default function CollectionsDashboard() {
  const router = useRouter();
  const { user, logout } = useStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    pendingContact: 0,
    kitsCompleted: 0,
    callbacksScheduled: 0,
  });

  useEffect(() => {
    loadCollectionsData();
  }, []);

  const handleLogout = async () => {
    try {
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loadCollectionsData = async () => {
    try {
      setLoading(true);
      
      // Get leads in collections status
      const leadsResponse = await apiClient.get<Lead[]>(`/api/leads?collectionsAgentId=${user?.id}&status=COLLECTIONS,SHIPPED`);

      if (leadsResponse) {
        setLeads(leadsResponse || []);
        
        // Calculate stats
        const data = leadsResponse || [];
        setStats({
          totalAssigned: data.length,
          pendingContact: data.filter((l: Lead) => !l.lastContactAttempt).length,
          kitsCompleted: data.filter((l: Lead) => l.status === 'KIT_COMPLETED').length,
          callbacksScheduled: data.filter((l: Lead) => l.nextCallbackDate).length,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load collections data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COLLECTIONS': return 'warning';
      case 'SHIPPED': return 'info';
      case 'KIT_COMPLETED': return 'success';
      default: return 'default';
    }
  };

  const getDispositionColor = (disposition?: string) => {
    switch (disposition) {
      case 'KIT_COMPLETED': return 'success';
      case 'SCHEDULED_CALLBACK': return 'info';
      case 'NO_ANSWER': return 'warning';
      default: return 'default';
    }
  };

  const handleMakeCall = (leadId: string, phone: string) => {
    // Implement call functionality or open dialer
    console.log('Making call to:', phone, 'for lead:', leadId);
    // You could integrate with a VOIP system here
    window.open(`tel:${phone}`);
  };

  const handleMarkCompleted = async (leadId: string) => {
    try {
      await apiClient.patch(`/api/leads/${leadId}`, {
        status: 'KIT_COMPLETED',
        collectionsDisposition: 'KIT_COMPLETED',
      });
      loadCollectionsData(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to update lead');
    }
  };

  const isDueForCallback = (nextCallbackDate?: string) => {
    if (!nextCallbackDate) return false;
    return new Date(nextCallbackDate) <= new Date();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Healthcare Lead Management - Collections Portal
          </Typography>

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
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Collections Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.firstName}! Follow up on shipped kits and manage collections.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Assignment color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Assigned
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalAssigned}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Phone color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Pending Contact
                    </Typography>
                    <Typography variant="h4">
                      {stats.pendingContact}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckCircle color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Kits Completed
                    </Typography>
                    <Typography variant="h4">
                      {stats.kitsCompleted}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Schedule color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Callbacks Scheduled
                    </Typography>
                    <Typography variant="h4">
                      {stats.callbacksScheduled}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Collections Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Collections Queue
            </Typography>
            
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Lead</TableCell>
                    <TableCell>MBI</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Attempts</TableCell>
                    <TableCell>Last Contact</TableCell>
                    <TableCell>Next Callback</TableCell>
                    <TableCell>Disposition</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow 
                      key={lead.id}
                      sx={{
                        backgroundColor: isDueForCallback(lead.nextCallbackDate) 
                          ? 'rgba(255, 152, 0, 0.1)' 
                          : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {lead.firstName} {lead.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>{lead.mbi}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {lead.phone}
                          <IconButton 
                            size="small" 
                            onClick={() => handleMakeCall(lead.id, lead.phone)}
                            sx={{ ml: 1 }}
                          >
                            <CallMade fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={lead.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(lead.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{lead.contactAttempts}</TableCell>
                      <TableCell>
                        {lead.lastContactAttempt 
                          ? new Date(lead.lastContactAttempt).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        {lead.nextCallbackDate ? (
                          <Typography 
                            variant="body2" 
                            color={isDueForCallback(lead.nextCallbackDate) ? 'error' : 'inherit'}
                          >
                            {new Date(lead.nextCallbackDate).toLocaleDateString()}
                          </Typography>
                        ) : (
                          'None'
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.collectionsDisposition && (
                          <Chip
                            label={lead.collectionsDisposition.replace('_', ' ').toUpperCase()}
                            color={getDispositionColor(lead.collectionsDisposition) as any}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Phone />}
                            onClick={() => handleMakeCall(lead.id, lead.phone)}
                          >
                            Call
                          </Button>
                          {lead.status === 'SHIPPED' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleMarkCompleted(lead.id)}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {leads.length === 0 && !loading && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">
                  No leads in collections queue.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
} 