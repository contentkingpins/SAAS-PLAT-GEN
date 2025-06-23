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
  Alert,
  Snackbar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  Assessment,
  Upload,
  CheckCircle,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import useStore from '@/store/useStore';
import { apiClient } from '@/lib/api/client';

import { VendorManagement } from '@/components/admin/VendorManagement';
import { AgentManagement } from '@/components/admin/AgentManagement';
import { VendorMetricsDisplay } from '@/components/admin/VendorMetricsDisplay';
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
  const [tabValue, setTabValue] = useState(0);
  const { user, isAuthenticated, logout } = useStore();
  
  // Add token validation on component mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        // Test the token by making a simple API call
        await apiClient.get('/analytics/dashboard?range=week');
      } catch (error: any) {
        if (error.status === 401) {
          console.warn('Invalid token detected, logging out user');
          logout();
          window.location.href = '/login';
        }
      }
    };

    if (isAuthenticated && user?.role === 'admin') {
      validateToken();
    }
  }, [isAuthenticated, user, logout]);
  
  // Upload state management
  const [uploadStates, setUploadStates] = useState({
    'doctor-approval': { loading: false, message: '', error: false },
    'shipping-report': { loading: false, message: '', error: false },
    'kit-return': { loading: false, message: '', error: false },
    'master-data': { loading: false, message: '', error: false },
    'bulk-lead': { loading: false, message: '', error: false },
    'cleanup': { loading: false, message: '', error: false }
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [resultsDialog, setResultsDialog] = useState(false);

  // WebSocket removed - using periodic refresh instead for AWS Amplify compatibility

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // File upload handler
  const handleCleanupBulkVendors = async () => {
    setUploadStates(prev => ({
      ...prev,
      'cleanup': { loading: true, message: '', error: false }
    }));

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/cleanup-bulk-vendors', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = 'Cleanup failed';
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorResult = await response.json();
            errorMessage = errorResult.error || errorResult.message || 'Cleanup failed';
          } else {
            errorMessage = `Cleanup failed: ${response.status} ${response.statusText}`;
          }
        } catch (parseError) {
          errorMessage = `Cleanup failed: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      setUploadStates(prev => ({
        ...prev,
        'cleanup': { 
          loading: false, 
          message: result.message || 'Bulk vendor cleanup completed successfully!', 
          error: false 
        }
      }));

    } catch (error: any) {
      console.error('Cleanup error:', error);
      setUploadStates(prev => ({
        ...prev,
        'cleanup': { loading: false, message: error.message, error: true }
      }));
    }
  };

  const handleFileUpload = async (uploadType: string, file: File) => {
    // Update loading state
    setUploadStates(prev => ({
      ...prev,
      [uploadType]: { loading: true, message: 'Uploading...', error: false }
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Get JWT token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        const errorMsg = 'Authentication token not found';
        throw { message: errorMsg };
      }

      // Determine upload endpoint based on type
      let endpoint = '';
      switch (uploadType) {
        case 'bulk-lead':
          endpoint = '/api/admin/uploads/bulk-lead';
          break;
        case 'doctor-approval':
          endpoint = '/api/admin/uploads/doctor-approval';
          break;
        case 'shipping-report':
          endpoint = '/api/admin/uploads/shipping-report';
          break;
        case 'kit-return':
          endpoint = '/api/admin/uploads/kit-return';
          break;
        case 'master-data':
          endpoint = '/api/admin/uploads/master-data';
          break;
        case 'bulk-lead':
          endpoint = '/api/admin/uploads/bulk-lead';
          break;
        default:
          const invalidTypeMsg = 'Invalid upload type';
          throw { message: invalidTypeMsg };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      // Handle response based on status
      if (!response.ok) {
        let errorMessage = 'Upload failed';
        
        try {
          // Try to parse JSON error response
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorResult = await response.json();
            errorMessage = errorResult.error || errorResult.message || 'Upload failed';
          } else {
            // If not JSON, use status text or generic message
            errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
          }
        } catch (parseError) {
          // If JSON parsing fails, use status-based message
          errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
        }
        
        throw { message: errorMessage };
      }

      // Parse successful JSON response
      const result = await response.json();

      // Update success state
      setUploadStates(prev => ({
        ...prev,
        [uploadType]: { 
          loading: false, 
          message: `Successfully processed ${result.results?.processed || 0} records`, 
          error: false 
        }
      }));

      // Show success message
      setSnackbar({
        open: true,
        message: `${file.name} uploaded successfully!`,
        severity: 'success'
      });

      // Show detailed results for master data and bulk lead uploads
      if ((uploadType === 'master-data' || uploadType === 'bulk-lead') && result.results) {
        setUploadResults(result);
        setResultsDialog(true);
      }

    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as { message: string }).message 
        : 'Unknown error occurred';
      
      // Update error state
      setUploadStates(prev => ({
        ...prev,
        [uploadType]: { loading: false, message: errorMessage, error: true }
      }));

      // Show error message
      setSnackbar({
        open: true,
        message: `Upload failed: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  // Handle file input change
  const handleFileChange = (uploadType: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setSnackbar({
          open: true,
          message: 'Please select a CSV file',
          severity: 'error'
        });
        return;
      }
      handleFileUpload(uploadType, file);
    }
    // Reset input value to allow re-uploading the same file
    event.target.value = '';
  };

  // Report generation functions
  const generateDailyReport = async () => {
    try {
      setSnackbar({ open: false, message: '', severity: 'success' });
      
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      // Fetch today's leads
      const response = await apiClient.get(`/admin/leads?startDate=${startOfDay}&endDate=${endOfDay}&limit=1000`);
      const leads = Array.isArray(response) ? response : (response as any)?.data || [];
      
      if (!leads || leads.length === 0) {
        setSnackbar({
          open: true,
          message: 'No leads found for today',
          severity: 'info'
        });
        return;
      }

      // Generate CSV report
      const headers = [
        'Lead ID', 'Patient Name', 'MBI', 'Phone', 'Status', 'Test Type', 
        'Vendor Name', 'Vendor Code', 'Advocate', 'Collections Agent', 
        'Created Time', 'Last Updated'
      ];
      
      const csvData = leads.map((lead: any) => [
        lead.id,
        `${lead.firstName} ${lead.lastName}`,
        lead.mbi || 'N/A',
        lead.phone || 'N/A',
        lead.status,
        lead.testType || 'N/A',
        lead.vendor?.name || 'Unknown',
        lead.vendor?.code || 'Unknown',
        lead.advocate ? `${lead.advocate.firstName} ${lead.advocate.lastName}` : 'Unassigned',
        lead.collectionsAgent ? `${lead.collectionsAgent.firstName} ${lead.collectionsAgent.lastName}` : 'Unassigned',
        new Date(lead.createdAt).toLocaleString(),
        new Date(lead.updatedAt).toLocaleString()
      ]);

      const csvContent = [headers, ...csvData]
        .map((row: any[]) => row.map((field: any) => `"${field}"`).join(','))
        .join('\n');

      // Download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `daily_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSnackbar({
        open: true,
        message: `Daily report generated successfully! ${leads.length} leads exported.`,
        severity: 'success'
      });

    } catch (error: any) {
      setSnackbar({
        open: true,
        message: `Failed to generate daily report: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const generateMonthlyReport = async () => {
    try {
      setSnackbar({ open: false, message: '', severity: 'success' });
      
      // Get this month's date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      
      // Fetch this month's leads and analytics
      const [leadsResponse, analytics] = await Promise.all([
        apiClient.get(`/admin/leads?startDate=${startOfMonth}&endDate=${endOfMonth}&limit=5000`),
        apiClient.get('/analytics/dashboard?range=month')
      ]);
      
      const leads = Array.isArray(leadsResponse) ? leadsResponse : (leadsResponse as any)?.data || [];
      
      if (!leads || leads.length === 0) {
        setSnackbar({
          open: true,
          message: 'No leads found for this month',
          severity: 'info'
        });
        return;
      }

      // Generate comprehensive monthly report
      const headers = [
        'Lead ID', 'Patient Name', 'MBI', 'Phone', 'Status', 'Test Type', 
        'Vendor Name', 'Vendor Code', 'Advocate', 'Collections Agent',
        'Advocate Disposition', 'Collections Disposition', 'Contact Attempts',
        'Created Date', 'Last Updated', 'Days in System'
      ];
      
      const csvData = leads.map((lead: any) => {
        const createdDate = new Date(lead.createdAt);
        const daysInSystem = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return [
          lead.id,
          `${lead.firstName} ${lead.lastName}`,
          lead.mbi || 'N/A',
          lead.phone || 'N/A',
          lead.status,
          lead.testType || 'N/A',
          lead.vendor?.name || 'Unknown',
          lead.vendor?.code || 'Unknown',
          lead.advocate ? `${lead.advocate.firstName} ${lead.advocate.lastName}` : 'Unassigned',
          lead.collectionsAgent ? `${lead.collectionsAgent.firstName} ${lead.collectionsAgent.lastName}` : 'Unassigned',
          lead.advocateDisposition || 'N/A',
          lead.collectionsDisposition || 'N/A',
          lead.contactAttempts || 0,
          createdDate.toLocaleDateString(),
          new Date(lead.updatedAt).toLocaleDateString(),
          daysInSystem
        ];
      });

      // Add summary statistics at the top
      const summaryData = [
        ['Report Generated', new Date().toLocaleString()],
        ['Report Period', `${new Date(startOfMonth).toLocaleDateString()} - ${new Date(endOfMonth).toLocaleDateString()}`],
        ['Total Leads', leads.length.toString()],
        ['Total Vendors', new Set(leads.map((l: any) => l.vendorId)).size.toString()],
        ['Conversion Rate', `${((analytics as any)?.conversionRates?.overallConversion * 100 || 0).toFixed(2)}%`],
        ['Qualified Leads', leads.filter((l: any) => ['QUALIFIED', 'SENT_TO_CONSULT'].includes(l.status)).length.toString()],
        ['Completed Kits', leads.filter((l: any) => l.status === 'KIT_COMPLETED').length.toString()],
        ['', ''], // Empty row separator
        ['Lead Details:', '']
      ];

      const csvContent = [
        ...summaryData.map((row: any[]) => row.map((field: any) => `"${field}"`).join(',')),
        '', // Empty line
        headers.map((field: string) => `"${field}"`).join(','),
        ...csvData.map((row: any[]) => row.map((field: any) => `"${field}"`).join(','))
      ].join('\n');

      // Download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `monthly_report_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSnackbar({
        open: true,
        message: `Monthly report generated successfully! ${leads.length} leads exported with analytics.`,
        severity: 'success'
      });

    } catch (error: any) {
      setSnackbar({
        open: true,
        message: `Failed to generate monthly report: ${error.message}`,
        severity: 'error'
      });
    }
  };

  return (
    <PortalLayout
      title="Healthcare Lead Management"
      userRole="admin"
      showConnectionStatus={false}
      showNotifications={false}
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
          <Tab
            icon={<AnalyticsIcon />}
            iconPosition="start"
            label="Vendor Metrics"
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
              <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={generateDailyReport}>
                Generate Daily Report
              </Button>
            </Paper>
          </Box>
          <Box sx={{ flex: '1 1 300px' }}>
            <Paper sx={{ p: 3, height: 200 }}>
              <Typography variant="h6" gutterBottom>
                Monthly Reports
              </Typography>
              <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={generateMonthlyReport}>
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
        
        {/* Cleanup Section */}
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="warning.main">
              🔧 Data Cleanup Tools
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Consolidate ALL existing leads under BULK_UPLOAD vendor for clean tracking
            </Typography>
            <Button 
              variant="outlined" 
              color="warning"
              onClick={handleCleanupBulkVendors}
              disabled={uploadStates['cleanup']?.loading}
            >
              {uploadStates['cleanup']?.loading ? 'Consolidating...' : 'Consolidate All Historical Data'}
            </Button>
            {uploadStates['cleanup']?.message && (
              <Alert 
                severity={uploadStates['cleanup']?.error ? 'error' : 'success'} 
                sx={{ mt: 2, textAlign: 'left' }}
              >
                {uploadStates['cleanup'].message}
              </Alert>
            )}
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 3 }}>
          {/* Bulk Lead Upload */}
          <Box sx={{ flex: '1 1 250px' }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Upload sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Bulk Lead Upload
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ mb: 2 }}>
                Import historical leads from old CRM system for data migration with smart column mapping
              </Typography>
              {uploadStates['bulk-lead'].loading && <LinearProgress sx={{ mb: 2 }} />}
              {uploadStates['bulk-lead'].message && (
                <Alert 
                  severity={uploadStates['bulk-lead'].error ? 'error' : 'success'} 
                  sx={{ mb: 2, textAlign: 'left' }}
                >
                  {uploadStates['bulk-lead'].message}
                </Alert>
              )}
              <Button 
                variant="contained" 
                component="label"
                disabled={uploadStates['bulk-lead'].loading}
                color="info"
              >
                {uploadStates['bulk-lead'].loading ? 'Processing...' : 'Upload CSV'}
                <input 
                  type="file" 
                  hidden 
                  accept=".csv" 
                  onChange={handleFileChange('bulk-lead')} 
                />
              </Button>
            </Paper>
          </Box>

          {/* Approvals and Denials */}
          <Box sx={{ flex: '1 1 250px' }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Upload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Approvals and Denials
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ mb: 2 }}>
                Upload CSV with approval/denial decisions to update lead statuses
              </Typography>
              {uploadStates['doctor-approval'].loading && <LinearProgress sx={{ mb: 2 }} />}
              {uploadStates['doctor-approval'].message && (
                <Alert 
                  severity={uploadStates['doctor-approval'].error ? 'error' : 'success'} 
                  sx={{ mb: 2, textAlign: 'left' }}
                >
                  {uploadStates['doctor-approval'].message}
                </Alert>
              )}
              <Button 
                variant="contained" 
                component="label"
                disabled={uploadStates['doctor-approval'].loading}
              >
                {uploadStates['doctor-approval'].loading ? 'Processing...' : 'Upload CSV'}
                <input 
                  type="file" 
                  hidden 
                  accept=".csv" 
                  onChange={handleFileChange('doctor-approval')} 
                />
              </Button>
            </Paper>
          </Box>
          
          {/* Outgoing Samples */}
          <Box sx={{ flex: '1 1 250px' }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Upload sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Outgoing Samples
              </Typography>
              {uploadStates['shipping-report'].loading && <LinearProgress sx={{ mb: 2 }} />}
              {uploadStates['shipping-report'].message && (
                <Alert 
                  severity={uploadStates['shipping-report'].error ? 'error' : 'success'} 
                  sx={{ mb: 2, textAlign: 'left' }}
                >
                  {uploadStates['shipping-report'].message}
                </Alert>
              )}
              <Button 
                variant="contained" 
                component="label"
                disabled={uploadStates['shipping-report'].loading}
              >
                {uploadStates['shipping-report'].loading ? 'Processing...' : 'Upload CSV'}
                <input 
                  type="file" 
                  hidden 
                  accept=".csv" 
                  onChange={handleFileChange('shipping-report')} 
                />
              </Button>
            </Paper>
          </Box>
          
          {/* Completed Samples */}
          <Box sx={{ flex: '1 1 250px' }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Upload sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Completed Samples
              </Typography>
              {uploadStates['kit-return'].loading && <LinearProgress sx={{ mb: 2 }} />}
              {uploadStates['kit-return'].message && (
                <Alert 
                  severity={uploadStates['kit-return'].error ? 'error' : 'success'} 
                  sx={{ mb: 2, textAlign: 'left' }}
                >
                  {uploadStates['kit-return'].message}
                </Alert>
              )}
              <Button 
                variant="contained" 
                component="label"
                disabled={uploadStates['kit-return'].loading}
              >
                {uploadStates['kit-return'].loading ? 'Processing...' : 'Upload CSV'}
                <input 
                  type="file" 
                  hidden 
                  accept=".csv" 
                  onChange={handleFileChange('kit-return')} 
                />
              </Button>
            </Paper>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <VendorManagement />
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        <VendorMetricsDisplay mode="admin" refreshInterval={15} />
      </TabPanel>

      {/* Upload Results Dialog */}
      <Dialog
        open={resultsDialog}
        onClose={() => setResultsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            Upload Results
          </Box>
        </DialogTitle>
        <DialogContent>
          {uploadResults && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Processing Summary
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 3 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {uploadResults.results.totalRows}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Rows
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {uploadResults.results.processed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Processed
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {uploadResults.results.created}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {uploadResults.results.updated}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Updated
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    {uploadResults.results.errors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Errors
                  </Typography>
                </Paper>
              </Box>
              
              {uploadResults.errors && uploadResults.errors.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Errors (First 10)
                  </Typography>
                  {uploadResults.errors.map((error: any, index: number) => (
                    <Alert key={index} severity="error" sx={{ mb: 1 }}>
                      <strong>Row {error.row}:</strong> {error.error}
                    </Alert>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PortalLayout>
  );
}
