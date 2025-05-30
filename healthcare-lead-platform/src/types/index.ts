// User and Authentication Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  phone?: string
  avatar?: string
  role: UserRole
  department?: string
  title?: string
  permissions: Permission[]
  preferences: UserPreferences
  lastLogin?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserRole {
  id: string
  name: string
  description: string
  level: number
  permissions: Permission[]
}

export interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: NotificationSettings
  dashboard: DashboardSettings
}

export interface NotificationSettings {
  email: boolean
  sms: boolean
  push: boolean
  leadAssignments: boolean
  systemAlerts: boolean
  weeklyReports: boolean
}

export interface DashboardSettings {
  layout: 'compact' | 'comfortable' | 'spacious'
  widgets: string[]
  refreshInterval: number
}

// Lead Management Types
export interface Lead {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  dateOfBirth?: Date
  age?: number
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
  address: Address
  medicalInfo: MedicalInfo
  insuranceInfo: InsuranceInfo
  financialInfo: FinancialInfo
  preferences: LeadPreferences
  source: LeadSource
  status: LeadStatus
  priority: LeadPriority
  score: number
  assignedTo?: string
  assignedAgent?: User
  notes: Note[]
  activities: Activity[]
  communications: Communication[]
  appointments: Appointment[]
  tags: string[]
  customFields: Record<string, any>
  createdAt: Date
  updatedAt: Date
  lastContactDate?: Date
  nextFollowUpDate?: Date
  conversionDate?: Date
  estimatedValue?: number
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface MedicalInfo {
  conditions: string[]
  medications: string[]
  allergies: string[]
  primaryPhysician?: string
  medicalHistory?: string
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  treatmentType?: string
  preferredSpecialty?: string
}

export interface InsuranceInfo {
  provider?: string
  policyNumber?: string
  groupNumber?: string
  coverage: 'full' | 'partial' | 'none' | 'unknown'
  copay?: number
  deductible?: number
  outOfPocketMax?: number
  isVerified: boolean
  verificationDate?: Date
}

export interface FinancialInfo {
  householdIncome?: number
  creditScore?: number
  paymentCapacity: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
  financingInterest: boolean
  budgetRange?: {
    min: number
    max: number
  }
}

export interface LeadPreferences {
  communicationMethod: 'phone' | 'email' | 'sms' | 'mail'
  bestTimeToContact: string
  language: string
  doNotCall: boolean
  marketingOptIn: boolean
}

export interface LeadSource {
  channel: 'website' | 'referral' | 'social_media' | 'advertisement' | 'event' | 'cold_call' | 'other'
  campaign?: string
  medium?: string
  referrer?: string
  landingPage?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  cost?: number
}

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'interested'
  | 'appointment_scheduled'
  | 'consultation_completed'
  | 'proposal_sent'
  | 'negotiating'
  | 'closed_won'
  | 'closed_lost'
  | 'on_hold'
  | 'nurturing'

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent'

// Communication Types
export interface Communication {
  id: string
  leadId: string
  userId: string
  user: User
  type: 'phone' | 'email' | 'sms' | 'in_person' | 'video_call' | 'letter'
  direction: 'inbound' | 'outbound'
  subject?: string
  content: string
  duration?: number // in seconds for calls
  outcome: 'successful' | 'no_answer' | 'busy' | 'voicemail' | 'callback_requested' | 'not_interested' | 'qualified'
  nextAction?: string
  nextActionDate?: Date
  attachments: Attachment[]
  recordingUrl?: string
  transcription?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  createdAt: Date
  updatedAt: Date
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  thumbnailUrl?: string
  uploadedBy: string
  uploadedAt: Date
}

// Activity and Notes Types
export interface Activity {
  id: string
  leadId: string
  userId: string
  user: User
  type: 'note' | 'task' | 'call' | 'email' | 'meeting' | 'status_change' | 'assignment' | 'system'
  title: string
  description: string
  metadata?: Record<string, any>
  isCompleted?: boolean
  completedAt?: Date
  dueDate?: Date
  priority?: 'low' | 'medium' | 'high'
  createdAt: Date
  updatedAt: Date
}

export interface Note {
  id: string
  leadId: string
  userId: string
  user: User
  content: string
  type: 'general' | 'medical' | 'financial' | 'follow_up' | 'warning'
  isPrivate: boolean
  isPinned: boolean
  attachments: Attachment[]
  mentions: string[]
  createdAt: Date
  updatedAt: Date
}

// Appointment Types
export interface Appointment {
  id: string
  leadId: string
  lead: Lead
  assignedTo: string
  assignedAgent: User
  title: string
  description?: string
  type: 'consultation' | 'follow_up' | 'procedure' | 'screening' | 'education'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
  startTime: Date
  endTime: Date
  duration: number // in minutes
  location?: {
    type: 'in_person' | 'virtual' | 'phone'
    address?: Address
    meetingUrl?: string
    phone?: string
  }
  reminders: Reminder[]
  notes?: string
  outcome?: string
  nextSteps?: string
  attendees: string[]
  cost?: number
  revenue?: number
  createdAt: Date
  updatedAt: Date
}

export interface Reminder {
  id: string
  type: 'email' | 'sms' | 'push'
  scheduledFor: Date
  isSent: boolean
  sentAt?: Date
}

// Analytics and Reporting Types
export interface DashboardMetrics {
  totalLeads: number
  newLeadsToday: number
  conversionRate: number
  averageLeadScore: number
  revenueThisMonth: number
  appointmentsToday: number
  topPerformers: AgentPerformance[]
  leadsByStatus: StatusDistribution[]
  leadsBySource: SourceDistribution[]
  conversionFunnel: FunnelData[]
  monthlyTrends: TrendData[]
  realTimeActivity: RealtimeActivity[]
}

export interface AgentPerformance {
  userId: string
  user: User
  leadsAssigned: number
  leadsConverted: number
  conversionRate: number
  revenue: number
  avgResponseTime: number // in minutes
  customerSatisfaction: number
  activitiesLogged: number
}

export interface StatusDistribution {
  status: LeadStatus
  count: number
  percentage: number
  trend: number // percentage change from previous period
}

export interface SourceDistribution {
  source: string
  count: number
  percentage: number
  conversionRate: number
  costPerLead?: number
  revenue?: number
}

export interface FunnelData {
  stage: string
  count: number
  conversionRate: number
  dropOffRate: number
}

export interface TrendData {
  date: string
  leads: number
  conversions: number
  revenue: number
  averageScore: number
}

export interface RealtimeActivity {
  id: string
  type: 'lead_created' | 'lead_updated' | 'appointment_scheduled' | 'call_completed' | 'email_sent'
  description: string
  user: User
  lead?: Lead
  timestamp: Date
}

// Campaign and Marketing Types
export interface Campaign {
  id: string
  name: string
  description?: string
  type: 'email' | 'sms' | 'direct_mail' | 'digital_ad' | 'social_media' | 'event'
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  budget?: number
  spent?: number
  targetAudience: TargetAudience
  content: CampaignContent
  schedule: CampaignSchedule
  metrics: CampaignMetrics
  leads: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  launchedAt?: Date
  completedAt?: Date
}

export interface TargetAudience {
  demographics: {
    ageRange?: { min: number; max: number }
    gender?: string[]
    incomeRange?: { min: number; max: number }
    location?: string[]
    conditions?: string[]
  }
  behavioral: {
    leadScore?: { min: number; max: number }
    engagementLevel?: string[]
    lastContactDays?: number
    appointmentHistory?: boolean
  }
  size: number
}

export interface CampaignContent {
  subject?: string
  message: string
  template?: string
  images?: string[]
  callToAction: string
  landingPage?: string
  personalizedFields: string[]
}

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'recurring'
  startDate?: Date
  endDate?: Date
  frequency?: 'daily' | 'weekly' | 'monthly'
  timezone: string
  sendTime?: string
}

