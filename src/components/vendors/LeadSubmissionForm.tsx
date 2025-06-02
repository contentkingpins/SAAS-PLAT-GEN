'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  MenuItem,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Send as SendIcon } from '@mui/icons-material';
import { apiClient } from '@/lib/api/client';
import { Lead } from '@/types';

// Validation schema
const leadSchema = z.object({
  mbi: z.string().min(11, 'MBI must be 11 characters').max(11, 'MBI must be 11 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  dateOfBirth: z.date({
    required_error: 'Date of birth is required',
  }),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}$/, 'ZIP code must be 5 digits'),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadSubmissionFormProps {
  vendorId: string;
  vendorCode: string;
  onSuccess?: (lead: Lead) => void;
}

export function LeadSubmissionForm({ vendorId, vendorCode, onSuccess }: LeadSubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const lead = await apiClient.post<Lead>('/leads', {
        ...data,
        vendorId,
        vendorCode,
        status: 'submitted',
        contactAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setSubmitSuccess(true);
      reset();
      onSuccess?.(lead);
      
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to submit lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Submit New Lead
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter patient information to submit a new lead
      </Typography>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Lead submitted successfully!
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Personal Information */}
          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Box>

          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <TextField
              fullWidth
              label="MBI (Medicare Beneficiary Identifier)"
              {...register('mbi')}
              error={!!errors.mbi}
              helperText={errors.mbi?.message || 'Must be 11 characters'}
              inputProps={{ maxLength: 11 }}
            />
          </Box>

          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <TextField
              fullWidth
              label="First Name"
              {...register('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
            />
          </Box>

          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <TextField
              fullWidth
              label="Last Name"
              {...register('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
            />
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Date of Birth"
                  value={field.value || null}
                  onChange={field.onChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.dateOfBirth,
                      helperText: errors.dateOfBirth?.message,
                    },
                  }}
                />
              )}
            />
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <TextField
              fullWidth
              label="Phone Number"
              {...register('phone')}
              error={!!errors.phone}
              helperText={errors.phone?.message || 'Enter 10 digits'}
              inputProps={{ maxLength: 10 }}
              placeholder="1234567890"
            />
          </Box>

          {/* Address Information */}
          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Address Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Box>

          <Box sx={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Street Address"
              {...register('street')}
              error={!!errors.street}
              helperText={errors.street?.message}
            />
          </Box>

          <Box sx={{ flex: '2 1 400px', minWidth: '400px' }}>
            <TextField
              fullWidth
              label="City"
              {...register('city')}
              error={!!errors.city}
              helperText={errors.city?.message}
            />
          </Box>

          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <TextField
              fullWidth
              label="State"
              {...register('state')}
              error={!!errors.state}
              helperText={errors.state?.message || 'Two letter code'}
              inputProps={{ maxLength: 2 }}
              placeholder="FL"
            />
          </Box>

          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <TextField
              fullWidth
              label="ZIP Code"
              {...register('zipCode')}
              error={!!errors.zipCode}
              helperText={errors.zipCode?.message || '5 digits'}
              inputProps={{ maxLength: 5 }}
              placeholder="12345"
            />
          </Box>

          {/* Submit Button */}
          <Box sx={{ width: '100%' }}>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
                sx={{ minWidth: 200 }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Lead'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
} 