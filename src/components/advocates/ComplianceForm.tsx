'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControlLabel,
  Checkbox,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircleOutline,
  Cancel,
  Warning,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { Lead, TestType, AdvocateDisposition } from '@/types';
import { apiClient } from '@/lib/api/client';

interface ComplianceFormProps {
  lead: Lead;
  agentId: string;
  onComplete: (success: boolean) => void;
}

const complianceQuestions = [
  {
    id: 'verifyDobAddress',
    question: 'Verify DOB/Address',
    required: true,
  },
  {
    id: 'patientConsent',
    question: 'Please state your first and last name if you agree to have a genetic screening with a telehealth provider over the phone',
    required: true,
  },
  {
    id: 'notInCareFacility',
    question: 'Are you currently in a nursing home, hospice, or any other type of care facility?',
    required: true,
    flagIfYes: true,
  },
  {
    id: 'makesMedicalDecisions',
    question: 'Do you make your own medical decisions?',
    required: true,
    flagIfNo: true,
  },
  {
    id: 'understandsBilling',
    question: 'This will be processed under your part b of your Medicare or your secondary insurance. Do you understand this?',
    required: true,
    flagIfNo: true,
  },
  {
    id: 'noCognitiveImpairment',
    question: "Have you ever been diagnosed with Dementia, Alzheimer's, or any other type of cognitive impairment?",
    required: true,
    flagIfYes: true,
  },
  {
    id: 'agentNotMedicare',
    question: "Did the agent that you were just speaking with identify themselves as being Medicare or with your doctor's office?",
    required: true,
    flagIfYes: true,
  },
  {
    id: 'noIncentives',
    question: 'Did anyone on the call today incentivize you with money, medical equipment or supplies to take this test?',
    required: true,
    flagIfYes: true,
  },
  {
    id: 'futureContactConsent',
    question: 'Do you give us consent to contact you in the future to discuss any other additional health services that may benefit you?',
    required: false,
  },
];

export function ComplianceForm({ lead, agentId, onComplete }: ComplianceFormProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [testType, setTestType] = useState<TestType | ''>('');
  const [disposition, setDisposition] = useState<AdvocateDisposition | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const allRequiredChecked = complianceQuestions
    .filter(q => q.required)
    .every(q => checkedItems[q.id]);

  const hasComplianceIssue = complianceQuestions.some(q => {
    if (q.flagIfYes && checkedItems[q.id]) return true;
    if (q.flagIfNo && !checkedItems[q.id] && checkedItems[q.id] !== undefined) return true;
    return false;
  });

  const handleCheckChange = (questionId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleSubmit = async () => {
    if (!testType) {
      setError('Please select a test type');
      return;
    }

    if (!disposition) {
      setError('Please select a disposition');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.patch(`/leads/${lead.id}`, {
        advocateId: agentId,
        advocateDisposition: disposition,
        testType,
        advocateNotes: notes,
        advocateReviewedAt: new Date(),
        status: disposition === 'CONNECTED_TO_COMPLIANCE' ? 'QUALIFIED' : 'ADVOCATE_REVIEW',
        complianceChecklist: {
          verifyDobAddress: checkedItems.verifyDobAddress || false,
          patientConsent: checkedItems.patientConsent || false,
          notInCareFacility: !checkedItems.notInCareFacility || false,
          makesMedicalDecisions: checkedItems.makesMedicalDecisions || false,
          understandsBilling: checkedItems.understandsBilling || false,
          noCognitiveImpairment: !checkedItems.noCognitiveImpairment || false,
          agentNotMedicare: !checkedItems.agentNotMedicare || false,
          noIncentives: !checkedItems.noIncentives || false,
          futureContactConsent: checkedItems.futureContactConsent || false,
          completedAt: new Date(),
          completedBy: agentId,
        },
      });

      onComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit compliance form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Patient Compliance Checklist
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lead.firstName} {lead.lastName} - MBI: {lead.mbi}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {hasComplianceIssue && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<Warning />}>
          Compliance issues detected. This lead may not qualify.
        </Alert>
      )}

      {/* Compliance Questions */}
      <Typography variant="h6" gutterBottom>
        Compliance Questions
      </Typography>
      <List>
        {complianceQuestions.map((question) => (
          <ListItem key={question.id} disablePadding sx={{ mb: 2 }}>
            <ListItemIcon>
              <Checkbox
                checked={checkedItems[question.id] || false}
                onChange={() => handleCheckChange(question.id)}
                color={
                  question.flagIfYes && checkedItems[question.id]
                    ? 'error'
                    : question.flagIfNo && !checkedItems[question.id] && checkedItems[question.id] !== undefined
                    ? 'error'
                    : 'primary'
                }
              />
            </ListItemIcon>
            <ListItemText
              primary={question.question}
              secondary={question.required ? 'Required' : 'Optional'}
              primaryTypographyProps={{
                sx: {
                  color: 
                    (question.flagIfYes && checkedItems[question.id]) ||
                    (question.flagIfNo && !checkedItems[question.id] && checkedItems[question.id] !== undefined)
                      ? 'error.main'
                      : 'text.primary',
                },
              }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Test Type Selection */}
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend" required>
          Test Type
        </FormLabel>
        <RadioGroup
          row
          value={testType}
          onChange={(e) => setTestType(e.target.value as TestType)}
        >
          <FormControlLabel value="immune" control={<Radio />} label="Immune" />
          <FormControlLabel value="neuro" control={<Radio />} label="Neuro" />
        </RadioGroup>
      </FormControl>

      <Divider sx={{ my: 3 }} />

      {/* Disposition Selection */}
      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend" required>
          Call Disposition
        </FormLabel>
        <RadioGroup
          value={disposition}
          onChange={(e) => setDisposition(e.target.value as AdvocateDisposition)}
        >
          <FormControlLabel
            value="CONNECTED_TO_COMPLIANCE"
            control={<Radio color="success" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleOutline sx={{ mr: 1, color: 'success.main' }} />
                Connected to compliance
              </Box>
            }
            disabled={hasComplianceIssue || !allRequiredChecked}
          />
          <FormControlLabel
            value="DOESNT_QUALIFY"
            control={<Radio />}
            label="Doesn't qualify for test"
          />
          <FormControlLabel
            value="COMPLIANCE_ISSUE"
            control={<Radio />}
            label="Compliance issue"
          />
          <FormControlLabel
            value="PATIENT_DECLINED"
            control={<Radio />}
            label="Patient no longer wants to continue"
          />
          <FormControlLabel
            value="CALL_BACK"
            control={<Radio />}
            label="Call back (scheduled)"
          />
          <FormControlLabel
            value="CALL_DROPPED"
            control={<Radio />}
            label="Call dropped"
          />
        </RadioGroup>
      </FormControl>

      {/* Action Buttons */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => onComplete(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!testType || !disposition || isSubmitting}
          startIcon={isSubmitting && <CircularProgress size={20} />}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Compliance Check'}
        </Button>
      </Box>
    </Paper>
  );
} 