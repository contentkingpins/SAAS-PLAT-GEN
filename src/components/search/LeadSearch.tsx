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
  Button,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
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
  onLeadSelect: (leadId: string, lead: Lead) => void;
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
      onLeadSelect(lead.id, lead);
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
                  mb: 2, 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                    borderColor: 'primary.main',
                  }
                }}
                onClick={() => onLeadSelect(lead.id, lead)}
              >
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                          {lead.firstName[0]}{lead.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="div">
                            {lead.fullName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            MBI: {lead.mbi} • {lead.vendor.name}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        <Box display="flex" alignItems="center">
                          <PhoneIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {lead.formattedPhone}
                          </Typography>
                        </Box>
                        
                        {lead.age && (
                          <Typography variant="body2" color="text.secondary">
                            Age {lead.age}
                          </Typography>
                        )}
                        
                        <Typography variant="body2" color="text.secondary">
                          {lead.quickInfo.daysSinceSubmission} days ago
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                        <Chip
                          label={lead.statusLabel}
                          color={getStatusColor(lead.status)}
                          size="small"
                        />
                        
                        {lead.isDuplicate && (
                          <Chip
                            label="Duplicate"
                            color="error"
                            size="small"
                            icon={<WarningIcon />}
                          />
                        )}
                        
                        {lead.hasActiveAlerts && (
                          <Chip
                            label={`${lead.activeAlerts.length} Alert${lead.activeAlerts.length > 1 ? 's' : ''}`}
                            color="warning"
                            size="small"
                            icon={<WarningIcon />}
                          />
                        )}
                        
                        {showActions && (
                          <Box display="flex" gap={1} mt={1}>
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                onLeadSelect(lead.id, lead);
                              }}
                            >
                              View Details
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
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