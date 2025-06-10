// User Types
export type UserRole = 'admin' | 'vendor' | 'advocate' | 'collections';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  vendorId?: string; // For vendors
  teamId?: string; // For advocates and collections
}

// Vendor Types
export interface Vendor {
  id: string;
  name: string;
  code: string;
  parentVendorId?: string; // For sub-vendors
  staticCode: string; // For tracking
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Lead Types
export type TestType = 'immune' | 'neuro';

export type LeadStatus = 
  | 'SUBMITTED'
  | 'ADVOCATE_REVIEW'
  | 'QUALIFIED'
  | 'SENT_TO_CONSULT'
  | 'APPROVED'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'COLLECTIONS'
  | 'KIT_COMPLETED'
  | 'RETURNED';

export type AdvocateDisposition = 
  | 'DOESNT_QUALIFY'
  | 'COMPLIANCE_ISSUE'
  | 'PATIENT_DECLINED'
  | 'CALL_BACK'
  | 'CONNECTED_TO_COMPLIANCE'
  | 'CALL_DROPPED';

export type CollectionsDisposition =
  | 'NO_ANSWER'
  | 'SCHEDULED_CALLBACK'
  | 'KIT_COMPLETED';

export interface ComplianceChecklist {
  verifyDobAddress: boolean;
  patientConsent: boolean;
  notInCareFacility: boolean;
  makesMedicalDecisions: boolean;
  understandsBilling: boolean;
  noCognitiveImpairment: boolean;
  agentNotMedicare: boolean;
  noIncentives: boolean;
  futureContactConsent: boolean;
  completedAt?: Date;
  completedBy?: string;
}

export interface Lead {
  id: string;
  mbi: string; // Medicare Beneficiary Identifier
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  
  // Tracking
  vendorId: string;
  subVendorId?: string;
  vendorCode: string;
  
  // Status
  status: LeadStatus;
  testType?: TestType;
  
  // Advocate Info
  advocateId?: string;
  advocateDisposition?: AdvocateDisposition;
  complianceChecklist?: ComplianceChecklist;
  advocateNotes?: string;
  advocateReviewedAt?: Date;
  
  // Collections Info
  collectionsAgentId?: string;
  collectionsDisposition?: CollectionsDisposition;
  contactAttempts: number;
  lastContactAttempt?: Date;
  nextCallbackDate?: Date;
  collectionsNotes?: string;
  
  // Medical Info
  doctorApprovalStatus?: 'pending' | 'approved' | 'declined';
  doctorApprovalDate?: Date;
  consultDate?: Date;
  
  // Shipping Info
  kitShippedDate?: Date;
  trackingNumber?: string;
  kitReturnedDate?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Contact Attempt Types
export interface ContactAttempt {
  id: string;
  leadId: string;
  agentId: string;
  attemptDate: Date;
  outcome: 'no_answer' | 'busy' | 'voicemail' | 'connected' | 'wrong_number';
  notes?: string;
}

// Callback Types
export interface Callback {
  id: string;
  leadId: string;
  agentId: string;
  scheduledDate: Date;
  completed: boolean;
  completedDate?: Date;
  notes?: string;
}

// Analytics Types
export interface DashboardMetrics {
  totalLeads: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  
  conversionRates: {
    submittedToQualified: number;
    qualifiedToApproved: number;
    approvedToShipped: number;
    shippedToCompleted: number;
    overallConversion: number;
  };
  
  byTestType: {
    immune: {
      total: number;
      completed: number;
      conversionRate: number;
    };
    neuro: {
      total: number;
      completed: number;
      conversionRate: number;
    };
  };
  
  vendorPerformance: Array<{
    vendorId: string;
    vendorName: string;
    totalLeads: number;
    qualifiedLeads: number;
    completedKits: number;
    conversionRate: number;
  }>;
  
  agentPerformance: {
    advocates: Array<{
      agentId: string;
      agentName: string;
      callsHandled: number;
      leadsQualified: number;
      qualificationRate: number;
    }>;
    collections: Array<{
      agentId: string;
      agentName: string;
      attemptsToday: number;
      kitsCompleted: number;
      completionRate: number;
    }>;
  };
}

// Upload Types
export interface FileUpload {
  id: string;
  type: 'doctor_approval' | 'shipping_report' | 'kit_return';
  fileName: string;
  uploadedBy: string;
  uploadedAt: Date;
  processedAt?: Date;
  recordsProcessed: number;
  errors?: Array<{
    row: number;
    error: string;
  }>;
}

// WebSocket Event Types
export interface WSEvent {
  type: 'lead_updated' | 'new_lead' | 'agent_status' | 'metric_update';
  payload: any;
  timestamp: Date;
} 
