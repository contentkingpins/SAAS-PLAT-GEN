'use client';

import React, { useEffect } from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import MBIAlertDashboard from '@/components/MBIAlertDashboard';
// WebSocket removed for AWS Amplify compatibility

const MBIAlertPage: React.FC = () => {

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            🚨 MBI Alert System - Real-time Dashboard
          </Typography>
          <Typography variant="subtitle1">
            Monitor duplicate Medicare Beneficiary Identifier (MBI) alerts in real-time.
            This system automatically detects potential duplicate patients and broadcasts
            alerts instantly to all connected administrators and advocates.
          </Typography>
        </Paper>

        <MBIAlertDashboard />
      </Box>
    </Container>
  );
};

export default MBIAlertPage;
