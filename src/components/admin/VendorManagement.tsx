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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  AccountTree as AccountTreeIcon,
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

// Validation schema
const vendorSchema = z.object({
  name: z.string().min(2, 'Vendor name must be at least 2 characters'),
  code: z.string().min(3, 'Vendor code must be at least 3 characters'),
  staticCode: z.string().min(3, 'Static code must be at least 3 characters'),
  parentVendorId: z.string().optional(),
  isActive: z.boolean(),
});

type VendorFormData = z.infer<typeof vendorSchema>;

export function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [parentVendors, setParentVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Vendor[]>('/api/admin/vendors');
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
        await apiClient.put(`/api/admin/vendors/${editingVendor.id}`, vendorData);
        setSuccess('Vendor updated successfully');
      } else {
        await apiClient.post('/api/admin/vendors', vendorData);
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
      await apiClient.delete(`/api/admin/vendors/${vendorToDelete.id}`);
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
          Vendor Management
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

      {/* Vendor Stats Cards */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Vendors
            </Typography>
            <Typography variant="h4" component="div">
              {vendors.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Active Vendors
            </Typography>
            <Typography variant="h4" component="div">
              {vendors.filter(v => v.isActive).length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Parent Vendors
            </Typography>
            <Typography variant="h4" component="div">
              {parentVendors.length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Vendors Table */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor Details</TableCell>
                <TableCell>Codes</TableCell>
                <TableCell>Hierarchy</TableCell>
                <TableCell>Statistics</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((vendor) => {
                  const stats = getVendorStats(vendor);
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
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Add/Edit Vendor Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
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
                  label="Vendor Code"
                  fullWidth
                  {...register('code')}
                  error={!!errors.code}
                  helperText={errors.code?.message}
                />
                <TextField
                  label="Static Code"
                  fullWidth
                  {...register('staticCode')}
                  error={!!errors.staticCode}
                  helperText={errors.staticCode?.message}
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