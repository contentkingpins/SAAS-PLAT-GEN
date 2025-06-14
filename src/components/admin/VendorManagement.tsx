'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Link,
  Tooltip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  AccountTree as AccountTreeIcon,
  Download as DownloadIcon,
  Link as LinkIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { format } from 'date-fns';

interface Vendor {
  id: string;
  name: string;
  code: string;
  staticCode: string;
  parentVendorId?: string;
  parentVendor?: Vendor;
  subVendors: Vendor[];
  isActive: boolean;
  users: { id: string; email: string; firstName: string; lastName: string; }[];
  leads: { id: string; status: string; }[];
  createdAt: string;
  updatedAt: string;
}

interface Lead {
  id: string;
  mbi: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  testType?: string;
  vendorId: string;
  vendor: {
    id: string;
    name: string;
    code: string;
  };
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Validation schema
const vendorSchema = z.object({
  name: z.string().min(2, 'Vendor name must be at least 2 characters'),
  code: z.string().min(3, 'Vendor code must be at least 3 characters').optional(),
  staticCode: z.string().min(3, 'Static code must be at least 3 characters').optional(),
  parentVendorId: z.string().optional(),
  isActive: z.boolean(),
});

type VendorFormData = z.infer<typeof vendorSchema>;

export function VendorManagement() {
  const [tabValue, setTabValue] = useState(0);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [parentVendors, setParentVendors] = useState<Vendor[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

  // Pagination
  const [vendorPage, setVendorPage] = useState(0);
  const [vendorRowsPerPage, setVendorRowsPerPage] = useState(10);
  const [leadsPage, setLeadsPage] = useState(0);
  const [leadsRowsPerPage, setLeadsRowsPerPage] = useState(25);

  // Filtering
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (tabValue === 1) {
      fetchAllLeads();
    }
  }, [tabValue]);

