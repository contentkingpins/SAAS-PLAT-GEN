'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Badge,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Grid,
  LinearProgress,
  Paper
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Notifications as NotificationIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  WifiOff as DisconnectedIcon,
  Wifi as ConnectedIcon
} from '@mui/icons-material';

interface MBIAlert {
  id?: string;
  alertId?: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  leadId: string;
  vendorId: string;
  message: string;
  metadata: any;
  timestamp: Date;
  isAcknowledged?: boolean;
}

interface ServerStats {
  connectedClients: number;
  activeRooms: number;
  uptime: number;
  timestamp: Date;
}

interface BulkCheckProgress {
  processed: number;
  total: number;
  percentage: number;
  timestamp: Date;
}

const MBIAlertDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(true); // Always connected since no WebSocket
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<MBIAlert | null>(null);
  const [showAckDialog, setShowAckDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [bulkCheckProgress, setBulkCheckProgress] = useState<BulkCheckProgress | null>(null);
  const [isBulkChecking, setIsBulkChecking] = useState(false);

  useEffect(() => {
    // Set connected state to true since we're not using WebSocket
    setIsConnected(true);
  }, []);

  const refreshAlerts = () => {
    // Placeholder for future API call to fetch alerts
    console.log('Refreshing alerts...');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <WarningIcon />;
      case 'MEDIUM':
      case 'LOW':
        return <NotificationIcon />;
      default:
        return <NotificationIcon />;
    }
  };

  const handleAcknowledgeAlert = (alert: MBIAlert) => {
    setSelectedAlert(alert);
    setShowAckDialog(true);
  };

  const confirmAcknowledge = () => {
    if (selectedAlert && selectedAlert.alertId) {
      // Placeholder for future API call to acknowledge the alert
      console.log('Acknowledging alert...');
    }
    setShowAckDialog(false);
    setSelectedAlert(null);
  };

  const startBulkDuplicateCheck = () => {
    // Placeholder for future API call to start a bulk duplicate check
    console.log('Starting bulk duplicate check...');
  };

  const requestMetrics = () => {
    // Placeholder for future API call to request metrics
    console.log('Requesting metrics...');
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      month: 'short',
      day: 'numeric'
    }).format(timestamp);
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🚨 MBI Alert Dashboard
      </Typography>

      {/* Connection Status */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <ConnectedIcon color="success" />
                <Typography variant="h6" color="success.main">
                  System Active
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                AWS Amplify compatible monitoring
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Alert Statistics</Typography>
              <Typography variant="body2">
                Total Alerts: <strong>{alerts.length}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Real-time monitoring active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Control Panel */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Control Panel
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={refreshAlerts}
          >
            Refresh Alerts
          </Button>
        </Box>
      </Paper>

      {/* Alert Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                0
              </Typography>
              <Typography variant="body2">Critical</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                0
              </Typography>
              <Typography variant="body2">High</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                0
              </Typography>
              <Typography variant="body2">Medium</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                0
              </Typography>
              <Typography variant="body2">Low</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Alerts List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Alerts ({alerts.length})
          </Typography>

          {alerts.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No alerts at this time. The system is monitoring for duplicates and will display alerts here when detected.
            </Alert>
          ) : (
            <Typography color="text.secondary">
              Alerts will be displayed here when detected.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Acknowledge Dialog */}
      <Dialog open={showAckDialog} onClose={() => setShowAckDialog(false)}>
        <DialogTitle>Acknowledge Alert</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to acknowledge this alert?
          </Typography>
          {selectedAlert && (
            <Alert severity={getSeverityColor(selectedAlert.severity) as any} sx={{ mt: 2 }}>
              {selectedAlert.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAckDialog(false)}>Cancel</Button>
          <Button onClick={confirmAcknowledge} variant="contained">
            Acknowledge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="info"
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MBIAlertDashboard;
