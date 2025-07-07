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
import DragDropUpload from '../../../components/DragDropUpload';

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
    'cleanup': { loading: false, message: '', error: false },
    'reset': { loading: false, message: '', error: false }
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

  const handleSystemReset = async () => {
    // Confirmation dialog
    const confirmed = window.confirm(
      '⚠️ WARNING: This will DELETE ALL leads, vendors, and related data!\n\n' +
      'This action cannot be undone. Are you absolutely sure you want to reset the entire system?\n\n' +
      'Type "RESET" to confirm:'
    );
    
    if (!confirmed) return;
    
    const confirmText = window.prompt('Type "RESET" to confirm system reset:');
    if (confirmText !== 'RESET') {
      alert('Reset cancelled - confirmation text did not match.');
      return;
    }

    setUploadStates(prev => ({
      ...prev,
      'reset': { loading: true, message: '', error: false }
    }));

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/reset-system-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = 'System reset failed';
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorResult = await response.json();
            errorMessage = errorResult.error || errorResult.message || 'System reset failed';
          } else {
            errorMessage = `System reset failed: ${response.status} ${response.statusText}`;
          }
        } catch (parseError) {
          errorMessage = `System reset failed: ${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      setUploadStates(prev => ({
        ...prev,
        'reset': { 
          loading: false, 
          message: `✅ ${result.message}\n\nDeleted ${result.summary.totalRecordsDeleted} records:\n` +
                   `• ${result.deletionStats.leads} leads\n` +
                   `• ${result.deletionStats.vendors} vendors\n` +
                   `• ${result.deletionStats.fileUploads} file uploads\n` +
                   `• ${result.deletionStats.leadAlerts} alerts\n\n` +
                   `✅ Created fresh BULK_UPLOAD vendor\n` +
                   `✅ Preserved user accounts and settings\n\n` +
                   `🎉 System is ready for clean data upload!`,
          error: false 
        }
      }));

    } catch (error: any) {
      console.error('System reset error:', error);
      setUploadStates(prev => ({
        ...prev,
        'reset': { 
          loading: false, 
          message: `❌ Error: ${error.message}`, 
          error: true 
        }
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
        
        {/* Data Management Section */}
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="warning.main">
              🔧 Data Management Tools
            </Typography>
            
            {/* Vendor Cleanup */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Vendor Consolidation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Consolidate ALL existing leads under BULK_UPLOAD vendor for clean tracking
              </Typography>
              <Button 
                variant="outlined" 
                color="warning"
                onClick={handleCleanupBulkVendors}
                disabled={uploadStates['cleanup']?.loading}
                sx={{ mr: 2 }}
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
            </Box>
            
            {/* System Reset */}
            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
              <Typography variant="subtitle2" gutterBottom color="error.main">
                ⚠️ Complete System Reset
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Clear ALL leads, vendors, and related data. Start completely fresh. 
                <strong> This cannot be undone!</strong>
              </Typography>
              <Button 
                variant="outlined" 
                color="error"
                onClick={handleSystemReset}
                disabled={uploadStates['reset']?.loading}
                startIcon={uploadStates['reset']?.loading ? <></> : <>🗑️</>}
              >
                {uploadStates['reset']?.loading ? 'Resetting System...' : 'Reset All Data'}
              </Button>
              {uploadStates['reset']?.message && (
                <Alert 
                  severity={uploadStates['reset']?.error ? 'error' : 'success'} 
                  sx={{ mt: 2, textAlign: 'left', whiteSpace: 'pre-line' }}
                >
                  {uploadStates['reset'].message}
                </Alert>
              )}
            </Box>
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 3 }}>
          {/* Bulk Lead Upload */}
          <Box sx={{ flex: '1 1 250px' }}>
            <DragDropUpload
              uploadType="bulk-lead"
              title="Bulk Lead Upload"
              description="Import historical leads from old CRM system for data migration with smart column mapping"
              color="info"
              loading={uploadStates['bulk-lead'].loading}
              message={uploadStates['bulk-lead'].message}
              error={uploadStates['bulk-lead'].error}
              onFileUpload={(file: File) => handleFileUpload('bulk-lead', file)}
              onClear={() => setUploadStates(prev => ({ ...prev, 'bulk-lead': { loading: false, message: '', error: false } }))}
            />
          </Box>

          {/* Approvals and Denials */}
          <Box sx={{ flex: '1 1 250px' }}>
            <DragDropUpload
              uploadType="doctor-approval"
              title="Approvals and Denials"
              description="Upload CSV with approval/denial decisions to update lead statuses"
              color="primary"
              loading={uploadStates['doctor-approval'].loading}
              message={uploadStates['doctor-approval'].message}
              error={uploadStates['doctor-approval'].error}
              onFileUpload={(file: File) => handleFileUpload('doctor-approval', file)}
              onClear={() => setUploadStates(prev => ({ ...prev, 'doctor-approval': { loading: false, message: '', error: false } }))}
            />
          </Box>
          
          {/* Outgoing Samples */}
          <Box sx={{ flex: '1 1 250px' }}>
            <DragDropUpload
              uploadType="shipping-report"
              title="Outgoing Samples"
              description="Upload CSV with outgoing sample tracking information"
              color="warning"
              loading={uploadStates['shipping-report'].loading}
              message={uploadStates['shipping-report'].message}
              error={uploadStates['shipping-report'].error}
              onFileUpload={(file: File) => handleFileUpload('shipping-report', file)}
              onClear={() => setUploadStates(prev => ({ ...prev, 'shipping-report': { loading: false, message: '', error: false } }))}
            />
          </Box>
          
          {/* Completed Samples */}
          <Box sx={{ flex: '1 1 250px' }}>
            <DragDropUpload
              uploadType="kit-return"
              title="Completed Samples"
              description="Upload CSV with completed sample and kit return information"
              color="success"
              loading={uploadStates['kit-return'].loading}
              message={uploadStates['kit-return'].message}
              error={uploadStates['kit-return'].error}
              onFileUpload={(file: File) => handleFileUpload('kit-return', file)}
              onClear={() => setUploadStates(prev => ({ ...prev, 'kit-return': { loading: false, message: '', error: false } }))}
            />
          </Box>
          
          {/* Master Data Upload */}
          <Box sx={{ flex: '1 1 250px' }}>
            <DragDropUpload
              uploadType="master-data"
              title="Master Data Upload"
              description="Upload CSV with vendor master data and configuration"
              color="secondary"
              loading={uploadStates['master-data'].loading}
              message={uploadStates['master-data'].message}
              error={uploadStates['master-data'].error}
              onFileUpload={(file: File) => handleFileUpload('master-data', file)}
              onClear={() => setUploadStates(prev => ({ ...prev, 'master-data': { loading: false, message: '', error: false } }))}
            />
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
