export type Language = 'en' | 'hi';

export type LeadStatus = 'New' | 'Contacted' | 'Interested' | 'Follow-up' | 'Converted' | 'Lost';
export type Priority = 'High' | 'Medium' | 'Low';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  requirement: string;
  source: string;
  status: LeadStatus;
  notes: string;
  budget: number;
  priority: Priority;
  isArchived: boolean;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  leadId?: string;
  name: string;
  phone: string;
  email: string;
  requirement: string;
  totalDealValue: number;
  status: 'Active' | 'VIP' | 'Past';
  notes: string;
  convertedAt: string;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  leadId?: string;
  customerId?: string;
  contactName: string;
  contactPhone: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // e.g. 11:00 AM
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  notes: string;
  completionNotes?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Interaction {
  id: string;
  entityType: 'lead' | 'customer';
  entityId: string;
  interactionType: 'call' | 'whatsapp' | 'note' | 'status_change' | 'meeting';
  summary: string;
  details?: string;
  createdAt: string;
}

export interface DashboardSummary {
  totalLeads: number;
  newLeads: number;
  activeLeads: number;
  convertedCustomers: number;
  followUpsDueToday: number;
  overdueFollowUps: number;
  conversionRate: number;
  recentLeads: Lead[];
  upcomingFollowUps: FollowUp[];
}

export interface AnalyticsData {
  totalLeads: number;
  convertedCount: number;
  conversionRate: string;
  statusBreakdown: { status: string; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  followUpStats: {
    total: number;
    completed: number;
    rate: number;
  };
}

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  phone: string;
  city: string;
  category: string;
  languagePref: Language;
  voicePref: string;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    phone: string;
    businessId: string;
    businessName: string;
    businessServerUrl: string;
  };
}

export interface ExtractedVoiceLead {
  name: string;
  phone: string;
  requirement: string;
  budget?: number;
  followUpDate: string;
  followUpTime: string;
  priority: Priority;
  source: string;
  notes: string;
  confidence: number;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
}
