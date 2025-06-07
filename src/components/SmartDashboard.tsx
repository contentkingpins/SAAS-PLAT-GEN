import React, { useEffect } from 'react';
import { useAutoRefresh, useAutoRefreshData } from '@/hooks/useAutoRefresh';

interface DashboardMetrics {
  totalLeads: number;
  leadsToday: number;
  activeAlerts: number;
  conversionRate: number;
  duplicatesDetected: number;
  lastUpdated: Date;
}

export function SmartDashboard() {
  // Fetch dashboard metrics with auto-refresh
  const {
    data: metrics,
    loading,
    error,
    refresh: manualRefresh,
    autoRefresh
  } = useAutoRefreshData<DashboardMetrics>(
    async () => {
      const response = await fetch('/api/dashboard/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    [], // dependencies
    {
      interval: 30000, // 30 seconds
      pauseOnFormActivity: true,
      pauseOnRoutes: ['/leads/new', '/leads/edit', '/vendors/new', '/vendors/edit']
    }
  );

  return (
    <div className="p-6 space-y-6">
      {/* Auto-refresh status indicator */}
      <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${autoRefresh.isActive ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm">
            Auto-refresh: {autoRefresh.isActive ? 'Active' : 'Paused'}
          </span>
          {autoRefresh.status.isPausedForForms && (
            <span className="text-xs text-blue-600">(Form editing detected)</span>
          )}
          {autoRefresh.status.isPausedForRoute && (
            <span className="text-xs text-blue-600">(On editing page)</span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {autoRefresh.lastRefresh && (
            <span className="text-xs text-gray-500">
              Last update: {autoRefresh.lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={manualRefresh}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </div>

      {/* Dashboard metrics */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Failed to load dashboard data: {error.message}</p>
          <button 
            onClick={manualRefresh}
            className="mt-2 text-sm text-red-600 underline"
          >
            Try again
          </button>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Total Leads"
            value={metrics.totalLeads}
            className="bg-blue-50 border-blue-200"
          />
          <MetricCard
            title="Leads Today"
            value={metrics.leadsToday}
            className="bg-green-50 border-green-200"
          />
          <MetricCard
            title="Active Alerts"
            value={metrics.activeAlerts}
            className="bg-red-50 border-red-200"
            alert={metrics.activeAlerts > 0}
          />
          <MetricCard
            title="Conversion Rate"
            value={`${(metrics.conversionRate * 100).toFixed(1)}%`}
            className="bg-purple-50 border-purple-200"
          />
          <MetricCard
            title="Duplicates Detected"
            value={metrics.duplicatesDetected}
            className="bg-yellow-50 border-yellow-200"
          />
          <MetricCard
            title="Last Updated"
            value={new Date(metrics.lastUpdated).toLocaleTimeString()}
            className="bg-gray-50 border-gray-200"
          />
        </div>
      )}

      {loading && !metrics && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  className?: string;
  alert?: boolean;
}

function MetricCard({ title, value, className = '', alert = false }: MetricCardProps) {
  return (
    <div className={`border rounded-lg p-4 ${className} ${alert ? 'ring-2 ring-red-400' : ''}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
        {alert && (
          <span className="ml-2 text-sm">
            ⚠️
          </span>
        )}
      </p>
    </div>
  );
}

export default SmartDashboard; 