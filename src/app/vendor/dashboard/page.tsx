'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import {
  ExitToApp,
  AccountCircle,
  TrendingUp,
  Assignment,
  CheckCircle,
  Pending,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Auth } from 'aws-amplify';
import { LeadSubmissionForm } from '@/components/vendors/LeadSubmissionForm';
import useStore from '@/store/useStore';
import { Lead } from '@/types';
import { apiClient } from '@/lib/api/client';
import { format } from 'date-fns';

interface VendorMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  completedKits: number;
  conversionRate: number;
}

export default function VendorDashboard() {
  const router = useRouter();
  const { user, logout } = useStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<VendorMetrics>({
    totalLeads: 0,
    qualifiedLeads: 0,
    completedKits: 0,
    conversionRate: 0,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      // Fetch vendor leads and metrics
      const [leadsData, metricsData] = await Promise.all([
        apiClient.get<Lead[]>(`/vendors/${user?.vendorId}/leads`),
        apiClient.get<VendorMetrics>(`/vendors/${user?.vendorId}/metrics`),
      ]);
      setLeads(leadsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to fetch vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await Auth.signOut();
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLeadSubmitted = (lead: Lead) => {
    setLeads([lead, ...leads]);
    setMetrics({
      ...metrics,
      totalLeads: metrics.totalLeads + 1,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified':
      case 'approved':
        return 'success';
      case 'submitted':
      case 'advocate_review':
        return 'warning';
      case 'kit_completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'kit_completed':
        return <CheckCircle fontSize="small" />;
      case 'qualified':
      case 'approved':
        return <TrendingUp fontSize="small" />;
      default:
        return <Pending fontSize="small" />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Healthcare Lead Management - Vendor Portal
          </Typography>
          
          <Typography variant="body2" sx={{ mr: 3 }}>
            Vendor ID: <strong>{user?.vendorId || 'N/A'}</strong>
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
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, bgcolor: 'background.default', py: 3 }}>
        <Container maxWidth="xl">
          {/* Metrics Cards */}
          <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Leads
                  </Typography>
                  <Typography variant="h4" component="div">
                    {metrics.totalLeads}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All time submissions
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Qualified Leads
                  </Typography>
                  <Typography variant="h4" component="div">
                    {metrics.qualifiedLeads}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Passed compliance
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Completed Kits
                  </Typography>
                  <Typography variant="h4" component="div">
                    {metrics.completedKits}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Successfully returned
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Conversion Rate
                  </Typography>
                  <Typography variant="h4" component="div">
                    {(metrics.conversionRate * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lead to completion
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Lead Submission Form */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '0 0 auto', width: { xs: '100%', lg: '40%' }, minWidth: '400px' }}>
              <LeadSubmissionForm
                vendorId={user?.vendorId || ''}
                vendorCode={user?.vendorId || ''}
                onSuccess={handleLeadSubmitted}
              />
            </Box>

            {/* Recent Leads Table */}
            <Box sx={{ flex: '1 1 auto', minWidth: '500px' }}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Recent Leads
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Patient Name</TableCell>
                        <TableCell>MBI</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Test Type</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leads
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              {format(new Date(lead.createdAt), 'MM/dd/yyyy')}
                            </TableCell>
                            <TableCell>
                              {lead.firstName} {lead.lastName}
                            </TableCell>
                            <TableCell>{lead.mbi}</TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(lead.status)}
                                label={lead.status.replace('_', ' ').toUpperCase()}
                                color={getStatusColor(lead.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {lead.testType ? (
                                <Chip
                                  label={lead.testType.toUpperCase()}
                                  size="small"
                                  variant="outlined"
                                />
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={leads.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                />
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
} // Force rebuild - TypeScript fixes applied
