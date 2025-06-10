'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  Grid,
  Divider,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import MBIChecker from '@/components/forms/MBIChecker';

// Comprehensive validation schema - only MBI and basic patient info required
const comprehensiveLeadSchema = z.object({
  // Required fields (Basic Patient Info)
  mbi: z.string().min(11, 'MBI must be 11 characters').max(11, 'MBI must be 11 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits (numbers only)'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  
  // Optional fields
  middleInitial: z.string().optional(),
  primaryInsuranceCompany: z.string().optional(),
  primaryPolicyNumber: z.string().optional(),
  gender: z.string().optional(),
  ethnicity: z.string().optional(),
  maritalStatus: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  
  // Address (optional)
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  
  // Primary Care Provider (optional)
  primaryCareProviderName: z.string().optional(),
  primaryCareProviderPhone: z.string().optional(),
  primaryCareProviderAddress: z.string().optional(),
  
  // Health Assessment (optional)
  generalHealth: z.string().optional(),
  sleepHours: z.string().optional(),
  exercise: z.string().optional(),
  stressProblem: z.string().optional(),
  specialDiet: z.string().optional(),
  stressHandling: z.string().optional(),
  socialSupport: z.string().optional(),
  lifeSatisfaction: z.string().optional(),
  
  // Preventative Screenings (optional)
  prostateScreening: z.boolean().optional(),
  colonoscopy: z.boolean().optional(),
  dexaScan: z.boolean().optional(),
  colorectalScreening: z.boolean().optional(),
  mammogram: z.boolean().optional(),
  hivScreen: z.boolean().optional(),
  papSmear: z.boolean().optional(),
  
  // Vaccinations (optional)
  fluVaccination: z.boolean().optional(),
  pneumococcalVaccination: z.boolean().optional(),
  covidVaccination: z.boolean().optional(),
  shinglesVaccination: z.boolean().optional(),
  hepBVaccination: z.boolean().optional(),
  
  // Medical History (optional)
  medicalHistory: z.string().optional(),
  surgicalHistory: z.string().optional(),
  currentMedications: z.string().optional(),
  medicationSideEffects: z.string().optional(),
  allergies: z.string().optional(),
  neuroConditions: z.string().optional(),
  
  // Substance Use (optional)
  tobaccoUsage: z.string().optional(),
  alcoholUsage: z.string().optional(),
  recreationalDrugUsage: z.string().optional(),
  
  // Family History (optional)
  familyMember1Relation: z.string().optional(),
  familyMember1NeuroConditions: z.string().optional(),
  familyMember1AgeOfDiagnosis: z.string().optional(),
  familyMember2Relation: z.string().optional(),
  familyMember2NeuroConditions: z.string().optional(),
  familyMember2AgeOfDiagnosis: z.string().optional(),
});

type ComprehensiveLeadFormData = z.infer<typeof comprehensiveLeadSchema>;

interface Vendor {
  id: string;
  name: string;
  code: string;
  staticCode: string;
  isActive: boolean;
}

export default function ComprehensiveMedicalForm() {
  const params = useParams();
  const vendorCode = params?.vendorCode as string;
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // MBI validation state
  const [mbiValidated, setMbiValidated] = useState(false);
  const [validatedMbi, setValidatedMbi] = useState<string>('');
  const [validatedTestType, setValidatedTestType] = useState<'IMMUNE' | 'NEURO'>('NEURO');

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isValid },
  } = useForm<ComprehensiveLeadFormData>({
    resolver: zodResolver(comprehensiveLeadSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (vendorCode) {
      fetchVendor();
    } else {
      setError('Invalid vendor code in URL.');
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
      setError('Failed to load vendor information. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleMBIValidation = (isValid: boolean, mbi?: string, testType?: string) => {
    setMbiValidated(isValid);
    if (isValid && mbi && testType) {
      setValidatedMbi(mbi.replace(/-/g, '')); // Remove dashes for form
      setValidatedTestType(testType as 'IMMUNE' | 'NEURO');
    }
  };

  const onSubmit = async (data: ComprehensiveLeadFormData) => {
    if (!vendor) return;

    try {
      setSubmitting(true);
      setError(null);

      // Transform data for submission
      const submissionData = {
        // Required fields - use validated MBI
        mbi: validatedMbi || data.mbi,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        
        // Optional demographic fields
        middleInitial: data.middleInitial || '',
        primaryInsuranceCompany: data.primaryInsuranceCompany || '',
        primaryPolicyNumber: data.primaryPolicyNumber || '',
        gender: data.gender || '',
        ethnicity: data.ethnicity || '',
        maritalStatus: data.maritalStatus || '',
        height: data.height || '',
        weight: data.weight || '',
        
        // Address
        street: data.street || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        
        // Include all other fields as additional data
        additionalData: {
          primaryCareProvider: {
            name: data.primaryCareProviderName || '',
            phone: data.primaryCareProviderPhone || '',
            address: data.primaryCareProviderAddress || '',
          },
          healthAssessment: {
            generalHealth: data.generalHealth || '',
            sleepHours: data.sleepHours || '',
            exercise: data.exercise || '',
            stressProblem: data.stressProblem || '',
            specialDiet: data.specialDiet || '',
            stressHandling: data.stressHandling || '',
            socialSupport: data.socialSupport || '',
            lifeSatisfaction: data.lifeSatisfaction || '',
          },
          screenings: {
            prostate: data.prostateScreening || false,
            colonoscopy: data.colonoscopy || false,
            dexaScan: data.dexaScan || false,
            colorectal: data.colorectalScreening || false,
            mammogram: data.mammogram || false,
            hivScreen: data.hivScreen || false,
            papSmear: data.papSmear || false,
          },
          vaccinations: {
            flu: data.fluVaccination || false,
            pneumococcal: data.pneumococcalVaccination || false,
            covid: data.covidVaccination || false,
            shingles: data.shinglesVaccination || false,
            hepB: data.hepBVaccination || false,
          },
          medicalHistory: {
            past: data.medicalHistory || '',
            surgical: data.surgicalHistory || '',
            medications: data.currentMedications || '',
            sideEffects: data.medicationSideEffects || '',
            allergies: data.allergies || '',
            neuro: data.neuroConditions || '',
          },
          substanceUse: {
            tobacco: data.tobaccoUsage || '',
            alcohol: data.alcoholUsage || '',
            drugs: data.recreationalDrugUsage || '',
          },
          familyHistory: [
            {
              relation: data.familyMember1Relation || '',
              neuroConditions: data.familyMember1NeuroConditions || '',
              ageOfDiagnosis: data.familyMember1AgeOfDiagnosis || '',
            },
            {
              relation: data.familyMember2Relation || '',
              neuroConditions: data.familyMember2NeuroConditions || '',
              ageOfDiagnosis: data.familyMember2AgeOfDiagnosis || '',
            },
          ],
        },
        
        vendorCode: vendor.code,
        vendorId: vendor.id,
        testType: validatedTestType.toLowerCase(), // Use validated test type
      };

      await apiClient.post('/api/leads/submit', submissionData);
      setSuccess(true);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to submit form. Please try again.';
      
      if (errorMessage.includes('MBI already exists')) {
        setError('A patient with this MBI has already been submitted. Please check the MBI and try again.');
      } else if (errorMessage.includes('Invalid request data')) {
        setError('Please check all required fields and ensure they are filled out correctly.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error && !vendor) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Unable to Load Form
          </Typography>
          {error}
        </Alert>
      </Container>
    );
  }

  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
          <Typography variant="h4" gutterBottom color="success.main">
            Medical Information Submitted Successfully!
          </Typography>
          <Typography variant="h6" gutterBottom>
            Thank you for completing the comprehensive medical intake form.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Your information has been received and will be reviewed by our medical team.
            You will be contacted within 24-48 hours regarding next steps.
          </Typography>
          <Alert severity="success" sx={{ mt: 3 }}>
            <strong>Important:</strong> Please keep this confirmation for your records. 
            Your submission has been processed and assigned a tracking number.
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header with Vendor Information */}
        <Box mb={4}>
          <Card sx={{ mb: 3, backgroundColor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <BusinessIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {vendor?.name}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Vendor Code: {vendor?.code} | Comprehensive Medical Intake Form
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Typography variant="h4" component="h1" gutterBottom>
            Comprehensive Medical Intake Form
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please complete this comprehensive medical intake form. Fields marked with * are required.
            All other information is optional but helps us provide better care.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* MBI Duplicate Checker */}
        <MBIChecker 
          onValidationComplete={handleMBIValidation}
          defaultTestType="NEURO"
        />

        {/* Form only shows if MBI is validated */}
        {mbiValidated && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Basic Patient Information - REQUIRED */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom color="primary">
              Basic Patient Information (Required)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Medicare Beneficiary Identifier (MBI) *"
                  {...register('mbi')}
                  value={validatedMbi}
                  error={!!errors.mbi}
                  helperText="✅ MBI validated - cannot be changed"
                  disabled
                  sx={{ backgroundColor: 'success.light', opacity: 0.8 }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="First Name *"
                  {...register('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="Middle Initial"
                  {...register('middleInitial')}
                  inputProps={{ maxLength: 1 }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Last Name *"
                  {...register('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number *"
                  {...register('phone')}
                  error={!!errors.phone}
                  helperText={errors.phone?.message || '10 digits, numbers only'}
                  placeholder="5551234567"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Birth (MM/DD/YYYY) *"
                  {...register('dateOfBirth')}
                  error={!!errors.dateOfBirth}
                  helperText={errors.dateOfBirth?.message}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Demographics - OPTIONAL */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom color="primary">
              Demographics (Optional)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Primary Insurance Company"
                  {...register('primaryInsuranceCompany')}
                  placeholder="MEDICARE"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Primary Policy #"
                  {...register('primaryPolicyNumber')}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    label="Gender"
                    {...register('gender')}
                    defaultValue=""
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                    <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Ethnicity"
                  {...register('ethnicity')}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Marital Status</InputLabel>
                  <Select
                    label="Marital Status"
                    {...register('maritalStatus')}
                    defaultValue=""
                  >
                    <MenuItem value="Single">Single</MenuItem>
                    <MenuItem value="Married">Married</MenuItem>
                    <MenuItem value="Divorced">Divorced</MenuItem>
                    <MenuItem value="Widowed">Widowed</MenuItem>
                    <MenuItem value="Separated">Separated</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={1.5}>
                                 <TextField
                   fullWidth
                   label="Height"
                   {...register('height')}
                   placeholder="5'8"
                 />
              </Grid>

              <Grid item xs={12} md={1.5}>
                <TextField
                  fullWidth
                  label="Weight (lbs)"
                  {...register('weight')}
                  type="number"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Address Information - OPTIONAL */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom color="primary">
              Address Information (Optional)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  {...register('street')}
                  placeholder="123 Main Street"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="City"
                  {...register('city')}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="State"
                  {...register('state')}
                  placeholder="CA"
                  inputProps={{ maxLength: 2 }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Zip Code"
                  {...register('zipCode')}
                  placeholder="12345"
                  inputProps={{ maxLength: 5 }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Primary Healthcare Provider - OPTIONAL */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom color="primary">
              Primary Healthcare Provider Information (Optional)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Primary Care Provider Name"
                  {...register('primaryCareProviderName')}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Primary Care Provider Phone"
                  {...register('primaryCareProviderPhone')}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Primary Care Address"
                  {...register('primaryCareProviderAddress')}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Health Assessment - OPTIONAL */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom color="primary">
              Health Assessment (Optional)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>In general, would you say your health is</InputLabel>
                  <Select
                    label="In general, would you say your health is"
                    {...register('generalHealth')}
                    defaultValue=""
                  >
                    <MenuItem value="Excellent">Excellent</MenuItem>
                    <MenuItem value="Very Good">Very Good</MenuItem>
                    <MenuItem value="Good">Good</MenuItem>
                    <MenuItem value="Fair">Fair</MenuItem>
                    <MenuItem value="Poor">Poor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="How many hours of sleep do you usually get each night?"
                  {...register('sleepHours')}
                  type="number"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Do you do moderate to strenuous exercise (brisk walk) for about 20 minutes for 3 or more days per week?</FormLabel>
                  <Controller
                    name="exercise"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup {...field} row>
                        <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
                        <FormControlLabel value="No" control={<Radio />} label="No" />
                      </RadioGroup>
                    )}
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>How often is stress a problem for you?</InputLabel>
                  <Select
                    label="How often is stress a problem for you?"
                    {...register('stressProblem')}
                    defaultValue=""
                  >
                    <MenuItem value="Never">Never</MenuItem>
                    <MenuItem value="Rarely">Rarely</MenuItem>
                    <MenuItem value="Sometimes">Sometimes</MenuItem>
                    <MenuItem value="Often">Often</MenuItem>
                    <MenuItem value="Always">Always</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Are you on a special diet?</FormLabel>
                  <Controller
                    name="specialDiet"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup {...field} row>
                        <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
                        <FormControlLabel value="No" control={<Radio />} label="No" />
                      </RadioGroup>
                    )}
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>How well do you handle the stress in your life?</InputLabel>
                  <Select
                    label="How well do you handle the stress in your life?"
                    {...register('stressHandling')}
                    defaultValue=""
                  >
                    <MenuItem value="Very Well">Very Well</MenuItem>
                    <MenuItem value="Well">Well</MenuItem>
                    <MenuItem value="Moderately">Moderately</MenuItem>
                    <MenuItem value="Poorly">Poorly</MenuItem>
                    <MenuItem value="Very Poorly">Very Poorly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>How often do you get the social and emotional support you need?</InputLabel>
                  <Select
                    label="How often do you get the social and emotional support you need?"
                    {...register('socialSupport')}
                    defaultValue=""
                  >
                    <MenuItem value="Always">Always</MenuItem>
                    <MenuItem value="Usually">Usually</MenuItem>
                    <MenuItem value="Sometimes">Sometimes</MenuItem>
                    <MenuItem value="Rarely">Rarely</MenuItem>
                    <MenuItem value="Never">Never</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>In general, how satisfied are you with your life?</InputLabel>
                  <Select
                    label="In general, how satisfied are you with your life?"
                    {...register('lifeSatisfaction')}
                    defaultValue=""
                  >
                    <MenuItem value="Very Satisfied">Very Satisfied</MenuItem>
                    <MenuItem value="Satisfied">Satisfied</MenuItem>
                    <MenuItem value="Neutral">Neutral</MenuItem>
                    <MenuItem value="Dissatisfied">Dissatisfied</MenuItem>
                    <MenuItem value="Very Dissatisfied">Very Dissatisfied</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Preventative Screenings - OPTIONAL */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom color="primary">
              Preventative Screening: Have you had any of these screenings? (Optional)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('prostateScreening')} />}
                  label="Prostate"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('colonoscopy')} />}
                  label="Colonoscopy"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('dexaScan')} />}
                  label="Dexa Scan"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('colorectalScreening')} />}
                  label="Colorectal screening (Fecal Bld)"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('mammogram')} />}
                  label="Mammogram"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('hivScreen')} />}
                  label="HIV screen"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('papSmear')} />}
                  label="Pap Smear"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Vaccinations - OPTIONAL */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom color="primary">
              Vaccinations: Have you had any of these? (Optional)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('fluVaccination')} />}
                  label="Flu vaccination"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('pneumococcalVaccination')} />}
                  label="Pneumococcal vaccination"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('covidVaccination')} />}
                  label="Covid vaccination"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('shinglesVaccination')} />}
                  label="Shingles vaccination"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={<Checkbox {...register('hepBVaccination')} />}
                  label="Hep B vaccination"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Medical History - OPTIONAL */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom color="primary">
              Medical History (Optional)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Patient Medical History (List all past medical history. List diagnosis, not symptoms.)"
                  {...register('medicalHistory')}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Past Surgical History (List all past surgical history)"
                  {...register('surgicalHistory')}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Current Medications (List all current medications. Be specific.)"
                  {...register('currentMedications')}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Medication Side Effects (List all medication with side effects experienced.)"
                  {...register('medicationSideEffects')}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Allergies (List all known allergies.)"
                  {...register('allergies')}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Neuro Conditions"
                  {...register('neuroConditions')}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Substance Use History - OPTIONAL */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom color="primary">
              Substance Use History (Optional)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Tobacco Usage History (List type of usage and frequency. If not obtained, write not obtained)"
                  {...register('tobaccoUsage')}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Alcohol Usage History (List type of usage and frequency. If not obtained, write not obtained)"
                  {...register('alcoholUsage')}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Recreational Drug Usage History (List type of usage and frequency. If not obtained, write not obtained)"
                  {...register('recreationalDrugUsage')}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Family History - OPTIONAL */}
          <Box mb={4}>
            <Typography variant="h6" gutterBottom color="primary">
              Family History (Optional)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Family Member 1
            </Typography>
            <Grid container spacing={3} mb={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Family Member Relation to Patient"
                  {...register('familyMember1Relation')}
                  placeholder="e.g., Mother, Father, Sister"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Family Member Neuro Conditions"
                  {...register('familyMember1NeuroConditions')}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Family Member Age of Diagnosis"
                  {...register('familyMember1AgeOfDiagnosis')}
                  type="number"
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" gutterBottom>
              Family Member 2
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Family Member Relation to Patient"
                  {...register('familyMember2Relation')}
                  placeholder="e.g., Mother, Father, Sister"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Family Member Neuro Conditions"
                  {...register('familyMember2NeuroConditions')}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Family Member Age of Diagnosis"
                  {...register('familyMember2AgeOfDiagnosis')}
                  type="number"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Important Notice */}
          <Alert severity="info" sx={{ mb: 4 }}>
            <Typography variant="body2">
              <strong>Important:</strong> Please ensure you have obtained proper patient consent 
              before submitting this information. All data will be handled in accordance with 
              HIPAA regulations and our privacy policy. Only fields marked with * are required.
            </Typography>
          </Alert>

          {/* Submit Button */}
          <Box display="flex" justifyContent="center" mt={4}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <AssignmentIcon />}
              sx={{ px: 6, py: 2 }}
            >
              {submitting ? 'Submitting Medical Information...' : 'Submit Comprehensive Medical Form'}
            </Button>
          </Box>
        </form>
        )}
      </Paper>
    </Container>
  );
} 
