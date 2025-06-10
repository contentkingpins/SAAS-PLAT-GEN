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
import { useWebSocket } from '@/lib/utils/websocket';

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
  const [alerts, setAlerts] = useState<MBIAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<MBIAlert | null>(null);
  const [showAckDialog, setShowAckDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [bulkCheckProgress, setBulkCheckProgress] = useState<BulkCheckProgress | null>(null);
  const [isBulkChecking, setIsBulkChecking] = useState(false);

  const { subscribe, send } = useWebSocket();

  useEffect(() => {
    // Subscribe to WebSocket events
    const unsubscribeConnected = subscribe('connected', (data: any) => {
      setIsConnected(true);
      setSnackbarMessage('🔗 Connected to real-time alert system');
      setSnackbarOpen(true);
      console.log('Connected to WebSocket:', data);
      
      // Authenticate as admin user
      send('authenticate', {
        userId: 'admin-user',
        userRole: 'admin',
        vendorId: null
      });
    });

    const unsubscribeAuth = subscribe('authenticated', (data: any) => {
      console.log('✅ Authenticated:', data);
      setSnackbarMessage('✅ Authenticated as admin');
      setSnackbarOpen(true);
    });

    const unsubscribeMBIAlert = subscribe('mbi_alert', (alert: MBIAlert) => {
      console.log('🚨 New MBI Alert received:', alert);
      setAlerts(prev => [{ ...alert, timestamp: new Date(alert.timestamp) }, ...prev.slice(0, 49)]);
      setSnackbarMessage(`🚨 New ${alert.severity} duplicate alert for lead ${alert.leadId}`);
      setSnackbarOpen(true);
    });

    const unsubscribeLeadAlert = subscribe('lead_alert', (alert: MBIAlert) => {
      console.log('📋 Lead-specific alert:', alert);
      setAlerts(prev => [{ ...alert, timestamp: new Date(alert.timestamp) }, ...prev.slice(0, 49)]);
    });

    const unsubscribeServerStats = subscribe('server_stats', (stats: ServerStats) => {
      setServerStats({ ...stats, timestamp: new Date(stats.timestamp) });
    });

    const unsubscribeAlertAck = subscribe('alert_acknowledged', (data: any) => {
      setAlerts(prev => prev.map(alert => 
        alert.alertId === data.alertId 
          ? { ...alert, isAcknowledged: true }
          : alert
      ));
      setSnackbarMessage('✅ Alert acknowledged');
      setSnackbarOpen(true);
    });

    const unsubscribeBulkStart = subscribe('bulk_check_started', (data: any) => {
      setIsBulkChecking(true);
      setBulkCheckProgress({ processed: 0, total: 100, percentage: 0, timestamp: new Date() });
      setSnackbarMessage('🔍 Bulk duplicate check started');
      setSnackbarOpen(true);
    });

    const unsubscribeBulkProgress = subscribe('bulk_check_progress', (progress: BulkCheckProgress) => {
      setBulkCheckProgress({ ...progress, timestamp: new Date(progress.timestamp) });
    });

    const unsubscribeBulkComplete = subscribe('bulk_check_completed', (data: any) => {
      setIsBulkChecking(false);
      setBulkCheckProgress(null);
      setSnackbarMessage(`✅ Bulk check completed: ${data.duplicatesFound} duplicates found`);
      setSnackbarOpen(true);
    });

    const unsubscribeDisconnect = subscribe('disconnect', () => {
      setIsConnected(false);
      setSnackbarMessage('❌ Disconnected from alert system');
      setSnackbarOpen(true);
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeConnected();
      unsubscribeAuth();
      unsubscribeMBIAlert();
      unsubscribeLeadAlert();
      unsubscribeServerStats();
      unsubscribeAlertAck();
      unsubscribeBulkStart();
      unsubscribeBulkProgress();
      unsubscribeBulkComplete();
      unsubscribeDisconnect();
    };
  }, [subscribe, send]);

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
      send('acknowledge_alert', {
        alertId: selectedAlert.alertId,
        userId: 'admin-user'
      });
    }
    setShowAckDialog(false);
    setSelectedAlert(null);
  };

  const startBulkDuplicateCheck = () => {
    send('request_bulk_duplicate_check', {
      vendorId: 'all'
    });
  };

  const requestMetrics = () => {
    send('request_metrics', {
      range: 'day'
    });
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
        🚨 Real-time MBI Alert Dashboard
      </Typography>

      {/* Connection Status & Server Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                {isConnected ? (
                  <>
                    <ConnectedIcon color="success" />
                    <Typography variant="h6" color="success.main">
                      Connected
                    </Typography>
                  </>
                ) : (
                  <>
                    <DisconnectedIcon color="error" />
                    <Typography variant="h6" color="error.main">
                      Disconnected
                    </Typography>
                  </>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                WebSocket connection status
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Server Stats</Typography>
              {serverStats ? (
                <Box>
                  <Typography variant="body2">
                    Connected Clients: <strong>{serverStats.connectedClients}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Active Rooms: <strong>{serverStats.activeRooms}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Uptime: <strong>{formatUptime(serverStats.uptime)}</strong>
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No server stats available
                </Typography>
              )}
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
            onClick={requestMetrics}
            disabled={!isConnected}
          >
            Request Metrics
          </Button>
          <Button
            variant="outlined"
            onClick={startBulkDuplicateCheck}
            disabled={!isConnected || isBulkChecking}
          >
            {isBulkChecking ? 'Running Bulk Check...' : 'Start Bulk Duplicate Check'}
          </Button>
        </Box>

        {/* Bulk Check Progress */}
        {bulkCheckProgress && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Bulk Duplicate Check Progress: {bulkCheckProgress.percentage}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={bulkCheckProgress.percentage} 
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {bulkCheckProgress.processed} / {bulkCheckProgress.total} processed
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Alert Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {alerts.filter(a => a.severity === 'CRITICAL').length}
              </Typography>
              <Typography variant="body2">Critical</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {alerts.filter(a => a.severity === 'HIGH').length}
              </Typography>
              <Typography variant="body2">High</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {alerts.filter(a => a.severity === 'MEDIUM').length}
              </Typography>
              <Typography variant="body2">Medium</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {alerts.filter(a => a.severity === 'LOW').length}
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
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              No alerts received yet. The system is monitoring for duplicates...
            </Typography>
          ) : (
            <List>
              {alerts.map((alert, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {getSeverityIcon(alert.severity)}
                        <Chip
                          label={alert.severity}
                          color={getSeverityColor(alert.severity) as any}
                          size="small"
                        />
                        <Typography variant="subtitle2">
                          Lead {alert.leadId}
                        </Typography>
                        {alert.isAcknowledged && (
                          <Chip
                            label="Acknowledged"
                            color="success"
                            size="small"
                            icon={<CheckIcon />}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {alert.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(alert.timestamp)} • Vendor: {alert.vendorId}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {!alert.isAcknowledged && (
                      <Button
                        size="small"
                        onClick={() => handleAcknowledgeAlert(alert)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
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
