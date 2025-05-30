'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Activity, 
  Users, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  UserPlus, 
  Phone, 
  Mail, 
  AlertCircle,
  Heart,
  Stethoscope,
  Pill,
  Shield,
  Clock,
  MapPin,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Search,
  Settings,
  Moon,
  Sun,
  Plus
} from 'lucide-react'
import { DashboardMetrics, Lead, RealtimeActivity } from '@/types'
import { formatCurrency, formatNumber, formatPercentage, formatRelativeTime } from '@/lib/utils'
import { useTheme } from 'next-themes'

// Mock data - In production, this would come from your API
const mockMetrics: DashboardMetrics = {
  totalLeads: 12847,
  newLeadsToday: 43,
  conversionRate: 0.187,
  averageLeadScore: 74,
  revenueThisMonth: 285000,
  appointmentsToday: 28,
  topPerformers: [
    {
      userId: '1',
      user: {
        id: '1',
        firstName: 'Sarah',
        lastName: 'Johnson',
        fullName: 'Sarah Johnson',
        email: 'sarah.johnson@healthcareleads.com',
        role: { id: '1', name: 'Senior Lead Specialist', description: '', level: 3, permissions: [] },
        permissions: [],
        preferences: { theme: 'light', language: 'en', timezone: 'UTC', notifications: { email: true, sms: true, push: true, leadAssignments: true, systemAlerts: true, weeklyReports: true }, dashboard: { layout: 'comfortable', widgets: [], refreshInterval: 30 } },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      leadsAssigned: 67,
      leadsConverted: 14,
      conversionRate: 0.209,
      revenue: 42000,
      avgResponseTime: 8,
      customerSatisfaction: 4.8,
      activitiesLogged: 145
    }
  ],
  leadsByStatus: [
    { status: 'new', count: 234, percentage: 18.2, trend: 12.5 },
    { status: 'contacted', count: 456, percentage: 35.5, trend: -3.2 },
    { status: 'qualified', count: 189, percentage: 14.7, trend: 8.1 },
    { status: 'appointment_scheduled', count: 123, percentage: 9.6, trend: 15.3 },
    { status: 'consultation_completed', count: 89, percentage: 6.9, trend: 4.7 },
    { status: 'closed_won', count: 67, percentage: 5.2, trend: 18.9 },
    { status: 'closed_lost', count: 134, percentage: 10.4, trend: -7.8 }
  ],
  leadsBySource: [
    { source: 'Website', count: 3847, percentage: 30.0, conversionRate: 0.23, costPerLead: 45, revenue: 89000 },
    { source: 'Referral', count: 2563, percentage: 20.0, conversionRate: 0.34, costPerLead: 12, revenue: 156000 },
    { source: 'Social Media', count: 1923, percentage: 15.0, conversionRate: 0.18, costPerLead: 67, revenue: 67000 },
    { source: 'Advertisement', count: 2051, percentage: 16.0, conversionRate: 0.15, costPerLead: 89, revenue: 45000 }
  ],
  conversionFunnel: [
    { stage: 'Leads Generated', count: 12847, conversionRate: 1.0, dropOffRate: 0 },
    { stage: 'Contacted', count: 8923, conversionRate: 0.69, dropOffRate: 0.31 },
    { stage: 'Qualified', count: 4567, conversionRate: 0.51, dropOffRate: 0.49 },
    { stage: 'Appointment Set', count: 2234, conversionRate: 0.49, dropOffRate: 0.51 },
    { stage: 'Consultation', count: 1567, conversionRate: 0.70, dropOffRate: 0.30 },
    { stage: 'Converted', count: 967, conversionRate: 0.62, dropOffRate: 0.38 }
  ],
  monthlyTrends: [],
  realTimeActivity: [
    {
      id: '1',
      type: 'lead_created',
      description: 'New lead: Maria Rodriguez from cardiac consultation inquiry',
      user: {
        id: '1',
        firstName: 'System',
        lastName: 'Auto',
        fullName: 'System Auto',
        email: 'system@healthcareleads.com',
        role: { id: '1', name: 'System', description: '', level: 0, permissions: [] },
        permissions: [],
        preferences: { theme: 'light', language: 'en', timezone: 'UTC', notifications: { email: true, sms: true, push: true, leadAssignments: true, systemAlerts: true, weeklyReports: true }, dashboard: { layout: 'comfortable', widgets: [], refreshInterval: 30 } },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      timestamp: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
    },
    {
      id: '2',
      type: 'appointment_scheduled',
      description: 'Appointment scheduled with Dr. Smith for orthopedic consultation',
      user: {
        id: '2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        fullName: 'Sarah Johnson',
        email: 'sarah.johnson@healthcareleads.com',
        role: { id: '1', name: 'Lead Specialist', description: '', level: 2, permissions: [] },
        permissions: [],
        preferences: { theme: 'light', language: 'en', timezone: 'UTC', notifications: { email: true, sms: true, push: true, leadAssignments: true, systemAlerts: true, weeklyReports: true }, dashboard: { layout: 'comfortable', widgets: [], refreshInterval: 30 } },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    }
  ]
}

const MetricCard: React.FC<{
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}> = ({ title, value, change, icon, description, trend = 'neutral', className = '' }) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-success-600" />
    if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-error-600" />
    return null
  }

  const getTrendColor = () => {
    if (trend === 'up') return 'text-success-600'
    if (trend === 'down') return 'text-error-600'
    return 'text-secondary-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card variant="elevated" className={`${className} hover:shadow-lg transition-all duration-200`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-secondary-600 dark:text-secondary-400">
            {title}
          </CardTitle>
          <div className="text-primary-600 dark:text-primary-400">
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            {value}
          </div>
          {(change !== undefined || description) && (
            <div className="flex items-center space-x-2 mt-1">
              {change !== undefined && (
                <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span className="text-xs font-medium">
                    {Math.abs(change)}%
                  </span>
                </div>
              )}
              {description && (
                <p className="text-xs text-secondary-600 dark:text-secondary-400">
                  {description}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

const ActivityFeed: React.FC<{ activities: RealtimeActivity[] }> = ({ activities }) => {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-primary-600" />
          <span>Real-Time Activity</span>
        </CardTitle>
        <CardDescription>
          Live updates from your healthcare lead management system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start space-x-3 p-3 rounded-xl bg-secondary-50 dark:bg-secondary-800/50"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  {activity.type === 'lead_created' && <UserPlus className="h-4 w-4 text-primary-600" />}
                  {activity.type === 'appointment_scheduled' && <Calendar className="h-4 w-4 text-primary-600" />}
                  {activity.type === 'call_completed' && <Phone className="h-4 w-4 text-primary-600" />}
                  {activity.type === 'email_sent' && <Mail className="h-4 w-4 text-primary-600" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                  {activity.description}
                </p>
                <p className="text-xs text-secondary-600 dark:text-secondary-400">
                  {activity.user.fullName} • {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const QuickActions: React.FC = () => {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common tasks and shortcuts for healthcare lead management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="justify-start h-auto p-4"
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            <div className="text-left">
              <div className="font-medium">Add Lead</div>
              <div className="text-xs text-secondary-600">Create new patient lead</div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="justify-start h-auto p-4"
            leftIcon={<Calendar className="h-4 w-4" />}
          >
            <div className="text-left">
              <div className="font-medium">Schedule</div>
              <div className="text-xs text-secondary-600">Book appointment</div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="justify-start h-auto p-4"
            leftIcon={<Phone className="h-4 w-4" />}
          >
            <div className="text-left">
              <div className="font-medium">Call Lead</div>
              <div className="text-xs text-secondary-600">Make outbound call</div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="justify-start h-auto p-4"
            leftIcon={<BarChart3 className="h-4 w-4" />}
          >
            <div className="text-left">
              <div className="font-medium">Reports</div>
              <div className="text-xs text-secondary-600">View analytics</div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const TopPerformers: React.FC<{ performers: any[] }> = ({ performers }) => {
  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-success-600" />
          <span>Top Performers</span>
        </CardTitle>
        <CardDescription>
          Leading healthcare specialists this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {performers.map((performer, index) => (
            <div key={performer.userId} className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold">
                  {performer.user.firstName.charAt(0)}{performer.user.lastName.charAt(0)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                  {performer.user.fullName}
                </p>
                <p className="text-xs text-secondary-600 dark:text-secondary-400">
                  {formatPercentage(performer.conversionRate)} conversion • {formatCurrency(performer.revenue)}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200">
                  #{index + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { theme, setTheme } = useTheme()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const getTrendDirection = (change: number): 'up' | 'down' | 'neutral' => {
    if (change > 0) return 'up'
    if (change < 0) return 'down'
    return 'neutral'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-white dark:from-secondary-950 dark:to-secondary-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-secondary-200 dark:border-secondary-800 bg-white/80 dark:bg-secondary-900/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-secondary-900 dark:text-secondary-100">
                    HealthCare Leads
                  </h1>
                  <p className="text-xs text-secondary-600 dark:text-secondary-400">
                    Enterprise Lead Management
                  </p>
                </div>
              </div>
              <nav className="hidden md:flex items-center space-x-6">
                <Button variant="ghost" className="text-sm">Dashboard</Button>
                <Button variant="ghost" className="text-sm">Leads</Button>
                <Button variant="ghost" className="text-sm">Appointments</Button>
                <Button variant="ghost" className="text-sm">Analytics</Button>
                <Button variant="ghost" className="text-sm">Campaigns</Button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                New Lead
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <h2 className="text-4xl font-bold text-gradient-primary">
            Welcome to Your Healthcare Dashboard
          </h2>
          <p className="text-lg text-secondary-600 dark:text-secondary-400 max-w-3xl mx-auto">
            Monitor your patient leads, track conversions, and manage appointments with enterprise-grade analytics and HIPAA-compliant security.
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-secondary-600 dark:text-secondary-400">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-primary-600" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary-600" />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-4 w-4 text-primary-600" />
              <span>Healthcare CRM</span>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Leads"
            value={formatNumber(mockMetrics.totalLeads)}
            change={12.5}
            trend="up"
            icon={<Users className="h-5 w-5" />}
            description="from last month"
          />
          <MetricCard
            title="New Today"
            value={mockMetrics.newLeadsToday}
            change={8.3}
            trend="up"
            icon={<UserPlus className="h-5 w-5" />}
            description="leads acquired"
          />
          <MetricCard
            title="Conversion Rate"
            value={formatPercentage(mockMetrics.conversionRate)}
            change={3.2}
            trend="up"
            icon={<TrendingUp className="h-5 w-5" />}
            description="this month"
          />
          <MetricCard
            title="Revenue"
            value={formatCurrency(mockMetrics.revenueThisMonth)}
            change={15.7}
            trend="up"
            icon={<DollarSign className="h-5 w-5" />}
            description="this month"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Avg Lead Score"
            value={mockMetrics.averageLeadScore}
            change={2.1}
            trend="up"
            icon={<BarChart3 className="h-5 w-5" />}
            description="out of 100"
          />
          <MetricCard
            title="Appointments Today"
            value={mockMetrics.appointmentsToday}
            change={-5.3}
            trend="down"
            icon={<Calendar className="h-5 w-5" />}
            description="scheduled"
          />
          <MetricCard
            title="Active Campaigns"
            value="12"
            change={25.0}
            trend="up"
            icon={<AlertCircle className="h-5 w-5" />}
            description="running"
          />
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <ActivityFeed activities={mockMetrics.realTimeActivity} />
          </div>
          <div className="space-y-8">
            <QuickActions />
            <TopPerformers performers={mockMetrics.topPerformers} />
          </div>
        </div>
      </main>
    </div>
  )
}
