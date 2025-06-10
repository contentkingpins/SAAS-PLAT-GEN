'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
} from '@mui/material';
import { ExpandMore, CheckCircle, Error, Warning } from '@mui/icons-material';
import { apiClient, TEST_CREDENTIALS } from '@/lib/api/client';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export default function TestApiPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const updateTestResult = (name: string, status: 'success' | 'error', message: string, data?: any) => {
    setTestResults(prev => prev.map(test => 
      test.name === name 
        ? { ...test, status, message, data }
        : test
    ));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    const tests: TestResult[] = [
      { name: 'System Status Check', status: 'pending', message: 'Checking backend status...' },
      { name: 'Admin Login', status: 'pending', message: 'Testing admin authentication...' },
      { name: 'Get Users (Admin)', status: 'pending', message: 'Testing user management...' },
      { name: 'Get Vendors', status: 'pending', message: 'Testing vendor endpoints...' },
      { name: 'Get Leads', status: 'pending', message: 'Testing lead management...' },
      { name: 'Dashboard Analytics', status: 'pending', message: 'Testing analytics endpoint...' },
    ];
    
    setTestResults(tests);

    try {
      // Test 1: System Status
      try {
        const statusResponse = await apiClient.get('/api/analytics/dashboard');
        updateTestResult('System Status Check', 'success', 'Backend system is operational', statusResponse);
      } catch (err: any) {
        updateTestResult('System Status Check', 'error', err.message);
      }

      // Test 2: Admin Login
      try {
        const loginResponse = await apiClient.login(
          TEST_CREDENTIALS.admin.email, 
          TEST_CREDENTIALS.admin.password
        );
        
        if (loginResponse.success && loginResponse.token) {
          setAuthToken(loginResponse.token);
          updateTestResult('Admin Login', 'success', 'Authentication successful', {
            user: loginResponse.user,
            hasToken: !!loginResponse.token
          });
        } else {
          updateTestResult('Admin Login', 'error', 'Login failed - no token received');
        }
      } catch (err: any) {
        updateTestResult('Admin Login', 'error', err.message);
      }

      // Test 3: Get Users (Admin only)
      try {
        const usersResponse = await apiClient.get('/api/admin/users');
        const userCount = Array.isArray(usersResponse) ? usersResponse.length : 0;
        updateTestResult('Get Users (Admin)', 'success', `Retrieved ${userCount} users`, usersResponse);
      } catch (err: any) {
        updateTestResult('Get Users (Admin)', 'error', err.message);
      }

      // Test 4: Get Vendors
      try {
        const vendorsResponse = await apiClient.get('/api/admin/vendors');
        const vendorCount = Array.isArray(vendorsResponse) ? vendorsResponse.length : 0;
        updateTestResult('Get Vendors', 'success', `Retrieved ${vendorCount} vendors`, vendorsResponse);
      } catch (err: any) {
        updateTestResult('Get Vendors', 'error', err.message);
      }

      // Test 5: Get Leads
      try {
        const leadsResponse = await apiClient.get('/api/leads');
        const leadCount = Array.isArray(leadsResponse) ? leadsResponse.length : 0;
        updateTestResult('Get Leads', 'success', `Retrieved ${leadCount} leads`, leadsResponse);
      } catch (err: any) {
        updateTestResult('Get Leads', 'error', err.message);
      }

      // Test 6: Dashboard Analytics
      try {
        const analyticsResponse = await apiClient.get('/api/analytics/dashboard');
        updateTestResult('Dashboard Analytics', 'success', 'Analytics data retrieved', analyticsResponse);
      } catch (err: any) {
        updateTestResult('Dashboard Analytics', 'error', err.message);
      }

    } finally {
      setIsRunning(false);
    }
  };

  const testSpecificRole = async (role: 'vendor' | 'advocate' | 'collections') => {
    try {
      const creds = TEST_CREDENTIALS[role];
      const response = await apiClient.login(creds.email, creds.password);
      
      if (response.success) {
        alert(`${role} login successful! User: ${response.user.firstName} ${response.user.lastName}`);
      }
    } catch (err: any) {
      alert(`${role} login failed: ${err.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      case 'pending': return <CircularProgress size={20} />;
      default: return <Warning color="warning" />;
    }
  };

  const successCount = testResults.filter(t => t.status === 'success').length;
  const errorCount = testResults.filter(t => t.status === 'error').length;
  const pendingCount = testResults.filter(t => t.status === 'pending').length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Backend API Integration Test
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Test the integration with the Healthcare Lead Platform backend API.
      </Typography>

      {/* Test Summary */}
      {testResults.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Results Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle color="success" />
                  <Typography>{successCount} Passed</Typography>
                </Box>
              </Grid>
              <Grid item>
                <Box display="flex" alignItems="center" gap={1}>
                  <Error color="error" />
                  <Typography>{errorCount} Failed</Typography>
                </Box>
              </Grid>
              <Grid item>
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={20} />
                  <Typography>{pendingCount} Pending</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Test Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Run Tests
          </Typography>
          
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              onClick={runAllTests}
              disabled={isRunning}
              startIcon={isRunning ? <CircularProgress size={16} /> : undefined}
            >
              {isRunning ? 'Running Tests...' : 'Run All API Tests'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => testSpecificRole('vendor')}
            >
              Test Vendor Login
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => testSpecificRole('advocate')}
            >
              Test Advocate Login
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => testSpecificRole('collections')}
            >
              Test Collections Login
            </Button>
          </Box>

          {authToken && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Auth Token:</strong> {authToken.substring(0, 50)}...
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.map((test, index) => (
        <Accordion key={index} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={2} width="100%">
              {getStatusIcon(test.status)}
              <Typography variant="h6">{test.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                {test.message}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {test.data && (
              <TextField
                multiline
                rows={10}
                fullWidth
                value={JSON.stringify(test.data, null, 2)}
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* API Documentation */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backend API Information
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Base URL:</strong> https://main.d1iz6ogqp82qj7.amplifyapp.com
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Test Credentials:</strong>
          </Typography>
          
          <Grid container spacing={2}>
            {Object.entries(TEST_CREDENTIALS).map(([role, creds]) => (
              <Grid item xs={12} sm={6} md={3} key={role}>
                <Box>
                  <Typography variant="caption" display="block">
                    <strong>{role.toUpperCase()}</strong>
                  </Typography>
                  <Typography variant="body2">
                    {creds.email}
                  </Typography>
                  <Typography variant="body2">
                    Password: {creds.password}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
} 