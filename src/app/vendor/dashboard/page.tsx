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
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Tooltip,
  Link,
} from '@mui/material';
import {
  ExitToApp,
  AccountCircle,
  TrendingUp,
  Assignment,
  CheckCircle,
  Pending,
  Business as BusinessIcon,
  Add as AddIcon,
  Link as LinkIcon,
  AccountTree as AccountTreeIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';
import { Lead } from '@/types';
import { apiClient } from '@/lib/api/client';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VendorAuthGuard } from '@/components/auth/VendorAuthGuard';
import { PortalLayout } from '@/components/layout/PortalLayout';

interface VendorMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  acceptedDenials: number;
  conversionRate: number;
}

interface SubVendor {
  id: string;
  name: string;
  code: string;
  staticCode: string;
  isActive: boolean;
  leads: { id: string; status: string; }[];
  users: { id: string; email: string; firstName: string; lastName: string; }[];
  createdAt: string;
  updatedAt: string;
}

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
      id={`vendor-tabpanel-${index}`}
      aria-labelledby={`vendor-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Validation schema for creating downline vendors
const downlineVendorSchema = z.object({
  name: z.string().min(2, 'Vendor name must be at least 2 characters'),
  code: z.string().min(3, 'Vendor code must be at least 3 characters').optional(),
  staticCode: z.string().min(3, 'Static code must be at least 3 characters').optional(),
  isActive: z.boolean(),
});

type DownlineVendorFormData = z.infer<typeof downlineVendorSchema>;

export default function VendorDashboard() {
  const router = useRouter();
  const { user, logout } = useStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tabValue, setTabValue] = useState(0);
  const [isMainVendor, setIsMainVendor] = useState(true); // Default to true since only main vendors can log in

  // Lead Management State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<VendorMetrics>({
    totalLeads: 0,
    qualifiedLeads: 0,
    acceptedDenials: 0,
    conversionRate: 0,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  // Downline Management State
  const [subVendors, setSubVendors] = useState<SubVendor[]>([]);
  const [downlineLoading, setDownlineLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DownlineVendorFormData>({
    resolver: zodResolver(downlineVendorSchema),
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    if (user?.vendorId) {
      fetchVendorData();
    }
  }, [user?.vendorId]);

  // Auto-refresh every 30 seconds to show updated lead statuses
  useEffect(() => {
    if (!user?.vendorId) return;

    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing vendor dashboard for updated lead statuses');
      fetchVendorData();
    }, 15000); // Refresh every 15 seconds for faster status updates

    return () => clearInterval(refreshInterval);
  }, [user?.vendorId]);

  // Refresh when user returns to the tab (for immediate status updates)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.vendorId) {
        console.log('🔄 Tab became visible - refreshing vendor dashboard for latest lead statuses');
        fetchVendorData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.vendorId]);

  useEffect(() => {
    if (tabValue === 1 && user?.vendorId) {
      fetchSubVendors();
    }
  }, [tabValue, user?.vendorId]);

  const fetchVendorData = async () => {
    if (!user?.vendorId) return;

    try {
      setLoading(true);
      // Fetch leads and metrics
      const [leadsData, metricsData] = await Promise.all([
        apiClient.get<Lead[]>(`/vendors/${user.vendorId}/leads`),
        apiClient.get<VendorMetrics>(`/vendors/${user.vendorId}/metrics`),
      ]);

      setLeads(leadsData);
      setMetrics(metricsData);

      // Check if this is a main vendor by trying to access downlines
      // Only main vendors can access this endpoint
      try {
        await apiClient.get(`/vendors/${user.vendorId}/downlines`);
        setIsMainVendor(true); // If successful, it's a main vendor
      } catch (error: any) {
        // If we get a 403 about sub-vendors, then this is a sub-vendor
        if (error?.status === 403 && error?.message?.includes('main vendors')) {
          setIsMainVendor(false);
        } else {
          // Any other error (like empty results) means it's still a main vendor
          setIsMainVendor(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubVendors = async () => {
    if (!user?.vendorId) return;

    try {
      setDownlineLoading(true);
      const data = await apiClient.get<SubVendor[]>(`/vendors/${user.vendorId}/downlines`);
      setSubVendors(data || []);
    } catch (error: any) {
      setError('Failed to fetch downline vendors: ' + error.message);
    } finally {
      setDownlineLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateDownline = () => {
    reset({
      name: '',
      code: '',
      staticCode: '',
      isActive: true,
    });
    setDialogOpen(true);
  };

  const onSubmitDownline = async (data: DownlineVendorFormData) => {
    if (!user?.vendorId) return;

    try {
      setError(null);

      const downlineData = {
        ...data,
        parentVendorId: user.vendorId, // Set current vendor as parent
      };

      await apiClient.post(`/vendors/${user.vendorId}/downlines`, downlineData);
      setSuccess('Downline vendor created successfully');
      setDialogOpen(false);
      fetchSubVendors(); // Refresh the list
    } catch (error: any) {
      setError(error.message || 'Failed to create downline vendor');
    }
  };

  const getFormLink = (vendor: SubVendor) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/form/${vendor.code}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Link copied to clipboard!');
  };

  const getSubVendorStats = (vendor: SubVendor) => {
    const totalLeads = vendor.leads?.length || 0;
    const activeUsers = vendor.users?.length || 0;

    return { totalLeads, activeUsers };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUALIFIED':
      case 'APPROVED':
      case 'SENT_TO_CONSULT':
        return 'success';
      case 'SUBMITTED':
      case 'ADVOCATE_REVIEW':
        return 'warning';
      case 'KIT_COMPLETED':
        return 'info';
      case 'DOESNT_QUALIFY':
      case 'PATIENT_DECLINED':
      case 'DUPLICATE':
      case 'COMPLIANCE_ISSUE':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'KIT_COMPLETED':
        return <CheckCircle fontSize="small" />;
      case 'QUALIFIED':
      case 'APPROVED':
        return <TrendingUp fontSize="small" />;
      default:
        return <Pending fontSize="small" />;
    }
  };

    const vendorIdInfo = (
    <Typography variant="body2" color="rgba(255, 255, 255, 0.9)">
      Vendor ID: <strong>{user?.vendorId || 'N/A'}</strong>
    </Typography>
  );

  return (
    <VendorAuthGuard>
      <PortalLayout
        title="Healthcare Lead Management"
        userRole="vendor"
        additionalHeaderInfo={vendorIdInfo}
        error={error}
        success={success}
        onErrorClose={() => setError(null)}
        onSuccessClose={() => setSuccess(null)}
      >

          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab
                icon={<Assignment />}
                iconPosition="start"
                label="Lead Management"
              />
              {isMainVendor && (
                <Tab
                  icon={<AccountTreeIcon />}
                  iconPosition="start"
                  label="Downline Management"
                />
              )}
            </Tabs>
          </Paper>

          {/* Tab 1: Lead Management */}
          <TabPanel value={tabValue} index={0}>
            {/* Metrics Cards */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
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
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
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
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Accepted Denials
                    </Typography>
                    <Typography variant="h4" component="div">
                      {metrics.acceptedDenials}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Denied applications accepted
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
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
              </Grid>
            </Grid>

            {/* Lead Management Section */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom fontWeight="bold">
                    Recent Leads
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Monitor leads submitted through your downline vendor forms. Vendors do not submit leads directly.
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
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 2: Downline Management - Only for Main Vendors */}
          {isMainVendor && (
            <TabPanel value={tabValue} index={1}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  Downline Vendor Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create and manage your sub-vendors with unique form links
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateDownline}
              >
                Create Downline Vendor
              </Button>
            </Box>

            {/* Downline Stats Cards */}
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Total Downlines
                    </Typography>
                    <Typography variant="h4" component="div">
                      {subVendors.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Active Downlines
                    </Typography>
                    <Typography variant="h4" component="div">
                      {subVendors.filter(v => v.isActive).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Total Downline Leads
                    </Typography>
                    <Typography variant="h4" component="div">
                      {subVendors.reduce((sum, v) => sum + (v.leads?.length || 0), 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Form Links Created
                    </Typography>
                    <Typography variant="h4" component="div">
                      {subVendors.filter(v => v.isActive).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Downline Vendors Table */}
            <Paper elevation={3}>
              <Box p={3}>
                <Typography variant="h6" gutterBottom>
                  Your Downline Vendors
                </Typography>
              </Box>
              {downlineLoading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Vendor Details</TableCell>
                        <TableCell>Codes</TableCell>
                        <TableCell>Form Link</TableCell>
                        <TableCell>Statistics</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {subVendors.map((vendor) => {
                        const stats = getSubVendorStats(vendor);
                        const formLink = getFormLink(vendor);
                        return (
                          <TableRow key={vendor.id}>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <BusinessIcon color="primary" />
                                <Box>
                                  <Typography variant="body1" fontWeight="medium">
                                    {vendor.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    ID: {vendor.id.slice(0, 8)}...
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  <strong>Code:</strong> {vendor.code}
                                </Typography>
                                <Typography variant="body2">
                                  <strong>Static:</strong> {vendor.staticCode}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Link
                                  href={formLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ fontSize: '0.75rem', maxWidth: '200px', wordBreak: 'break-all' }}
                                >
                                  {formLink}
                                </Link>
                                <Tooltip title="Copy link">
                                  <IconButton
                                    size="small"
                                    onClick={() => copyToClipboard(formLink)}
                                  >
                                    <LinkIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  Users: {stats.activeUsers}
                                </Typography>
                                <Typography variant="body2">
                                  Leads: {stats.totalLeads}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={vendor.isActive ? 'Active' : 'Inactive'}
                                color={vendor.isActive ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {format(new Date(vendor.createdAt), 'MM/dd/yyyy')}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {subVendors.length === 0 && !downlineLoading && (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary">
                    No downline vendors created yet. Create your first downline vendor to get started.
                  </Typography>
                </Box>
              )}
            </Paper>
          </TabPanel>
          )}

        {/* Create Downline Vendor Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Create New Downline Vendor
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmitDownline)}>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={3}>
              <Alert severity="info">
                You are creating a sub-vendor under your vendor account.
                They will get their own unique form link for lead submissions.
              </Alert>

              <TextField
                label="Vendor Name"
                fullWidth
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Vendor Code (Optional)"
                    placeholder="Auto-generated if left empty"
                    fullWidth
                    {...register('code')}
                    error={!!errors.code}
                    helperText={errors.code?.message || "Will be auto-generated based on vendor name"}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Static Code (Optional)"
                    placeholder="Auto-generated if left empty"
                    fullWidth
                    {...register('staticCode')}
                    error={!!errors.staticCode}
                    helperText={errors.staticCode?.message || "Will be auto-generated based on vendor name"}
                  />
                </Grid>
              </Grid>

              <FormControlLabel
                control={
                  <Switch
                    checked={watch('isActive')}
                    onChange={(e) => setValue('isActive', e.target.checked)}
                  />
                }
                label="Active"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <CircularProgress size={20} />
              ) : (
                'Create Downline Vendor'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      </PortalLayout>
    </VendorAuthGuard>
  );
}
