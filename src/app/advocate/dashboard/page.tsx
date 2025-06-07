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
} from '@mui/material';
import { Phone, Assignment, CheckCircle, Warning } from '@mui/icons-material';
import useStore from '@/store/useStore';
import apiClient from '@/lib/api';

interface Lead {
  id: string;
  mbi: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  isDuplicate: boolean;
  hasActiveAlerts: boolean;
  createdAt: string;
}

export default function AdvocateDashboard() {
  const { user } = useStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    pendingReview: 0,
    qualified: 0,
    completedToday: 0,
  });

  useEffect(() => {
    loadAdvocateData();
  }, []);

  const loadAdvocateData = async () => {
    try {
      setLoading(true);
      
      // Get leads assigned to this advocate
      const leadsResponse = await apiClient.getLeads({
        advocateId: user?.id,
        status: 'advocate_review,qualified,sent_to_consult',
      });

      if (leadsResponse.success) {
        setLeads(leadsResponse.data || []);
        
        // Calculate stats
        const data = leadsResponse.data || [];
        setStats({
          totalAssigned: data.length,
          pendingReview: data.filter((l: Lead) => l.status === 'advocate_review').length,
          qualified: data.filter((l: Lead) => l.status === 'qualified').length,
          completedToday: data.filter((l: Lead) => 
            new Date(l.createdAt).toDateString() === new Date().toDateString()
          ).length,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load advocate data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'advocate_review': return 'warning';
      case 'qualified': return 'success';
      case 'sent_to_consult': return 'info';
      default: return 'default';
    }
  };

  const handleStartReview = (leadId: string) => {
    // Navigate to lead review page (implement as needed)
    console.log('Starting review for lead:', leadId);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Advocate Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.firstName}! Review and qualify leads for compliance.
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
                <Warning color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Pending Review
                  </Typography>
                  <Typography variant="h4">
                    {stats.pendingReview}
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
                    Qualified
                  </Typography>
                  <Typography variant="h4">
                    {stats.qualified}
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
                <Phone color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Completed Today
                  </Typography>
                  <Typography variant="h4">
                    {stats.completedToday}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Leads Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Assigned Leads
          </Typography>
          
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Lead</TableCell>
                  <TableCell>MBI</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Alerts</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {lead.firstName} {lead.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>{lead.mbi}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>
                      <Chip
                        label={lead.status.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(lead.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {lead.isDuplicate && (
                        <Chip label="Duplicate" color="error" size="small" sx={{ mr: 1 }} />
                      )}
                      {lead.hasActiveAlerts && (
                        <Chip label="Alert" color="warning" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleStartReview(lead.id)}
                        disabled={lead.status !== 'advocate_review'}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {leads.length === 0 && !loading && (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                No leads assigned yet.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
} 