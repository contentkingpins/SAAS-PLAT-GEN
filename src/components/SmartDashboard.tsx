'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

interface DashboardMetrics {
  totalLeads: number;
  leadsToday: number;
  activeAlerts: number;
  conversionRate: number;
  duplicatesDetected: number;
  lastUpdated: Date;
}

export function SmartDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiClient.get('/api/analytics/dashboard');
      setMetrics(data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err);
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Refresh controls */}
      <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${!loading ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm">
            Dashboard Status: {!loading ? 'Ready' : 'Loading'}
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {lastRefresh && (
            <span className="text-xs text-gray-500">
              Last update: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchMetrics}
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
            onClick={fetchMetrics}
            className="mt-2 text-sm text-red-600 underline"
          >
            Try again
          </button>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Leads</h3>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalLeads || 0}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Leads Today</h3>
            <p className="text-2xl font-bold text-blue-600">{metrics.leadsToday || 0}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">This Week</h3>
            <p className="text-2xl font-bold text-green-600">{metrics.leadsThisWeek || 0}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
            <p className="text-2xl font-bold text-purple-600">
              {metrics.conversionRates?.overallConversion 
                ? `${(metrics.conversionRates.overallConversion * 100).toFixed(1)}%` 
                : '0%'
              }
            </p>
          </div>
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