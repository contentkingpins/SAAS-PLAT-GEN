'use client';

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Block,
  Warning,
  Search,
} from '@mui/icons-material';

interface MBICheckResult {
  status: 'ALLOWED' | 'BLOCKED' | 'WARNING';
  message: string;
  reason?: string;
  daysSince?: number;
  requiredWaitDays?: number;
  existingLeads?: {
    id: string;
    testType: string;
    submittedAt: string;
    daysSince: number;
    vendor: string;
    status: string;
  }[];
}

interface MBICheckerProps {
  onValidationComplete: (isValid: boolean, mbi?: string, testType?: string) => void;
  defaultTestType?: 'IMMUNE' | 'NEURO';
}

export default function MBIChecker({ onValidationComplete, defaultTestType }: MBICheckerProps) {
  const [mbi, setMbi] = useState('');
  const [testType, setTestType] = useState<'IMMUNE' | 'NEURO'>(defaultTestType || 'IMMUNE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MBICheckResult | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const formatMBI = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    // Format as 1ABC-DEF-GH12
    if (cleaned.length <= 1) return cleaned;
    if (cleaned.length <= 4) return cleaned.slice(0, 1) + cleaned.slice(1);
    if (cleaned.length <= 7) return cleaned.slice(0, 1) + cleaned.slice(1, 4) + '-' + cleaned.slice(4);
    if (cleaned.length <= 9) return cleaned.slice(0, 1) + cleaned.slice(1, 4) + '-' + cleaned.slice(4, 7) + '-' + cleaned.slice(7);
    return cleaned.slice(0, 1) + cleaned.slice(1, 4) + '-' + cleaned.slice(4, 7) + '-' + cleaned.slice(7, 11);
  };

  const handleMBIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMBI(e.target.value);
    setMbi(formatted);

    // Reset validation when MBI changes
    if (hasChecked) {
      setResult(null);
      setHasChecked(false);
      onValidationComplete(false);
    }
  };

  const handleTestTypeChange = (e: any) => {
    setTestType(e.target.value);

    // Reset validation when test type changes
    if (hasChecked) {
      setResult(null);
      setHasChecked(false);
      onValidationComplete(false);
    }
  };

  const checkMBI = async () => {
    if (!mbi || mbi.length < 11) {
      alert('Please enter a valid MBI (11 characters)');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/leads/check-mbi-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mbi: mbi.replace(/-/g, ''), // Remove dashes for API
          testType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check MBI');
      }

      setResult(data);
      setHasChecked(true);

      // Notify parent component
      const isValid = data.status === 'ALLOWED';
      onValidationComplete(isValid, mbi, testType);

    } catch (error) {
      console.error('Error checking MBI:', error);
      alert('Failed to check MBI. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return <Search />;

    switch (result.status) {
      case 'ALLOWED':
        return <CheckCircle color="success" />;
      case 'BLOCKED':
        return <Block color="error" />;
      case 'WARNING':
        return <Warning color="warning" />;
      default:
        return <Search />;
    }
  };

  const getStatusColor = () => {
    if (!result) return 'info';

    switch (result.status) {
      case 'ALLOWED':
        return 'success';
      case 'BLOCKED':
        return 'error';
      case 'WARNING':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Card elevation={3} sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {getStatusIcon()}
          <Typography variant="h6" fontWeight="bold">
            MBI Duplicate Checker
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" mb={3}>
          Enter patient MBI to check for duplicates before filling out the form
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Patient MBI"
              value={mbi}
              onChange={handleMBIChange}
              placeholder="1ABC-DEF-GH12"
              inputProps={{ maxLength: 13 }}
              error={mbi.length > 0 && mbi.length < 11}
              helperText={mbi.length > 0 && mbi.length < 11 ? 'MBI must be 11 characters' : ''}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Test Type</InputLabel>
              <Select
                value={testType}
                onChange={handleTestTypeChange}
                label="Test Type"
              >
                <MenuItem value="IMMUNE">IMMUNE</MenuItem>
                <MenuItem value="NEURO">NEURO</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={checkMBI}
              disabled={loading || mbi.length < 11}
              startIcon={loading ? <CircularProgress size={20} /> : <Search />}
              sx={{ height: 56 }}
            >
              {loading ? 'Checking...' : 'Check MBI'}
            </Button>
          </Grid>
        </Grid>

        {result && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />

            <Alert
              severity={getStatusColor()}
              icon={getStatusIcon()}
              sx={{ mb: 2 }}
            >
              <Typography variant="body1" fontWeight="medium">
                {result.message}
              </Typography>
            </Alert>

            {result.existingLeads && result.existingLeads.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Existing Records:
                </Typography>
                {result.existingLeads.map((lead, index) => (
                  <Card key={lead.id} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                          <Chip
                            label={lead.testType}
                            color="primary"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2">
                            {lead.daysSince} days ago
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2">
                            Vendor: {lead.vendor}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Chip
                            label={lead.status}
                            size="small"
                            variant="outlined"
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {result.status === 'BLOCKED' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  📞 If you believe this is an error, please contact your administrator.
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {result?.status === 'ALLOWED' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body1" fontWeight="medium">
              ✅ Validation Complete - You may proceed with the form below
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
