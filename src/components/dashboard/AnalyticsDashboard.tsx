'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Assignment,
  LocalShipping,
  CheckCircle,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { DashboardMetrics } from '@/types';
import { apiClient } from '@/lib/api/client';
import useStore from '@/store/useStore';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
}

function MetricCard({ title, value, icon, trend, color = 'primary.main' }: MetricCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend > 0 ? (
                  <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ color: 'error.main', mr: 0.5 }} />
                )}
                <Typography
                  variant="body2"
                  color={trend > 0 ? 'success.main' : 'error.main'}
                >
                  {Math.abs(trend)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: '50%',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [isLoading, setIsLoading] = useState(true);
  const { metrics, setMetrics } = useStore();

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time updates
    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      const data = await apiClient.get<DashboardMetrics>(`/analytics/dashboard?range=${timeRange}`);
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock chart data - replace with real data from API
  const conversionFunnelData = [
    { name: 'Submitted', value: 1000 },
    { name: 'Qualified', value: 750 },
    { name: 'Approved', value: 600 },
    { name: 'Shipped', value: 500 },
    { name: 'Completed', value: 400 },
  ];

  const weeklyTrendData = Array.from({ length: 7 }, (_, i) => ({
    date: format(subDays(new Date(), 6 - i), 'MMM dd'),
    leads: Math.floor(Math.random() * 100) + 50,
    completed: Math.floor(Math.random() * 50) + 20,
  }));

  const testTypeData = [
    { name: 'Immune', value: metrics?.byTestType.immune.total || 0 },
    { name: 'Neuro', value: metrics?.byTestType.neuro.total || 0 },
  ];

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Analytics Dashboard
        </Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, value) => value && setTimeRange(value)}
          size="small"
        >
          <ToggleButton value="day">Day</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Leads"
            value={metrics?.totalLeads || 0}
            icon={<People sx={{ color: 'white' }} />}
            trend={12}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Qualified Leads"
            value={metrics?.conversionRates.submittedToQualified 
              ? `${(metrics.conversionRates.submittedToQualified * 100).toFixed(1)}%`
              : '0%'}
            icon={<Assignment sx={{ color: 'white' }} />}
            trend={-5}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Kits Shipped"
            value={metrics?.leadsThisMonth || 0}
            icon={<LocalShipping sx={{ color: 'white' }} />}
            trend={8}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Completed Kits"
            value={metrics?.conversionRates.overallConversion 
              ? `${(metrics.conversionRates.overallConversion * 100).toFixed(1)}%`
              : '0%'}
            icon={<CheckCircle sx={{ color: 'white' }} />}
            trend={15}
            color="success.main"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Conversion Funnel */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Conversion Funnel
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={conversionFunnelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Test Type Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Test Type Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={testTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {testTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Weekly Trend */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Weekly Lead Trend
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#8884d8"
                  name="New Leads"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#82ca9d"
                  name="Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Vendor Performance Table */}
      <Grid item xs={12} sx={{ mt: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Top Vendor Performance
          </Typography>
          {metrics?.vendorPerformance && metrics.vendorPerformance.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Vendor</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Total Leads</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Qualified</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Completed</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.vendorPerformance.slice(0, 5).map((vendor, index) => (
                    <tr key={vendor.vendorId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px' }}>{vendor.vendorName}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{vendor.totalLeads}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{vendor.qualifiedLeads}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{vendor.completedKits}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {(vendor.conversionRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          ) : (
            <Typography color="text.secondary">No vendor data available</Typography>
          )}
        </Paper>
      </Grid>
    </Box>
  );
} 