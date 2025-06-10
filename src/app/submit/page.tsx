'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Grid,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';

// Validation schema
const leadSchema = z.object({
  mbi: z.string().min(11, 'MBI must be at least 11 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 digits'),
  testType: z.enum(['immune', 'neuro'], { required_error: 'Test type is required' }),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface Vendor {
  id: string;
  name: string;
  code: string;
  staticCode: string;
  isActive: boolean;
}

function SubmitFormContent() {
  const searchParams = useSearchParams();
  const vendorCode = searchParams?.get('vendor');
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (vendorCode) {
      fetchVendor();
    } else {
      setError('Invalid vendor link. Please contact your administrator.');
      setLoading(false);
    }
  }, [vendorCode]);

  const fetchVendor = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Vendor>(`/vendors/by-code/${vendorCode}`);
      if (response && response.isActive) {
        setVendor(response);
      } else {
        setError('Vendor not found or inactive. Please contact your administrator.');
      }
    } catch (error: any) {
      setError('Failed to load vendor information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    if (!vendor) return;

    try {
      setSubmitting(true);
      setError(null);

              await apiClient.post('/leads/submit', {
        ...data,
        vendorCode: vendor.code,
        vendorId: vendor.id,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
        }
      });

      setSuccess(true);
      setActiveStep(3);
    } catch (error: any) {
      setError(error.message || 'Failed to submit lead. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['Vendor Info', 'Patient Details', 'Contact & Address', 'Review & Submit'];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Vendor Information
            </Typography>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <BusinessIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{vendor?.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendor Code: {vendor?.code}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            <Alert severity="info" sx={{ mb: 2 }}>
              Please ensure you have the patient's consent before submitting their information.
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Patient Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Medicare Beneficiary Identifier (MBI)"
                  fullWidth
                  {...register('mbi')}
                  error={!!errors.mbi}
                  helperText={errors.mbi?.message}
                  placeholder="1EG4-TE5-MK73"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  type="date"
                  label="Date of Birth"
                  fullWidth
                  {...register('dateOfBirth')}
                  error={!!errors.dateOfBirth}
                  helperText={errors.dateOfBirth?.message}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  fullWidth
                  {...register('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  fullWidth
                  {...register('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.testType}>
                  <InputLabel>Test Type</InputLabel>
                  <Select
                    label="Test Type"
                    {...register('testType')}
                    defaultValue=""
                  >
                    <MenuItem value="immune">Immune Panel</MenuItem>
                    <MenuItem value="neuro">Neuro Panel</MenuItem>
                  </Select>
                  {errors.testType && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                      {errors.testType.message}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Contact & Address Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Phone Number"
                  fullWidth
                  {...register('phone')}
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  placeholder="(555) 123-4567"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Street Address"
                  fullWidth
                  {...register('street')}
                  error={!!errors.street}
                  helperText={errors.street?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="City"
                  fullWidth
                  {...register('city')}
                  error={!!errors.city}
                  helperText={errors.city?.message}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="State"
                  fullWidth
                  {...register('state')}
                  error={!!errors.state}
                  helperText={errors.state?.message}
                  placeholder="CA"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="ZIP Code"
                  fullWidth
                  {...register('zipCode')}
                  error={!!errors.zipCode}
                  helperText={errors.zipCode?.message}
                  placeholder="12345"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        if (success) {
          return (
            <Box textAlign="center">
              <AssignmentIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom color="success.main">
                Lead Submitted Successfully!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Thank you for submitting the lead. The patient information has been received and will be processed by our compliance team.
              </Typography>
              <Alert severity="success">
                A reference number has been generated for tracking purposes. The patient will be contacted within 24-48 hours.
              </Alert>
            </Box>
          );
        }

        const formData = watch();
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Submit
            </Typography>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Patient Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Name</Typography>
                    <Typography variant="body1">{formData.firstName} {formData.lastName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">MBI</Typography>
                    <Typography variant="body1">{formData.mbi}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                    <Typography variant="body1">{formData.dateOfBirth}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Test Type</Typography>
                    <Typography variant="body1">{formData.testType?.toUpperCase()}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Phone</Typography>
                    <Typography variant="body1">{formData.phone}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Address</Typography>
                    <Typography variant="body1">
                      {formData.street}, {formData.city}, {formData.state} {formData.zipCode}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please verify all information is correct before submitting. Changes cannot be made after submission.
            </Alert>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !vendor) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom textAlign="center">
            Healthcare Lead Submission
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Submit patient information for genetic testing eligibility
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <form onSubmit={handleSubmit(onSubmit)}>
          {getStepContent(activeStep)}

          {!success && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
              {activeStep !== 0 && (
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Back
                </Button>
              )}
              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={activeStep === 1 && (!watch('mbi') || !watch('firstName') || !watch('lastName'))}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!isValid || submitting}
                  startIcon={submitting && <CircularProgress size={20} />}
                >
                  {submitting ? 'Submitting...' : 'Submit Lead'}
                </Button>
              )}
            </Box>
          )}
        </form>
      </Paper>
    </Container>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>}>
      <SubmitFormContent />
    </Suspense>
  );
} 
