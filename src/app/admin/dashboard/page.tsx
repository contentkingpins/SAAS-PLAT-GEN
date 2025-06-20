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
} from '@mui/icons-material';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import useStore from '@/store/useStore';
import { wsService } from '@/lib/utils/websocket';
import { VendorManagement } from '@/components/admin/VendorManagement';
import { AgentManagement } from '@/components/admin/AgentManagement';
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
  const { isConnected } = useStore();
  const [tabValue, setTabValue] = useState(0);
  const [notifications, setNotifications] = useState(5);
  
  // Upload state management
  const [uploadStates, setUploadStates] = useState({
    'doctor-approval': { loading: false, message: '', error: false },
    'shipping-report': { loading: false, message: '', error: false },
    'kit-return': { loading: false, message: '', error: false },
    'master-data': { loading: false, message: '', error: false },
    'bulk-lead': { loading: false, message: '', error: false }
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [resultsDialog, setResultsDialog] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    wsService.connect();
    wsService.joinRoom('admin');

    return () => {
      wsService.leaveRoom('admin');
    };
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // File upload handler
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

      const result = await response.json();

      if (!response.ok) {
        const failureMsg = result.error || 'Upload failed';
        throw { message: failureMsg };
      }

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

  return (
    <PortalLayout
      title="Healthcare Lead Management"
      userRole="admin"
      showConnectionStatus={true}
      showNotifications={true}
      notifications={notifications}
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
              <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                Generate Daily Report
              </Button>
            </Paper>
          </Box>
          <Box sx={{ flex: '1 1 300px' }}>
            <Paper sx={{ p: 3, height: 200 }}>
              <Typography variant="h6" gutterBottom>
                Monthly Reports
              </Typography>
              <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
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
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 3 }}>
          {/* Master CSV Upload */}
          <Box sx={{ flex: '1 1 250px' }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Upload sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Master CSV Data
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload a single CSV containing all patient, shipping, and status data
              </Typography>
              {uploadStates['master-data'].loading && <LinearProgress sx={{ mb: 2 }} />}
              {uploadStates['master-data'].message && (
                <Alert 
                  severity={uploadStates['master-data'].error ? 'error' : 'success'} 
                  sx={{ mb: 2, textAlign: 'left' }}
                >
                  {uploadStates['master-data'].message}
                </Alert>
              )}
              <Button 
                variant="contained" 
                component="label"
                disabled={uploadStates['master-data'].loading}
                color="secondary"
              >
                {uploadStates['master-data'].loading ? 'Processing...' : 'Upload Master CSV'}
                <input 
                  type="file" 
                  hidden 
                  accept=".csv" 
                  onChange={handleFileChange('master-data')} 
                />
              </Button>
            </Paper>
          </Box>

          {/* Bulk Lead Upload */}
          <Box sx={{ flex: '1 1 250px' }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Upload sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Bulk Lead Upload
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload historical lead data with smart column mapping
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
                {uploadStates['bulk-lead'].loading ? 'Processing...' : 'Upload Bulk Leads'}
                <input 
                  type="file" 
                  hidden 
                  accept=".csv" 
                  onChange={handleFileChange('bulk-lead')} 
                />
              </Button>
            </Paper>
          </Box>
          
          {/* Doctor Approvals */}
          <Box sx={{ flex: '1 1 250px' }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Upload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Doctor Approvals
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
          
          {/* Shipping Reports */}
          <Box sx={{ flex: '1 1 250px' }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Upload sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Shipping Reports
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
          
          {/* Kit Returns */}
          <Box sx={{ flex: '1 1 250px' }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Upload sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Kit Returns
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

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PortalLayout>
  );
}
