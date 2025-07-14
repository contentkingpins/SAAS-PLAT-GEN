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
  IconButton,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Schedule,
  CheckCircle,
  Assignment,
  AccountCircle,
  ExitToApp,
  Settings,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import useStore from '@/store/useStore';
import { apiClient } from '@/lib/api/client';
import { PortalLayout } from '@/components/layout/PortalLayout';
import LeadDetailModal from '@/components/leads/LeadDetailModal';

interface Lead {
  id: string;
  mbi: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  contactAttempts: number;
  lastContactAttempt?: string;
  nextCallbackDate?: string;
  collectionsDisposition?: string;
  kitShippedDate?: string;
  createdAt: string;
}

export default function CollectionsDashboard() {
  const { user } = useStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    pendingContact: 0,
    kitsCompleted: 0,
    callbacksScheduled: 0,
  });
  
  // Lead Detail Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCollectionsData();
    }
  }, [user?.id]);

  // Auto-refresh every 60 seconds (increased from 15) to reduce interruptions
  useEffect(() => {
    if (!user?.id) return;

    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing collections dashboard for updated lead statuses');
      loadCollectionsData();
    }, 60000); // Refresh every 60 seconds instead of 15

    return () => clearInterval(refreshInterval);
  }, [user?.id]);

  // Refresh when user returns to the tab (for immediate status updates)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        console.log('🔄 Tab became visible - refreshing collections dashboard for latest lead statuses');
        loadCollectionsData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id]);

    const loadCollectionsData = async () => {
    try {
      setLoading(true);
      
      // Get leads in collections status - API client returns data array directly
      const leadsData = await apiClient.get<Lead[]>(`leads?collectionsAgentId=${user?.id}&status=COLLECTIONS,SHIPPED`);

      if (Array.isArray(leadsData)) {
        setLeads(leadsData);
        
        // Calculate stats
        setStats({
          totalAssigned: leadsData.length,
          pendingContact: leadsData.filter((l: Lead) => !l.lastContactAttempt).length,
          kitsCompleted: leadsData.filter((l: Lead) => l.status === 'KIT_COMPLETED').length,
          callbacksScheduled: leadsData.filter((l: Lead) => l.nextCallbackDate).length,
        });
      } else {
        setLeads([]);
        setStats({
          totalAssigned: 0,
          pendingContact: 0,
          kitsCompleted: 0,
          callbacksScheduled: 0,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load collections data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COLLECTIONS': return 'warning';
      case 'SHIPPED': return 'info';
      case 'KIT_COMPLETED': return 'success';
      default: return 'default';
    }
  };

  const getDispositionColor = (disposition?: string) => {
    switch (disposition) {
      case 'KIT_COMPLETED': return 'success';
      case 'SCHEDULED_CALLBACK': return 'info';
      case 'NO_ANSWER': return 'warning';
      default: return 'default';
    }
  };

  // Call functionality removed temporarily - will be re-added with integration
  // const handleMakeCall = (leadId: string, phone: string) => {
  //   console.log('Making call to:', phone, 'for lead:', leadId);
  //   window.open(`tel:${phone}`);
  // };

  const handleMarkCompleted = async (leadId: string) => {
    try {
      await apiClient.patch(`leads/${leadId}`, {
        status: 'KIT_COMPLETED',
        collectionsDisposition: 'KIT_COMPLETED',
      });
      loadCollectionsData(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to update lead');
    }
  };

  const isDueForCallback = (nextCallbackDate?: string) => {
    if (!nextCallbackDate) return false;
    return new Date(nextCallbackDate) <= new Date();
  };

  // Lead Detail Modal Handlers
  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedLeadId(null);
  };

  const handleLeadUpdated = (updatedLead: any) => {
    console.log('Lead updated:', updatedLead);
    // Refresh collections data to show updated lead information
    loadCollectionsData();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const welcomeMessage = `Welcome back, ${user?.firstName}! Follow up on shipped kits and manage collections.`;

  return (
    <PortalLayout
      title="Healthcare Lead Management"
      userRole="collections"
      subtitle="Collections Dashboard"
      error={error}
      onErrorClose={() => setError(null)}
    >
      <Box mb={3}>
        <Typography variant="body1" color="text.primary">
          {welcomeMessage}
        </Typography>
      </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Assignment color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.primary" gutterBottom fontWeight="medium">
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
                  <Schedule color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.primary" gutterBottom fontWeight="medium">
                      Pending Contact
                    </Typography>
                    <Typography variant="h4">
                      {stats.pendingContact}
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
                      Kits Completed
                    </Typography>
                    <Typography variant="h4">
                      {stats.kitsCompleted}
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
                  <Schedule color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Callbacks Scheduled
                    </Typography>
                    <Typography variant="h4">
                      {stats.callbacksScheduled}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Collections Table */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Collections Queue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click on any lead to view full patient details
              </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Lead</TableCell>
                    <TableCell>MBI</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Attempts</TableCell>
                    <TableCell>Last Contact</TableCell>
                    <TableCell>Next Callback</TableCell>
                    <TableCell>Disposition</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      onClick={() => handleLeadClick(lead.id)}
                      sx={{
                        backgroundColor: isDueForCallback(lead.nextCallbackDate)
                          ? 'rgba(255, 152, 0, 0.1)'
                          : 'inherit',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {lead.firstName} {lead.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>{lead.mbi}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {lead.phone}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={lead.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(lead.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{lead.contactAttempts}</TableCell>
                      <TableCell>
                        {lead.lastContactAttempt
                          ? new Date(lead.lastContactAttempt).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        {lead.nextCallbackDate ? (
                          <Typography
                            variant="body2"
                            color={isDueForCallback(lead.nextCallbackDate) ? 'error' : 'inherit'}
                          >
                            {new Date(lead.nextCallbackDate).toLocaleDateString()}
                          </Typography>
                        ) : (
                          'None'
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.collectionsDisposition && (
                          <Chip
                            label={lead.collectionsDisposition.replace('_', ' ').toUpperCase()}
                            color={getDispositionColor(lead.collectionsDisposition) as any}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box 
                          display="flex" 
                          gap={1}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.status === 'SHIPPED' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkCompleted(lead.id);
                              }}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {leads.length === 0 && !loading && (
              <Box textAlign="center" py={4}>
                <Typography color="text.secondary">
                  No leads in collections queue.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Lead Detail Modal */}
        <LeadDetailModal
          open={modalOpen}
          leadId={selectedLeadId}
          onClose={handleCloseModal}
          onLeadUpdated={handleLeadUpdated}
        />
    </PortalLayout>
  );
}
