'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { apiClient } from '@/lib/api/client';
import useStore from '@/store/useStore';

interface LeadDetailModalProps {
  open: boolean;
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated?: (updatedLead: any) => void;
}

interface LeadDetail {
  id: string;
  mbi: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  vendorId: string;
  vendorCode: string;
  subVendorId?: string;
  status: string;
  testType?: string;
  isDuplicate: boolean;
  hasActiveAlerts: boolean;
  advocateId?: string;
  advocateDisposition?: string;
  advocateNotes?: string;
  advocateReviewedAt?: string;
  collectionsAgentId?: string;
  collectionsDisposition?: string;
  collectionsNotes?: string;
  contactAttempts: number;
  lastContactAttempt?: string;
  nextCallbackDate?: string;
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: string;
    name: string;
    code: string;
  };
  advocate?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  collectionsAgent?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  complianceChecklist?: any;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    createdAt: string;
  }>;
}

const ADVOCATE_DISPOSITIONS = [
  { value: 'DOESNT_QUALIFY', label: "Doesn't Qualify", color: 'error' },
  { value: 'COMPLIANCE_ISSUE', label: 'Compliance Issue', color: 'warning' },
  { value: 'PATIENT_DECLINED', label: 'Patient Declined', color: 'info' },
  { value: 'CALL_BACK', label: 'Call Back Required', color: 'warning' },
  { value: 'CONNECTED_TO_COMPLIANCE', label: 'Connected to Compliance', color: 'success' },
  { value: 'CALL_DROPPED', label: 'Call Dropped', color: 'warning' },
  { value: 'DUPE', label: 'Duplicate Lead', color: 'error' },
];

const STATUS_OPTIONS = [
  { value: 'ADVOCATE_REVIEW', label: 'Under Review' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'SENT_TO_CONSULT', label: 'Sent to Consult' },
];

export default function LeadDetailModal({ open, leadId, onClose, onLeadUpdated }: LeadDetailModalProps) {
  const { user } = useStore();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for updates
  const [advocateDisposition, setAdvocateDisposition] = useState('');
  const [advocateNotes, setAdvocateNotes] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (open && leadId) {
      loadLeadDetails();
    }
  }, [open, leadId]);

  const loadLeadDetails = async () => {
    if (!leadId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get<{success: boolean; lead: LeadDetail}>(`leads/${leadId}`);
      
      if (response.success && response.lead) {
        setLead(response.lead);
        setAdvocateDisposition(response.lead.advocateDisposition || '');
        setAdvocateNotes(response.lead.advocateNotes || '');
        setStatus(response.lead.status);
      }
    } catch (err: any) {
      console.error('Error loading lead details:', err);
      setError(err.message || 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLead = async () => {
    if (!lead || !user?.id) return;

    try {
      setUpdating(true);
      setError(null);

      const updateData = {
        advocateDisposition: advocateDisposition || undefined,
        advocateNotes: advocateNotes || undefined,
        status,
        advocateId: user.id,
        advocateReviewedAt: new Date().toISOString(),
      };

      const response = await apiClient.patch<{success: boolean; lead: LeadDetail}>(`leads/${lead.id}`, updateData);
      
      if (response.success && response.lead) {
        setLead(response.lead);
        onLeadUpdated?.(response.lead);
        
        // Show success and close modal
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error('Error updating lead:', err);
      setError(err.message || 'Failed to update lead');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'success' | 'warning' | 'error' | 'info' | 'default' } = {
      'SUBMITTED': 'info',
      'ADVOCATE_REVIEW': 'warning',
      'QUALIFIED': 'success',
      'SENT_TO_CONSULT': 'success',
    };
    return colors[status] || 'default';
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">
            Lead Details {lead && `- ${lead.firstName} ${lead.lastName}`}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {lead && (
          <Grid container spacing={3}>
            {/* Patient Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <PersonIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Patient Information</Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Full Name
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {lead.firstName} {lead.lastName}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        MBI
                      </Typography>
                      <Typography variant="body1" fontFamily="monospace">
                        {lead.mbi}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Age
                      </Typography>
                      <Typography variant="body1">
                        {calculateAge(lead.dateOfBirth)} years old
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Date of Birth
                      </Typography>
                      <Typography variant="body1">
                        {new Date(lead.dateOfBirth).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box display="flex" alignItems="center">
                        <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body1">
                          {formatPhone(lead.phone)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Address Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <LocationIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Address</Typography>
                  </Box>
                  
                  <Typography variant="body1">
                    {lead.address.street}<br />
                    {lead.address.city}, {lead.address.state} {lead.address.zipCode}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Vendor & Test Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <BusinessIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Vendor Information</Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Vendor
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {lead.vendor.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Code: {lead.vendor.code}
                      </Typography>
                    </Grid>
                    
                    {lead.testType && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Test Type
                        </Typography>
                        <Chip 
                          label={lead.testType} 
                          color="info" 
                          size="small" 
                        />
                      </Grid>
                    )}
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Submitted
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(lead.createdAt)}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Status & Alerts */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <ScheduleIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Status & Alerts</Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Current Status
                      </Typography>
                      <Chip 
                        label={status.replace('_', ' ')} 
                        color={getStatusColor(status)}
                        size="medium"
                      />
                    </Grid>
                    
                    {lead.isDuplicate && (
                      <Grid item xs={12}>
                        <Chip 
                          label="Duplicate Lead" 
                          color="error" 
                          icon={<WarningIcon />}
                        />
                      </Grid>
                    )}
                    
                    {lead.alerts.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Active Alerts
                        </Typography>
                        {lead.alerts.map((alert) => (
                          <Alert 
                            key={alert.id} 
                            severity={alert.severity.toLowerCase() as any}
                            sx={{ mb: 1 }}
                          >
                            {alert.message}
                          </Alert>
                        ))}
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Advocate Update Section */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <NotesIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Advocate Review</Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        label="Status"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Disposition</InputLabel>
                      <Select
                        value={advocateDisposition}
                        onChange={(e) => setAdvocateDisposition(e.target.value)}
                        label="Disposition"
                      >
                        <MenuItem value="">
                          <em>No Disposition</em>
                        </MenuItem>
                        {ADVOCATE_DISPOSITIONS.map((disposition) => (
                          <MenuItem key={disposition.value} value={disposition.value}>
                            {disposition.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    {advocateDisposition && (
                      <Chip 
                        label={ADVOCATE_DISPOSITIONS.find(d => d.value === advocateDisposition)?.label}
                        color={ADVOCATE_DISPOSITIONS.find(d => d.value === advocateDisposition)?.color as any}
                      />
                    )}
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Advocate Notes"
                      value={advocateNotes}
                      onChange={(e) => setAdvocateNotes(e.target.value)}
                      placeholder="Add notes about your review, call details, or patient interaction..."
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={updating}>
          Cancel
        </Button>
        <Button 
          onClick={handleUpdateLead} 
          variant="contained" 
          disabled={updating || !lead}
          startIcon={updating ? <CircularProgress size={20} /> : <CheckCircleIcon />}
        >
          {updating ? 'Updating...' : 'Update Lead'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 