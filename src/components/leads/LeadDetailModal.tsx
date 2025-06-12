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
  FormHelperText,
  Snackbar,
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
  LocalHospital as LocalHospitalIcon,
  FamilyRestroom as FamilyRestroomIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
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
  
  // Additional demographics
  middleInitial?: string;
  gender?: string;
  ethnicity?: string;
  maritalStatus?: string;
  height?: string;
  weight?: string;
  
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  
  // Insurance information
  insurance?: {
    primaryCompany?: string;
    primaryPolicyNumber?: string;
  };
  
  // Medical history
  medicalHistory?: {
    past?: string;
    surgical?: string;
    medications?: string;
    conditions?: string;
  };
  
  // Family history
  familyHistory?: Array<{
    relation?: string;
    conditions?: string;
    ageOfDiagnosis?: string;
  }>;
  
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
  const [error, setError] = useState<string | null>(null);
  const [disposition, setDisposition] = useState('');
  const [advocateNotes, setAdvocateNotes] = useState('');
  const [status, setStatus] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Add state for editing fields
  const [editMode, setEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState<any>({});

  useEffect(() => {
    if (open && leadId) {
      loadLeadDetails();
    }
  }, [open, leadId]);

  useEffect(() => {
    if (lead) {
      setEditedLead({
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        middleInitial: lead.middleInitial || '',
        gender: lead.gender || '',
        ethnicity: lead.ethnicity || '',
        maritalStatus: lead.maritalStatus || '',
        height: lead.height || '',
        weight: lead.weight || '',
        address: { ...lead.address },
        insurance: lead.insurance ? { ...lead.insurance } : {},
        medicalHistory: lead.medicalHistory ? { ...lead.medicalHistory } : {},
        familyHistory: lead.familyHistory ? lead.familyHistory.map(fh => ({
          relation: fh.relation || '',
          conditions: fh.conditions || '',
          ageOfDiagnosis: fh.ageOfDiagnosis || ''
        })) : [{ relation: '', conditions: '', ageOfDiagnosis: '' }],
      });
    }
  }, [lead]);

  // Auto-update status when disposition changes
  useEffect(() => {
    if (disposition) {
      const autoStatus = getStatusFromDisposition(disposition);
      setStatus(autoStatus);
      console.log('🔄 Status auto-updated to:', autoStatus, 'based on disposition:', disposition);
    }
  }, [disposition]);

  const loadLeadDetails = async () => {
    if (!leadId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading lead details for ID:', leadId);
      console.log('Making API call to:', `leads/${leadId}`);
      
      const response = await apiClient.get<{success: boolean; lead: LeadDetail; autoAssigned?: boolean; assignmentMessage?: string}>(`leads/${leadId}`);
      
      console.log('API response received:', response);
      
      if (response.success && response.lead) {
        setLead(response.lead);
        setDisposition(response.lead.advocateDisposition || '');
        setAdvocateNotes(response.lead.advocateNotes || '');
        setStatus(response.lead.status);
        console.log('Lead details loaded successfully:', response.lead);
        
        // Show assignment message if lead was auto-assigned
        if (response.autoAssigned && response.assignmentMessage) {
          setSnackbar({
            open: true,
            message: response.assignmentMessage,
            severity: 'success'
          });
        }
      } else {
        console.error('API response success is false or no lead data:', response);
        setError('Failed to load lead details - invalid response format');
      }
    } catch (err: any) {
      console.error('Error loading lead details:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        code: err.code,
        stack: err.stack
      });
      setError(err.message || 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!lead) return;

    try {
      setLoading(true);
      console.log('Updating lead with disposition:', disposition);

      // Automatically determine status based on disposition
      const autoStatus = getStatusFromDisposition(disposition);
      
      const updateData = {
        advocateDisposition: disposition,
        advocateNotes: advocateNotes,
        advocateId: user?.id || lead.advocateId, // Use actual user ID from store
        advocateReviewedAt: new Date().toISOString(),
        status: autoStatus, // Auto-set status based on disposition
        
        // Include edited lead data if in edit mode
        ...(editMode && {
          firstName: editedLead.firstName,
          lastName: editedLead.lastName,
          phone: editedLead.phone,
          middleInitial: editedLead.middleInitial,
          gender: editedLead.gender,
          ethnicity: editedLead.ethnicity,
          maritalStatus: editedLead.maritalStatus,
          height: editedLead.height,
          weight: editedLead.weight,
          street: editedLead.address?.street,
          city: editedLead.address?.city,
          state: editedLead.address?.state,
          zipCode: editedLead.address?.zipCode,
          primaryInsuranceCompany: editedLead.insurance?.primaryCompany,
          primaryPolicyNumber: editedLead.insurance?.primaryPolicyNumber,
          medicalHistory: editedLead.medicalHistory?.past,
          surgicalHistory: editedLead.medicalHistory?.surgical,
          currentMedications: editedLead.medicalHistory?.medications,
          conditionsHistory: editedLead.medicalHistory?.conditions,
        })
      };

      console.log('Update payload:', updateData);

      const response = await apiClient.patch(`/leads/${lead.id}`, updateData) as { success: boolean; lead: LeadDetail };
      
      if (response.success) {
        console.log('✅ Lead updated successfully');
        setStatus(autoStatus);
        
        // Refresh the lead data
        await loadLeadDetails();
        
        // Exit edit mode
        setEditMode(false);
        
        // Call the callback if provided
        if (onLeadUpdated) {
          onLeadUpdated(response.lead);
        }

        // Show success snackbar
        setSnackbar({
          open: true,
          message: 'Lead updated successfully',
          severity: 'success'
        });
      }
    } catch (error: any) {
      console.error('❌ Error updating lead:', error);
      setError(error.message || 'Failed to update lead');

      // Show error snackbar
      setSnackbar({
        open: true,
        message: 'Failed to update lead',
        severity: 'error'
      });
    } finally {
      setLoading(false);
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

  const handleEditChange = (field: string, value: string, section?: string) => {
    if (section) {
      setEditedLead((prev: any) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setEditedLead((prev: any) => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Map disposition to status automatically
  const getStatusFromDisposition = (disposition: string): string => {
    switch (disposition) {
      case 'DOESNT_QUALIFY':
      case 'PATIENT_DECLINED':
      case 'DUPE':
        return 'QUALIFIED'; // Negative results, marked as processed
      case 'CONNECTED_TO_COMPLIANCE':
        return 'SENT_TO_CONSULT'; // Positive result, send to next stage
      case 'COMPLIANCE_ISSUE':
      case 'CALL_BACK':
      case 'CALL_DROPPED':
      default:
        return 'ADVOCATE_REVIEW'; // Still needs advocate attention
    }
  };

  if (!open) return null;

  return (
    <>
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
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center">
                        <PersonIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">Patient Information</Typography>
                      </Box>
                      <Button
                        size="small"
                        onClick={() => setEditMode(!editMode)}
                        startIcon={editMode ? <CancelIcon /> : <EditIcon />}
                      >
                        {editMode ? 'Cancel' : 'Edit'}
                      </Button>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          MBI
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {lead.mbi}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Full Name
                        </Typography>
                        {editMode ? (
                          <Box display="flex" gap={1}>
                            <TextField
                              size="small"
                              value={editedLead.firstName}
                              onChange={(e) => handleEditChange('firstName', e.target.value)}
                              placeholder="First Name"
                            />
                            <TextField
                              size="small"
                              value={editedLead.lastName}
                              onChange={(e) => handleEditChange('lastName', e.target.value)}
                              placeholder="Last Name"
                            />
                          </Box>
                        ) : (
                          <Typography variant="body1" fontWeight="medium">
                            {lead.firstName} {lead.middleInitial} {lead.lastName}
                          </Typography>
                        )}
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Date of Birth
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(lead.dateOfBirth)} (Age: {calculateAge(lead.dateOfBirth)})
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Phone
                        </Typography>
                        {editMode ? (
                          <TextField
                            size="small"
                            fullWidth
                            value={editedLead.phone}
                            onChange={(e) => handleEditChange('phone', e.target.value)}
                          />
                        ) : (
                          <Typography variant="body1">
                            {formatPhone(lead.phone)}
                          </Typography>
                        )}
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Address
                        </Typography>
                        {editMode ? (
                          <Grid container spacing={1}>
                            <Grid item xs={12}>
                              <TextField
                                size="small"
                                fullWidth
                                value={editedLead.address?.street || ''}
                                onChange={(e) => handleEditChange('street', e.target.value, 'address')}
                                placeholder="Street Address"
                              />
                            </Grid>
                            <Grid item xs={4}>
                              <TextField
                                size="small"
                                fullWidth
                                value={editedLead.address?.city || ''}
                                onChange={(e) => handleEditChange('city', e.target.value, 'address')}
                                placeholder="City"
                              />
                            </Grid>
                            <Grid item xs={4}>
                              <TextField
                                size="small"
                                fullWidth
                                value={editedLead.address?.state || ''}
                                onChange={(e) => handleEditChange('state', e.target.value, 'address')}
                                placeholder="State"
                              />
                            </Grid>
                            <Grid item xs={4}>
                              <TextField
                                size="small"
                                fullWidth
                                value={editedLead.address?.zipCode || ''}
                                onChange={(e) => handleEditChange('zipCode', e.target.value, 'address')}
                                placeholder="ZIP Code"
                              />
                            </Grid>
                          </Grid>
                        ) : (
                          <Typography variant="body1">
                            {lead.address.street}<br />
                            {lead.address.city}, {lead.address.state} {lead.address.zipCode}
                          </Typography>
                        )}
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

              {/* Comprehensive Form Data Sections */}
              
              {/* Demographics Section */}
              {(lead.middleInitial || lead.gender || lead.ethnicity || lead.maritalStatus || lead.height || lead.weight) && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Box display="flex" alignItems="center">
                            <PersonIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6">Demographics</Typography>
                          </Box>
                          <Button
                            size="small"
                            onClick={() => setEditMode(!editMode)}
                            startIcon={editMode ? <CancelIcon /> : <EditIcon />}
                          >
                            {editMode ? 'Cancel' : 'Edit'}
                          </Button>
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Middle Initial
                            </Typography>
                            {editMode ? (
                              <TextField
                                size="small"
                                fullWidth
                                value={editedLead.middleInitial}
                                onChange={(e) => handleEditChange('middleInitial', e.target.value)}
                                placeholder="MI"
                              />
                            ) : (
                              <Typography variant="body1">{lead.middleInitial || 'N/A'}</Typography>
                            )}
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Gender
                            </Typography>
                            {editMode ? (
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={editedLead.gender || ''}
                                  onChange={(e) => handleEditChange('gender', e.target.value)}
                                >
                                  <MenuItem value="Male">Male</MenuItem>
                                  <MenuItem value="Female">Female</MenuItem>
                                  <MenuItem value="Other">Other</MenuItem>
                                  <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                                </Select>
                              </FormControl>
                            ) : (
                              <Typography variant="body1">{lead.gender || 'N/A'}</Typography>
                            )}
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Ethnicity
                            </Typography>
                            {editMode ? (
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={editedLead.ethnicity || ''}
                                  onChange={(e) => handleEditChange('ethnicity', e.target.value)}
                                >
                                  <MenuItem value="Hispanic or Latino">Hispanic or Latino</MenuItem>
                                  <MenuItem value="Not Hispanic or Latino">Not Hispanic or Latino</MenuItem>
                                  <MenuItem value="American Indian or Alaska Native">American Indian or Alaska Native</MenuItem>
                                  <MenuItem value="Asian">Asian</MenuItem>
                                  <MenuItem value="Black or African American">Black or African American</MenuItem>
                                  <MenuItem value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</MenuItem>
                                  <MenuItem value="White">White</MenuItem>
                                  <MenuItem value="Two or More Races">Two or More Races</MenuItem>
                                  <MenuItem value="Other">Other</MenuItem>
                                  <MenuItem value="Prefer not to answer">Prefer not to answer</MenuItem>
                                </Select>
                              </FormControl>
                            ) : (
                              <Typography variant="body1">{lead.ethnicity || 'N/A'}</Typography>
                            )}
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Marital Status
                            </Typography>
                            {editMode ? (
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={editedLead.maritalStatus || ''}
                                  onChange={(e) => handleEditChange('maritalStatus', e.target.value)}
                                >
                                  <MenuItem value="Single">Single</MenuItem>
                                  <MenuItem value="Married">Married</MenuItem>
                                  <MenuItem value="Divorced">Divorced</MenuItem>
                                  <MenuItem value="Widowed">Widowed</MenuItem>
                                  <MenuItem value="Separated">Separated</MenuItem>
                                </Select>
                              </FormControl>
                            ) : (
                              <Typography variant="body1">{lead.maritalStatus || 'N/A'}</Typography>
                            )}
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Height
                            </Typography>
                            {editMode ? (
                              <TextField
                                size="small"
                                fullWidth
                                value={editedLead.height}
                                onChange={(e) => handleEditChange('height', e.target.value)}
                                placeholder="5'8&quot;"
                              />
                            ) : (
                              <Typography variant="body1">{lead.height || 'N/A'}</Typography>
                            )}
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Weight
                            </Typography>
                            {editMode ? (
                              <TextField
                                size="small"
                                fullWidth
                                value={editedLead.weight}
                                onChange={(e) => handleEditChange('weight', e.target.value)}
                                placeholder="150 lbs"
                              />
                            ) : (
                              <Typography variant="body1">{lead.weight || 'N/A'}</Typography>
                            )}
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Insurance Information */}
              {lead.insurance && (lead.insurance.primaryCompany || lead.insurance.primaryPolicyNumber) && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Box display="flex" alignItems="center">
                            <BusinessIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6">Insurance Information</Typography>
                          </Box>
                          <Button
                            size="small"
                            onClick={() => setEditMode(!editMode)}
                            startIcon={editMode ? <CancelIcon /> : <EditIcon />}
                          >
                            {editMode ? 'Cancel' : 'Edit'}
                          </Button>
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Primary Insurance Company
                            </Typography>
                            {editMode ? (
                              <TextField
                                size="small"
                                fullWidth
                                value={editedLead.insurance?.primaryCompany || ''}
                                onChange={(e) => handleEditChange('primaryCompany', e.target.value, 'insurance')}
                                placeholder="Insurance Company Name"
                              />
                            ) : (
                              <Typography variant="body1">{lead.insurance.primaryCompany || 'N/A'}</Typography>
                            )}
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Policy Number
                            </Typography>
                            {editMode ? (
                              <TextField
                                size="small"
                                fullWidth
                                value={editedLead.insurance?.primaryPolicyNumber || ''}
                                onChange={(e) => handleEditChange('primaryPolicyNumber', e.target.value, 'insurance')}
                                placeholder="Policy Number"
                              />
                            ) : (
                              <Typography variant="body1">{lead.insurance.primaryPolicyNumber || 'N/A'}</Typography>
                            )}
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Medical History */}
              {lead.medicalHistory && (lead.medicalHistory.past || lead.medicalHistory.surgical || lead.medicalHistory.medications || lead.medicalHistory.conditions) && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Box display="flex" alignItems="center">
                            <LocalHospitalIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6">Medical History</Typography>
                          </Box>
                          <Button
                            size="small"
                            onClick={() => setEditMode(!editMode)}
                            startIcon={editMode ? <CancelIcon /> : <EditIcon />}
                          >
                            {editMode ? 'Cancel' : 'Edit'}
                          </Button>
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Past Medical History
                            </Typography>
                            {editMode ? (
                              <TextField
                                multiline
                                rows={3}
                                fullWidth
                                value={editedLead.medicalHistory?.past || ''}
                                onChange={(e) => handleEditChange('past', e.target.value, 'medicalHistory')}
                                placeholder="Enter past medical history..."
                              />
                            ) : (
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {lead.medicalHistory.past || 'N/A'}
                              </Typography>
                            )}
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Surgical History
                            </Typography>
                            {editMode ? (
                              <TextField
                                multiline
                                rows={3}
                                fullWidth
                                value={editedLead.medicalHistory?.surgical || ''}
                                onChange={(e) => handleEditChange('surgical', e.target.value, 'medicalHistory')}
                                placeholder="Enter surgical history..."
                              />
                            ) : (
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {lead.medicalHistory.surgical || 'N/A'}
                              </Typography>
                            )}
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Current Medications
                            </Typography>
                            {editMode ? (
                              <TextField
                                multiline
                                rows={3}
                                fullWidth
                                value={editedLead.medicalHistory?.medications || ''}
                                onChange={(e) => handleEditChange('medications', e.target.value, 'medicalHistory')}
                                placeholder="Enter current medications..."
                              />
                            ) : (
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {lead.medicalHistory.medications || 'N/A'}
                              </Typography>
                            )}
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Medical Conditions
                            </Typography>
                            {editMode ? (
                              <TextField
                                multiline
                                rows={3}
                                fullWidth
                                value={editedLead.medicalHistory?.conditions || ''}
                                onChange={(e) => handleEditChange('conditions', e.target.value, 'medicalHistory')}
                                placeholder="Enter medical conditions..."
                              />
                            ) : (
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {lead.medicalHistory.conditions || 'N/A'}
                              </Typography>
                            )}
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Family History */}
              {lead.familyHistory && lead.familyHistory.length > 0 && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <FamilyRestroomIcon color="primary" sx={{ mr: 1 }} />
                          <Typography variant="h6">Family History</Typography>
                        </Box>
                        
                        <Grid container spacing={2}>
                          {lead.familyHistory.map((family, index) => (
                            family.relation && (
                              <Grid item xs={12} key={index}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                      <Typography variant="subtitle2" color="text.secondary">
                                        Relation
                                      </Typography>
                                      <Typography variant="body1">{family.relation}</Typography>
                                    </Grid>
                                    {family.conditions && (
                                      <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                          Conditions
                                        </Typography>
                                        <Typography variant="body1">{family.conditions}</Typography>
                                      </Grid>
                                    )}
                                    {family.ageOfDiagnosis && (
                                      <Grid item xs={12} md={2}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                          Age of Diagnosis
                                        </Typography>
                                        <Typography variant="body1">{family.ageOfDiagnosis}</Typography>
                                      </Grid>
                                    )}
                                  </Grid>
                                </Paper>
                              </Grid>
                            )
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}

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
                        <InputLabel>Disposition</InputLabel>
                        <Select
                          value={disposition}
                          onChange={(e) => setDisposition(e.target.value)}
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
                      {disposition && (
                        <Chip 
                          label={ADVOCATE_DISPOSITIONS.find(d => d.value === disposition)?.label}
                          color={ADVOCATE_DISPOSITIONS.find(d => d.value === disposition)?.color as any}
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
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            variant="contained" 
            disabled={loading || !lead}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {loading ? 'Updating...' : 'Update Lead'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for success/error messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
} 