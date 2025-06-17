'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiClient } from '@/lib/api/client';

interface VendorMetrics {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  totalLeads: number;
  immuneLeads: number;
  neuroLeads: number;
  deniedLeads: number;
  chasingLeads: number;
  immunePercentage: number;
  neuroPercentage: number;
  denialPercentage: number;
  chaseRate: number;
}

interface VendorMetricsDisplayProps {
  /** Whether this is for admin (all vendors) or vendor (sub-vendors only) */
  mode: 'admin' | 'vendor';
  /** Vendor ID - required for vendor mode */
  vendorId?: string;
  /** Auto-refresh interval in seconds (default: 15) */
  refreshInterval?: number;
}

export function VendorMetricsDisplay({ 
  mode, 
  vendorId, 
  refreshInterval = 15 
}: VendorMetricsDisplayProps) {
  const [metrics, setMetrics] = useState<VendorMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchMetrics = async () => {
    try {
      setError(null);
      
      let endpoint = '';
      if (mode === 'admin') {
        endpoint = '/admin/vendor-summary-metrics';
      } else if (mode === 'vendor' && vendorId) {
        endpoint = `/vendors/${vendorId}/sub-vendor-metrics`;
      } else {
        throw new Error('Invalid configuration: vendor mode requires vendorId');
      }

      const response = await apiClient.get<any>(endpoint);
      
      // Handle different response formats from the two endpoints
      let vendorData: any[] = [];
      if (mode === 'admin' && response.vendors) {
        vendorData = response.vendors;
      } else if (mode === 'vendor' && response.subVendors) {
        vendorData = response.subVendors;
      } else if (Array.isArray(response)) {
        vendorData = response;
      }

      // Transform the data to match our interface
      const transformedMetrics: VendorMetrics[] = vendorData.map((vendor: any) => ({
        vendorId: vendor.vendorId,
        vendorName: vendor.vendorName,
        vendorCode: vendor.vendorCode,
        totalLeads: vendor.totalLeads,
        immuneLeads: Math.round((vendor.immunePercentage / 100) * vendor.totalLeads),
        neuroLeads: Math.round((vendor.neuroPercentage / 100) * vendor.totalLeads),
        deniedLeads: Math.round((vendor.denialPercentage / 100) * (vendor.sentToConsult || vendor.totalLeads)),
        chasingLeads: Math.round((vendor.chaseRate / 100) * vendor.totalLeads),
        immunePercentage: vendor.immunePercentage,
        neuroPercentage: vendor.neuroPercentage,
        denialPercentage: vendor.denialPercentage,
        chaseRate: vendor.chaseRate,
      }));

      setMetrics(transformedMetrics);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Failed to fetch vendor metrics:', error);
      setError(error.message || 'Failed to fetch vendor metrics');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMetrics();
  }, [mode, vendorId]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        console.log(`🔄 Auto-refreshing ${mode} vendor metrics`);
        fetchMetrics();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [mode, vendorId, refreshInterval]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchMetrics();
  };

  const getPercentageColor = (percentage: number, isGoodHigh: boolean = false) => {
    if (isGoodHigh) {
      // For metrics where higher is better (like conversion rates)
      if (percentage >= 70) return 'success.main';
      if (percentage >= 40) return 'warning.main';
      return 'error.main';
    } else {
      // For metrics where lower is better (like denial rates)
      if (percentage <= 10) return 'success.main';
      if (percentage <= 25) return 'warning.main';
      return 'error.main';
    }
  };

  const getPercentageIcon = (percentage: number, isGoodHigh: boolean = false) => {
    const isGood = isGoodHigh ? percentage >= 40 : percentage <= 25;
    return isGood ? <TrendingUp /> : <TrendingDown />;
  };

  // Summary calculations
  const totalVendors = metrics.length;
  const totalLeads = metrics.reduce((sum, m) => sum + m.totalLeads, 0);
  const avgDenialRate = totalLeads > 0 ? 
    (metrics.reduce((sum, m) => sum + m.deniedLeads, 0) / totalLeads * 100) : 0;
  const avgChaseRate = totalLeads > 0 ? 
    (metrics.reduce((sum, m) => sum + m.chasingLeads, 0) / totalLeads * 100) : 0;

  if (loading && metrics.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading vendor metrics...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with refresh button */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {mode === 'admin' ? 'All Vendor Metrics' : 'Sub-Vendor Performance'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time performance metrics after consultation submission
            {lastUpdated && (
              <span> • Last updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
          </Typography>
        </Box>
        <Tooltip title="Refresh metrics">
          <IconButton onClick={handleManualRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Vendors
              </Typography>
              <Typography variant="h4" component="div">
                {totalVendors}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {mode === 'admin' ? 'System-wide' : 'Your downline'}
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
                {totalLeads.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                After consultation
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Denial Rate
              </Typography>
              <Typography variant="h4" component="div" color={getPercentageColor(avgDenialRate)}>
                {avgDenialRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Doctor denials
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Chase Rate
              </Typography>
              <Typography variant="h4" component="div" color={getPercentageColor(avgChaseRate)}>
                {avgChaseRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Requiring follow-up
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Metrics Table */}
      <Paper elevation={3}>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            Detailed Vendor Performance
          </Typography>
        </Box>
        
        {loading && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 1 }}>
              Updating...
            </Typography>
          </Box>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor</TableCell>
                <TableCell align="center">Total Leads</TableCell>
                <TableCell align="center">Immune %</TableCell>
                <TableCell align="center">Neuro %</TableCell>
                <TableCell align="center">Denial Rate</TableCell>
                <TableCell align="center">Chase Rate</TableCell>
                <TableCell align="center">Performance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {metrics
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((vendor) => (
                  <TableRow key={vendor.vendorId} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <BusinessIcon color="primary" fontSize="small" />
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {vendor.vendorName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {vendor.vendorCode}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body1" fontWeight="medium">
                        {vendor.totalLeads}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${vendor.immunePercentage.toFixed(1)}%`}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {vendor.immuneLeads} leads
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${vendor.neuroPercentage.toFixed(1)}%`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {vendor.neuroLeads} leads
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <Typography 
                          variant="body1" 
                          fontWeight="bold"
                          color={getPercentageColor(vendor.denialPercentage)}
                        >
                          {vendor.denialPercentage.toFixed(1)}%
                        </Typography>
                        <Box color={getPercentageColor(vendor.denialPercentage)} sx={{ fontSize: 16 }}>
                          {getPercentageIcon(vendor.denialPercentage)}
                        </Box>
                      </Box>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {vendor.deniedLeads} denied
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <Typography 
                          variant="body1" 
                          fontWeight="bold"
                          color={getPercentageColor(vendor.chaseRate)}
                        >
                          {vendor.chaseRate.toFixed(1)}%
                        </Typography>
                        <Box color={getPercentageColor(vendor.chaseRate)} sx={{ fontSize: 16 }}>
                          {getPercentageIcon(vendor.chaseRate)}
                        </Box>
                      </Box>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {vendor.chasingLeads} chasing
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {vendor.totalLeads === 0 ? (
                        <Chip label="No Data" size="small" color="default" />
                      ) : vendor.denialPercentage <= 10 && vendor.chaseRate <= 15 ? (
                        <Chip label="Excellent" size="small" color="success" />
                      ) : vendor.denialPercentage <= 25 && vendor.chaseRate <= 30 ? (
                        <Chip label="Good" size="small" color="primary" />
                      ) : vendor.denialPercentage <= 40 && vendor.chaseRate <= 45 ? (
                        <Chip label="Fair" size="small" color="warning" />
                      ) : (
                        <Chip label="Needs Attention" size="small" color="error" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={metrics.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {metrics.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <BusinessIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No vendor metrics available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === 'admin' 
              ? 'No vendors have leads that have been sent to consultation yet.' 
              : 'No sub-vendors have leads that have been sent to consultation yet.'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
} 