'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Tab,
  Tabs,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  Phone,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import useStore from '@/store/useStore';
import { apiClient } from '@/lib/api/client';
import { PortalLayout } from '@/components/layout/PortalLayout';
import LeadSearch from '@/components/search/LeadSearch';

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
  vendor: {
    name: string;
    code: string;
  };
}

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
      id={`advocate-tabpanel-${index}`}
      aria-labelledby={`advocate-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function AdvocateDashboard() {
  const { user } = useStore();
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedLead, setSelectedLead] = useState<any>(null);
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
    if (user?.id) {
      loadAdvocateData();
    }
  }, [user?.id]);

  const loadAdvocateData = async () => {
    try {
      setLoading(true);
      
      // Get leads assigned to this advocate
      const apiResponse = await apiClient.get<{success: boolean; data: Lead[]; pagination: any}>(`/api/leads?advocateId=${user?.id}&status=ADVOCATE_REVIEW,QUALIFIED,SENT_TO_CONSULT`);

      if (apiResponse?.success && apiResponse.data) {
        setLeads(apiResponse.data);
        
        // Calculate stats
        const data = apiResponse.data;
        setStats({
          totalAssigned: data.length,
          pendingReview: data.filter((l: Lead) => l.status === 'ADVOCATE_REVIEW').length,
          qualified: data.filter((l: Lead) => l.status === 'QUALIFIED').length,
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleLeadSelect = (lead: any) => {
    setSelectedLead(lead);
    console.log('Selected lead:', lead);
    // Here you could open a modal with lead details or navigate to lead page
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ADVOCATE_REVIEW': return 'warning';
      case 'QUALIFIED': return 'success';
      case 'SENT_TO_CONSULT': return 'info';
      default: return 'default';
    }
  };

  const handleStartReview = (leadId: string) => {
    console.log('Starting review for lead:', leadId);
  };

  if (loading) {
    return (
      <PortalLayout
        title="Healthcare Lead Management"
        userRole="advocate"
        subtitle="Advocate Dashboard"
      >
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </PortalLayout>
    );
  }

  const welcomeMessage = `Welcome back, ${user?.firstName}! Review and qualify leads for compliance.`;

  return (
    <PortalLayout
      title="Healthcare Lead Management"
      userRole="advocate"
      subtitle="Advocate Dashboard"
      error={error}
      onErrorClose={() => setError(null)}
    >
      <Box mb={3}>
        <Typography variant="body1" color="text.secondary">
          {welcomeMessage}
        </Typography>
      </Box>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<AssignmentIcon />} 
            label="My Leads" 
            id="advocate-tab-0"
            aria-controls="advocate-tabpanel-0"
          />
          <Tab 
            icon={<SearchIcon />} 
            label="Search Leads" 
            id="advocate-tab-1"
            aria-controls="advocate-tabpanel-1"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={selectedTab} index={0}>
        {/* Original Dashboard Content */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <AssignmentIcon color="primary" sx={{ mr: 2 }} />
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
                          disabled={lead.status !== 'ADVOCATE_REVIEW'}
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
      </TabPanel>

      <TabPanel value={selectedTab} index={1}>
        {/* New Search Functionality */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Search Existing Leads
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  When answering calls, search for existing patient records by name, phone, MBI, or location.
                </Typography>
                
                <LeadSearch 
                  onLeadSelect={handleLeadSelect}
                  placeholder="Search by patient name, phone, MBI, or location..."
                  autoFocus
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            {selectedLead && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Selected Lead
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    {selectedLead.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    MBI: {selectedLead.mbi}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Phone: {selectedLead.formattedPhone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status: {selectedLead.statusLabel}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Vendor: {selectedLead.vendor.name}
                  </Typography>
                  
                  {selectedLead.address && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Address: {selectedLead.address.full}
                    </Typography>
                  )}

                  <Alert severity="info" sx={{ mt: 2 }}>
                    Lead found! You can now assist this existing patient.
                  </Alert>
                </CardContent>
              </Card>
            )}

            {!selectedLead && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Search Tips
                  </Typography>
                  <Typography variant="body2" color="text.secondary" component="div">
                    • Start typing patient's name
                    <br />
                    • Enter phone number (any format)
                    <br />
                    • Search by MBI if available
                    <br />
                    • Try city or state name
                    <br />
                    <br />
                    Results appear instantly as you type.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </TabPanel>
    </PortalLayout>
  );
}