  useEffect(() => {
    applyFilters();
  }, [allLeads, selectedVendor, startDate, endDate, statusFilter]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Vendor[]>('/admin/vendors');
      setVendors(data || []);

      // Filter for parent vendors (no parentVendorId)
      const parents = (data || []).filter((v: Vendor) => !v.parentVendorId);
      setParentVendors(parents);
    } catch (error: any) {
      setError('Failed to fetch vendors: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLeads = async () => {
    try {
      setLeadsLoading(true);
      const data = await apiClient.get<Lead[]>('/admin/leads');
      setAllLeads(data || []);
    } catch (error: any) {
      setError('Failed to fetch leads: ' + error.message);
    } finally {
      setLeadsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allLeads];

    if (selectedVendor && selectedVendor !== 'all') {
      filtered = filtered.filter(lead => lead.vendorId === selectedVendor);
    }

    if (startDate) {
      filtered = filtered.filter(lead => new Date(lead.createdAt) >= new Date(startDate));
    }

    if (endDate) {
      filtered = filtered.filter(lead => new Date(lead.createdAt) <= new Date(endDate));
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateVendor = () => {
    setEditingVendor(null);
    reset({
      name: '',
      code: '',
      staticCode: '',
      parentVendorId: '',
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    reset({
      name: vendor.name,
      code: vendor.code,
      staticCode: vendor.staticCode,
      parentVendorId: vendor.parentVendorId || '',
      isActive: vendor.isActive,
    });
    setDialogOpen(true);
  };

  const handleDeleteVendor = (vendor: Vendor) => {
    setVendorToDelete(vendor);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: VendorFormData) => {
    try {
      setError(null);

      const vendorData = {
        ...data,
        parentVendorId: data.parentVendorId || null,
      };

      if (editingVendor) {
        await apiClient.put(`/admin/vendors/${editingVendor.id}`, vendorData);
        setSuccess('Vendor updated successfully');
      } else {
        await apiClient.post('/admin/vendors', vendorData);
        setSuccess('Vendor created successfully');
      }

      setDialogOpen(false);
      fetchVendors();
    } catch (error: any) {
      setError(error.message || 'Failed to save vendor');
    }
  };

  const confirmDelete = async () => {
    if (!vendorToDelete) return;

    try {
      await apiClient.delete(`/admin/vendors/${vendorToDelete.id}`);
      setSuccess('Vendor deleted successfully');
      setDeleteDialogOpen(false);
      setVendorToDelete(null);
      fetchVendors();
    } catch (error: any) {
      setError(error.message || 'Failed to delete vendor');
    }
  };

  const getVendorStats = (vendor: Vendor) => {
    const totalLeads = vendor.leads?.length || 0;
    const activeUsers = vendor.users?.filter(u => u).length || 0;
    const subVendorCount = vendor.subVendors?.length || 0;

    return { totalLeads, activeUsers, subVendorCount };
  };

  const getFormLink = (vendor: Vendor) => {
    // Generate the form submission link for vendors
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/form/${vendor.code}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Link copied to clipboard!');
  };

  const exportToCSV = () => {
    const headers = ['Lead ID', 'Patient Name', 'MBI', 'Phone', 'Status', 'Test Type', 'Vendor Name', 'Vendor Code', 'Created Date'];
    const csvData = filteredLeads.map(lead => [
      lead.id,
      `${lead.firstName} ${lead.lastName}`,
      lead.mbi,
      lead.phone,
      lead.status,
      lead.testType || 'N/A',
      lead.vendor?.name || 'Unknown',
      lead.vendor?.code || 'Unknown',
      format(new Date(lead.createdAt), 'MM/dd/yyyy HH:mm')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      const fileName = `leads_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const statusOptions = [
    'SUBMITTED',
    'ADVOCATE_REVIEW',
    'QUALIFIED',
    'SENT_TO_CONSULT',
    'APPROVED',
    'READY_TO_SHIP',
    'SHIPPED',
    'COLLECTIONS',
    'KIT_COMPLETED',
    'RETURNED'
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Vendor Management & Lead Reports
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateVendor}
        >
          Add New Vendor
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab
            icon={<BusinessIcon />}
            iconPosition="start"
            label="Vendor Management"
          />
          <Tab
            icon={<AssignmentIcon />}
            iconPosition="start"
            label="All Leads & Reports"
          />
        </Tabs>
      </Paper>

      {/* Tab 1: Vendor Management */}
      <TabPanel value={tabValue} index={0}>
        {/* Vendor Stats Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Vendors
                </Typography>
                <Typography variant="h4" component="div">
                  {vendors.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Active Vendors
                </Typography>
                <Typography variant="h4" component="div">
                  {vendors.filter(v => v.isActive).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Parent Vendors
                </Typography>
                <Typography variant="h4" component="div">
                  {parentVendors.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Leads
                </Typography>
                <Typography variant="h4" component="div">
                  {vendors.reduce((sum, v) => sum + (v.leads?.length || 0), 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Vendors Table */}
        <Paper elevation={3}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Vendor Details</TableCell>
                  <TableCell>Codes</TableCell>
                  <TableCell>Form Link</TableCell>
                  <TableCell>Hierarchy</TableCell>
                  <TableCell>Statistics</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vendors
                  .slice(vendorPage * vendorRowsPerPage, vendorPage * vendorRowsPerPage + vendorRowsPerPage)
                  .map((vendor) => {
                    const stats = getVendorStats(vendor);
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
                          {vendor.parentVendor ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <AccountTreeIcon fontSize="small" />
                              <Typography variant="body2">
                                Sub of: {vendor.parentVendor.name}
                              </Typography>
                            </Box>
                          ) : stats.subVendorCount > 0 ? (
                            <Chip
                              label={`${stats.subVendorCount} sub-vendors`}
                              size="small"
                              color="info"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Independent
                            </Typography>
                          )}
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
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditVendor(vendor)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteVendor(vendor)}
                              color="error"
                              disabled={stats.totalLeads > 0}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={vendors.length}
            rowsPerPage={vendorRowsPerPage}
            page={vendorPage}
            onPageChange={(_, newPage) => setVendorPage(newPage)}
            onRowsPerPageChange={(e) => {
              setVendorRowsPerPage(parseInt(e.target.value, 10));
              setVendorPage(0);
            }}
          />
        </Paper>
      </TabPanel>

      {/* Tab 2: All Leads & Reports */}
      <TabPanel value={tabValue} index={1}>
        {/* Filter Section */}
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterIcon />
              <Typography variant="h6">Filter & Export Options</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Vendor</InputLabel>
                  <Select
                    value={selectedVendor}
                    label="Vendor"
                    onChange={(e) => setSelectedVendor(e.target.value)}
                  >
                    <MenuItem value="">All Vendors</MenuItem>
                    {vendors.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    {statusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status.replace('_', ' ').toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSelectedVendor('');
                      setStartDate('');
                      setEndDate('');
                      setStatusFilter('');
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={exportToCSV}
                    disabled={filteredLeads.length === 0}
                  >
                    Export CSV ({filteredLeads.length} leads)
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Leads Stats */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Leads
                </Typography>
                <Typography variant="h4" component="div">
                  {allLeads.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Filtered Leads
                </Typography>
                <Typography variant="h4" component="div">
                  {filteredLeads.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Unique Vendors
                </Typography>
                <Typography variant="h4" component="div">
                  {new Set(filteredLeads.map(l => l.vendorId)).size}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Completed Kits
                </Typography>
                <Typography variant="h4" component="div">
                  {filteredLeads.filter(l => l.status === 'KIT_COMPLETED').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* All Leads Table */}
        <Paper elevation={3}>
          <Box p={2}>
            <Typography variant="h6" gutterBottom>
              All Leads with Vendor Attribution
            </Typography>
          </Box>
          {leadsLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Lead ID</TableCell>
                      <TableCell>Patient</TableCell>
                      <TableCell>MBI</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Test Type</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLeads
                      .slice(leadsPage * leadsRowsPerPage, leadsPage * leadsRowsPerPage + leadsRowsPerPage)
                      .map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {lead.id.slice(0, 8)}...
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {lead.firstName} {lead.lastName}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {lead.mbi}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {lead.phone}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={lead.status.replace('_', ' ').toUpperCase()}
                              size="small"
                              color={
                                lead.status === 'KIT_COMPLETED' ? 'success' :
                                lead.status === 'QUALIFIED' ? 'info' :
                                lead.status === 'SUBMITTED' ? 'warning' : 'default'
                              }
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
                              <Typography variant="body2" color="text.secondary">
                                N/A
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {lead.vendor?.name || 'Unknown'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Code: {lead.vendor?.code || 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {format(new Date(lead.createdAt), 'MM/dd/yyyy')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredLeads.length}
                rowsPerPage={leadsRowsPerPage}
                page={leadsPage}
                onPageChange={(_, newPage) => setLeadsPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setLeadsRowsPerPage(parseInt(e.target.value, 10));
                  setLeadsPage(0);
                }}
              />
            </>
          )}
        </Paper>
      </TabPanel>

      {/* Add/Edit Vendor Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingVendor ? 'Edit Vendor' : 'Add New Downline Vendor'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={3}>
              <TextField
                label="Vendor Name"
                fullWidth
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
              />

              <Box display="flex" gap={2}>
                <TextField
                  label="Vendor Code (Optional)"
                  placeholder="Auto-generated if left empty"
                  fullWidth
                  {...register('code')}
                  error={!!errors.code}
                  helperText={errors.code?.message || "Will be auto-generated based on vendor name"}
                />
                <TextField
                  label="Static Code (Optional)"
                  placeholder="Auto-generated if left empty"
                  fullWidth
                  {...register('staticCode')}
                  error={!!errors.staticCode}
                  helperText={errors.staticCode?.message || "Will be auto-generated based on vendor name"}
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>Parent Vendor (Optional)</InputLabel>
                <Select
                  value={watch('parentVendorId') || ''}
                  label="Parent Vendor (Optional)"
                  onChange={(e) => setValue('parentVendorId', e.target.value)}
                >
                  <MenuItem value="">
                    <em>None - Independent Vendor</em>
                  </MenuItem>
                  {parentVendors
                    .filter(v => v.id !== editingVendor?.id)
                    .map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.code})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={watch('isActive')}
                    onChange={(e) => setValue('isActive', e.target.checked)}
                  />
                }
                label="Active"
              />

              {!editingVendor && (
                <Alert severity="info">
                  After creating the vendor, you'll get a unique form link that vendors can use to submit leads.
                </Alert>
              )}
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
              ) : editingVendor ? (
                'Update Vendor'
              ) : (
                'Create Vendor'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete vendor "{vendorToDelete?.name}"?
            This action cannot be undone.
          </Typography>
          {vendorToDelete && getVendorStats(vendorToDelete).totalLeads > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This vendor has leads associated with it and cannot be deleted.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={vendorToDelete ? getVendorStats(vendorToDelete).totalLeads > 0 : false}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
