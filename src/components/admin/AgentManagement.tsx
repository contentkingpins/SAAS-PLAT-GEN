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
  Tabs,
  Tab,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AdminPanelSettings as AdminIcon,
  Business as BusinessIcon,
  Support as SupportIcon,
  AccountBalance as CollectionsIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import { format } from 'date-fns';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'VENDOR' | 'ADVOCATE' | 'COLLECTIONS';
  isActive: boolean;
  vendorId?: string;
  vendor?: {
    id: string;
    name: string;
    code: string;
  };
  teamId?: string;
  team?: {
    id: string;
    name: string;
    type: string;
  };
  _count: {
    leadsAsAdvocate: number;
    leadsAsCollections: number;
    contactAttempts: number;
    callbacks: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Vendor {
  id: string;
  name: string;
  code: string;
}

interface Team {
  id: string;
  name: string;
  type: string;
  _count: {
    members: number;
  };
}

// Validation schema
const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'VENDOR', 'ADVOCATE', 'COLLECTIONS']),
  vendorId: z.string().optional(),
  teamId: z.string().optional(),
  isActive: z.boolean(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type UserFormData = z.infer<typeof userSchema>;

export function AgentManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, vendorsData, teamsData] = await Promise.all([
        apiClient.get<User[]>('/admin/users'),
        apiClient.get<Vendor[]>('/admin/vendors'),
        apiClient.get<Team[]>('/admin/teams'),
      ]);
      
      setUsers(usersData);
      setVendors(vendorsData);
      setTeams(teamsData);
    } catch (error: any) {
      setError('Failed to fetch data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    reset({
      email: '',
      firstName: '',
      lastName: '',
      role: 'ADVOCATE',
      vendorId: '',
      teamId: '',
      isActive: true,
      password: '',
    });
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      vendorId: user.vendorId || '',
      teamId: user.teamId || '',
      isActive: user.isActive,
      password: '', // Don't pre-fill password for editing
    });
    setDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setError(null);
      
      const userData: any = {
        ...data,
        vendorId: data.vendorId || null,
        teamId: data.teamId || null,
      };

      if (editingUser) {
        // For updates, only send password if it's provided
        if (!data.password) {
          const { password, ...userDataWithoutPassword } = userData;
          await apiClient.put(`/admin/users/${editingUser.id}`, userDataWithoutPassword);
        } else {
          await apiClient.put(`/admin/users/${editingUser.id}`, userData);
        }
        setSuccess('User updated successfully');
      } else {
        await apiClient.post('/admin/users', userData);
        setSuccess('User created successfully');
      }
      
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      setError(error.message || 'Failed to save user');
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await apiClient.delete(`/admin/users/${userToDelete.id}`);
      setSuccess('User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (error: any) {
      setError(error.message || 'Failed to delete user');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <AdminIcon />;
      case 'VENDOR': return <BusinessIcon />;
      case 'ADVOCATE': return <SupportIcon />;
      case 'COLLECTIONS': return <CollectionsIcon />;
      default: return <PersonIcon />;
    }
  };

  const getRoleColor = (role: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'VENDOR': return 'primary';
      case 'ADVOCATE': return 'info';
      case 'COLLECTIONS': return 'warning';
      default: return 'default';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesSearch = !searchTerm || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRole && matchesSearch;
  });

  const getUserStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const admins = users.filter(u => u.role === 'ADMIN').length;
    const advocates = users.filter(u => u.role === 'ADVOCATE').length;
    const collections = users.filter(u => u.role === 'COLLECTIONS').length;
    const vendors = users.filter(u => u.role === 'VENDOR').length;
    
    return { totalUsers, activeUsers, admins, advocates, collections, vendors };
  };

  const stats = getUserStats();

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
          Agent Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateUser}
        >
          Add New User
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

      {/* Stats Cards */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Card sx={{ minWidth: 160 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Users
            </Typography>
            <Typography variant="h4" component="div">
              {stats.totalUsers}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 160 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Active Users
            </Typography>
            <Typography variant="h4" component="div" color="success.main">
              {stats.activeUsers}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 160 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Advocates
            </Typography>
            <Typography variant="h4" component="div" color="info.main">
              {stats.advocates}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 160 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Collections
            </Typography>
            <Typography variant="h4" component="div" color="warning.main">
              {stats.collections}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3} alignItems="center">
        <TextField
          label="Search users"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Role</InputLabel>
          <Select
            value={roleFilter}
            label="Filter by Role"
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <MenuItem value="">All Roles</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
            <MenuItem value="VENDOR">Vendor</MenuItem>
            <MenuItem value="ADVOCATE">Advocate</MenuItem>
            <MenuItem value="COLLECTIONS">Collections</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Users Table */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User Details</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Activity Stats</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getRoleIcon(user.role)}
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        {user.vendor && (
                          <Typography variant="body2">
                            <strong>Vendor:</strong> {user.vendor.name}
                          </Typography>
                        )}
                        {user.team && (
                          <Typography variant="body2">
                            <strong>Team:</strong> {user.team.name}
                          </Typography>
                        )}
                        {!user.vendor && !user.team && (
                          <Typography variant="body2" color="text.secondary">
                            No assignment
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          Leads: {user._count.leadsAsAdvocate + user._count.leadsAsCollections}
                        </Typography>
                        <Typography variant="body2">
                          Calls: {user._count.contactAttempts}
                        </Typography>
                        <Typography variant="body2">
                          Callbacks: {user._count.callbacks}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(user.createdAt), 'MM/dd/yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user)}
                          color="error"
                          disabled={user._count.leadsAsAdvocate > 0 || user._count.leadsAsCollections > 0}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={3}>
              <Box display="flex" gap={2}>
                <TextField
                  label="First Name"
                  fullWidth
                  {...register('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />
                <TextField
                  label="Last Name"
                  fullWidth
                  {...register('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              </Box>
              
              <TextField
                label="Email"
                type="email"
                fullWidth
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                {...register('password')}
                error={!!errors.password}
                helperText={editingUser ? 'Leave blank to keep current password' : errors.password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={watch('role')}
                  label="Role"
                  onChange={(e) => setValue('role', e.target.value as any)}
                >
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="VENDOR">Vendor</MenuItem>
                  <MenuItem value="ADVOCATE">Advocate</MenuItem>
                  <MenuItem value="COLLECTIONS">Collections</MenuItem>
                </Select>
              </FormControl>

              <Box display="flex" gap={2}>
                <FormControl fullWidth>
                  <InputLabel>Vendor (Optional)</InputLabel>
                  <Select
                    value={watch('vendorId') || ''}
                    label="Vendor (Optional)"
                    onChange={(e) => setValue('vendorId', e.target.value)}
                  >
                    <MenuItem value="">
                      <em>No vendor assignment</em>
                    </MenuItem>
                    {vendors.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.name} ({vendor.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Team (Optional)</InputLabel>
                  <Select
                    value={watch('teamId') || ''}
                    label="Team (Optional)"
                    onChange={(e) => setValue('teamId', e.target.value)}
                  >
                    <MenuItem value="">
                      <em>No team assignment</em>
                    </MenuItem>
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name} ({team.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

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
              ) : editingUser ? (
                'Update User'
              ) : (
                'Create User'
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
            Are you sure you want to delete user "{userToDelete?.firstName} {userToDelete?.lastName}"?
            This action cannot be undone.
          </Typography>
          {userToDelete && (userToDelete._count.leadsAsAdvocate > 0 || userToDelete._count.leadsAsCollections > 0) && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This user has leads assigned and cannot be deleted. Please reassign their leads first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={userToDelete ? (userToDelete._count.leadsAsAdvocate > 0 || userToDelete._count.leadsAsCollections > 0) : false}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 
