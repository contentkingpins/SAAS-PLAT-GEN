'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Avatar,
  IconButton,
  InputAdornment,
  Collapse,
  Alert,
  Skeleton,
  Divider,
  Button
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { apiClient } from '@/lib/api/client';

// Custom debounce hook
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }, [delay]); // Only depend on delay, not callback
}

interface Lead {
  id: string;
  mbi: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  formattedPhone: string;
  dateOfBirth: string;
  age: number | null;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    full: string;
  };
  vendor: {
    name: string;
    code: string;
  };
  testType: string;
  status: string;
  statusLabel: string;
  advocate?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  collectionsAgent?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  isDuplicate: boolean;
  hasActiveAlerts: boolean;
  activeAlerts: any[];
  createdAt: string;
  updatedAt: string;
  quickInfo: {
    lastActivity: string;
    daysSinceSubmission: number;
    currentAssignment: string;
  };
}

interface LeadSearchProps {
  onLeadSelect?: (lead: Lead) => void;
  showActions?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function LeadSearch({ 
  onLeadSelect, 
  showActions = true, 
  placeholder = "Search by name, phone, MBI, or location...",
  autoFocus = false 
}: LeadSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // apiClient.get() already extracts the data from {success: true, data: [...]}
      const leads = await apiClient.get<Lead[]>(`leads/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      
      console.log('Search results received:', leads);
      setResults(leads || []);
      
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed since we're not using external variables

  // Debounced search function
  const debouncedSearch = useDebounce(performSearch, 300);

  // Effect to trigger search when query changes
  useEffect(() => {
    debouncedSearch(query);
  }, [query]); // Only depend on query, not debouncedSearch

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setSelectedLead(null);
    setExpandedCard(null);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead.id);
    if (onLeadSelect) {
      onLeadSelect(lead);
    }
  };

  const toggleCardExpansion = (leadId: string) => {
    setExpandedCard(expandedCard === leadId ? null : leadId);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: 'success' | 'warning' | 'error' | 'info' | 'default' } = {
      'SUBMITTED': 'info',
      'ADVOCATE_REVIEW': 'warning',
      'QUALIFIED': 'success',
      'SENT_TO_CONSULT': 'success',
      'CONSULTED': 'success',
      'COLLECTIONS': 'warning',
      'SHIPPED': 'success',
      'COMPLETED': 'success',
      'REJECTED': 'error',
      'CANCELLED': 'error'
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      {/* Search Input */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: query && (
            <InputAdornment position="end">
              <IconButton onClick={handleClearSearch} size="small">
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 1, borderRadius: 1 }} />
          ))}
        </Box>
      )}

      {/* Search Results */}
      {!loading && results.length === 0 && query.length >= 2 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No leads found matching "{query}". Try searching by name, phone number, MBI, or location.
        </Alert>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Found {results.length} lead{results.length > 1 ? 's' : ''} matching "{query}"
          </Typography>
          
          <List sx={{ p: 0 }}>
            {results.map((lead) => (
              <Card 
                key={lead.id} 
                sx={{ 
                  mb: 1, 
                  cursor: 'pointer',
                  border: selectedLead === lead.id ? 2 : 1,
                  borderColor: selectedLead === lead.id ? 'primary.main' : 'divider',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleLeadClick(lead)}
              >
                <CardContent sx={{ py: 2 }}>
                  {/* Main Lead Info */}
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" component="div">
                          {lead.fullName}
                          {lead.isDuplicate && (
                            <WarningIcon 
                              color="warning" 
                              sx={{ ml: 1, fontSize: 16 }} 
                              titleAccess="Potential duplicate"
                            />
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          MBI: {lead.mbi} • {lead.vendor.name}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={lead.statusLabel} 
                        color={getStatusColor(lead.status)}
                        size="small"
                      />
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardExpansion(lead.id);
                        }}
                        size="small"
                      >
                        {expandedCard === lead.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Quick Info */}
                  <Box display="flex" gap={3} mt={1}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2">{lead.formattedPhone}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        Age {lead.age} • {lead.quickInfo.daysSinceSubmission} days ago
                      </Typography>
                    </Box>
                  </Box>

                  {/* Expanded Details */}
                  <Collapse in={expandedCard === lead.id}>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Contact Information
                      </Typography>
                      <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="body2">{lead.address.full}</Typography>
                      </Box>
                      
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Assignment & Status
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {lead.quickInfo.currentAssignment}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Test Type: {lead.testType}
                      </Typography>
                      
                      {lead.hasActiveAlerts && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          {lead.activeAlerts.length} active alert{lead.activeAlerts.length > 1 ? 's' : ''}
                        </Alert>
                      )}

                      {showActions && (
                        <Box display="flex" gap={1} mt={2}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AssignmentIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navigate to lead details or open action dialog
                              console.log('View lead details:', lead.id);
                            }}
                          >
                            View Details
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            ))}
          </List>
        </Box>
      )}

      {/* Search Tips */}
      {query.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Search Tips:</strong>
          </Typography>
          <Typography variant="body2" component="div">
            • Enter patient name (first and/or last name)
            <br />
            • Phone number (with or without formatting)
            <br />
            • MBI (Medicare Beneficiary Identifier)
            <br />
            • City or state name
          </Typography>
        </Alert>
      )}
    </Box>
  );
} 