export interface CampaignMetrics {
  sent: number
  delivered: number
  opened: number
  clicked: number
  responded: number
  converted: number
  unsubscribed: number
  deliveryRate: number
  openRate: number
  clickRate: number
  conversionRate: number
  roi: number
  costPerLead: number
  costPerConversion: number
}

// System and Configuration Types
export interface SystemConfig {
  company: CompanyInfo
  features: FeatureFlags
  integrations: Integration[]
  security: SecuritySettings
  compliance: ComplianceSettings
  notifications: SystemNotifications
}

export interface CompanyInfo {
  name: string
  address: Address
  phone: string
  email: string
  website: string
  logo: string
  timezone: string
  businessHours: BusinessHours[]
  fiscalYearStart: string
}

export interface BusinessHours {
  dayOfWeek: number
  isOpen: boolean
  openTime: string
  closeTime: string
}

export interface FeatureFlags {
  [key: string]: boolean
}

export interface Integration {
  id: string
  name: string
  type: 'crm' | 'ehr' | 'billing' | 'marketing' | 'communication' | 'analytics'
  provider: string
  isEnabled: boolean
  config: Record<string, any>
  lastSync?: Date
  status: 'connected' | 'disconnected' | 'error' | 'syncing'
}

export interface SecuritySettings {
  passwordPolicy: PasswordPolicy
  sessionTimeout: number
  mfaRequired: boolean
  ipWhitelist: string[]
  auditLogRetention: number
  encryptionLevel: string
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  expirationDays: number
  historyCount: number
}

export interface ComplianceSettings {
  hipaaEnabled: boolean
  gdprEnabled: boolean
  dataRetentionDays: number
  consentTracking: boolean
  auditTrail: boolean
  dataProcessingAgreements: string[]
}

export interface SystemNotifications {
  maintenanceMode: boolean
  maintenanceMessage?: string
  systemAlerts: SystemAlert[]
  announcements: Announcement[]
}

export interface SystemAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  isActive: boolean
  expiresAt?: Date
  createdAt: Date
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'feature' | 'maintenance' | 'policy' | 'training'
  audience: string[]
  isPublished: boolean
  publishedAt?: Date
  expiresAt?: Date
  createdAt: Date
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ApiMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: Date
}

export interface ApiMeta {
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  filters?: Record<string, any>
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
}

// UI Component Types
export interface TableColumn<T> {
  key: keyof T
  title: string
  width?: number
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, record: T) => React.ReactNode
}

export interface FilterOption {
  label: string
  value: string | number
  count?: number
}

export interface ChartData {
  label: string
  value: number
  color?: string
  trend?: number
}

export interface Widget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'list' | 'calendar'
  title: string
  size: 'small' | 'medium' | 'large'
  config: Record<string, any>
  data?: any
  refreshInterval?: number
  lastUpdated?: Date
} 