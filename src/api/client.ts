import { 
  AuthSession, 
  DashboardSummary, 
  Lead, 
  Customer, 
  FollowUp, 
  Interaction, 
  AnalyticsData, 
  BusinessProfile,
  ExtractedVoiceLead
} from '../types';

export interface LocalBackupInfo {
  id: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  createdAt: string;
  verified: boolean;
  notes?: string;
}

export class ApiClient {
  private static getHeaders(token?: string | null): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private static getBusinessBase(businessId: string, customServerUrl?: string): string {
    if (customServerUrl && customServerUrl.startsWith('http')) {
      return customServerUrl;
    }
    return `/api/business-server/${businessId}`;
  }

  // ----------------------------------------------------------------
  // Central Authentication Server APIs (Product Owner Server)
  // ----------------------------------------------------------------

  public static async requestWhatsAppOtp(phone: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
    const res = await fetch('/api/central-auth/request-otp', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
    return data;
  }

  public static async verifyWhatsAppOtp(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/central-auth/verify-otp', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ phone, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid OTP');
    return data;
  }

  public static async login(phone: string, pin: string): Promise<AuthSession> {
    const res = await fetch('/api/central-auth/login', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ phone, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  }

  public static async checkSession(token: string): Promise<AuthSession['user']> {
    const res = await fetch('/api/central-auth/me', {
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Session expired');
    return data;
  }

  public static async logout(token: string): Promise<void> {
    await fetch('/api/central-auth/logout', {
      method: 'POST',
      headers: this.getHeaders(token),
    });
  }

  public static async discoverBusinessServer(businessId: string): Promise<{ serverUrl: string; status: string }> {
    const res = await fetch(`/api/central-auth/discover/${businessId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Business server discovery failed');
    return data;
  }

  // ----------------------------------------------------------------
  // Independent Business Server APIs (Business-Owned Local Machine)
  // ----------------------------------------------------------------

  public static async getDashboard(businessId: string, token: string, customServerUrl?: string): Promise<DashboardSummary> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/dashboard`, {
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch dashboard');
    return data;
  }

  public static async getLeads(businessId: string, token: string, includeArchived = false, customServerUrl?: string): Promise<Lead[]> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/leads?includeArchived=${includeArchived}`, {
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch leads');
    return data;
  }

  public static async createLead(businessId: string, token: string, leadData: Partial<Lead>, customServerUrl?: string): Promise<Lead> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/leads`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(leadData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create lead');
    return data;
  }

  public static async updateLead(businessId: string, token: string, leadId: string, updates: Partial<Lead>, customServerUrl?: string): Promise<Lead> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/leads/${leadId}`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update lead');
    return data;
  }

  public static async archiveLead(businessId: string, token: string, leadId: string, isArchived: boolean, customServerUrl?: string): Promise<Lead> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/leads/${leadId}/archive`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ isArchived }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to archive lead');
    return data;
  }

  public static async deleteLead(businessId: string, token: string, leadId: string, customServerUrl?: string): Promise<boolean> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/leads/${leadId}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete lead');
    return data.success;
  }

  public static async convertLead(businessId: string, token: string, leadId: string, dealValue?: number, customerNotes?: string, customServerUrl?: string): Promise<Customer> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/leads/${leadId}/convert`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ dealValue, customerNotes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to convert lead');
    return data;
  }

  // Customers
  public static async getCustomers(businessId: string, token: string, customServerUrl?: string): Promise<Customer[]> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/customers`, {
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch customers');
    return data;
  }

  // Follow-ups
  public static async getFollowUps(businessId: string, token: string, status?: 'pending' | 'completed', customServerUrl?: string): Promise<FollowUp[]> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const url = status ? `${base}/followups?status=${status}` : `${base}/followups`;
    const res = await fetch(url, {
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch follow-ups');
    return data;
  }

  public static async scheduleFollowUp(businessId: string, token: string, payload: Partial<FollowUp>, customServerUrl?: string): Promise<FollowUp> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/followups`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to schedule follow-up');
    return data;
  }

  public static async completeFollowUp(businessId: string, token: string, followUpId: string, completionNotes?: string, customServerUrl?: string): Promise<FollowUp> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/followups/${followUpId}/complete`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify({ completionNotes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete follow-up');
    return data;
  }

  public static async rescheduleFollowUp(businessId: string, token: string, followUpId: string, dueDate: string, dueTime?: string, customServerUrl?: string): Promise<FollowUp> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/followups/${followUpId}/reschedule`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify({ dueDate, dueTime }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reschedule follow-up');
    return data;
  }

  // Interactions
  public static async getInteractions(businessId: string, token: string, entityId: string, customServerUrl?: string): Promise<Interaction[]> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/interactions/${entityId}`, {
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch interactions');
    return data;
  }

  public static async addInteraction(businessId: string, token: string, payload: Partial<Interaction>, customServerUrl?: string): Promise<Interaction> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/interactions`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add interaction');
    return data;
  }

  // Analytics
  public static async getAnalytics(businessId: string, token: string, customServerUrl?: string): Promise<AnalyticsData> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/analytics`, {
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch analytics');
    return data;
  }

  // Profile Settings
  public static async getProfile(businessId: string, token: string, customServerUrl?: string): Promise<BusinessProfile> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/profile`, {
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch profile');
    return data;
  }

  public static async updateProfile(businessId: string, token: string, profile: Partial<BusinessProfile>, customServerUrl?: string): Promise<BusinessProfile> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/profile`, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    return data;
  }

  // Local-Only Voice NLP Extraction (Executed on business server with zero external AI calls)
  public static async extractVoiceLead(transcript: string, businessId = 'biz_sharma_enterprises', token?: string, customServerUrl?: string): Promise<ExtractedVoiceLead> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/voice/extract`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ transcript, today: new Date().toISOString().split('T')[0] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to process voice transcript');
    return data.extracted;
  }

  // Local Backup and Recovery APIs
  public static async createBackup(businessId: string, token: string, notes?: string, customServerUrl?: string): Promise<LocalBackupInfo> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/backups`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Backup creation failed');
    return data;
  }

  public static async getBackups(businessId: string, token: string, customServerUrl?: string): Promise<LocalBackupInfo[]> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/backups`, {
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to list backups');
    return data;
  }

  public static async verifyBackup(businessId: string, token: string, fileName: string, customServerUrl?: string): Promise<{ isValid: boolean; checksumMatch: boolean; integrityCheck: string }> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/backups/${encodeURIComponent(fileName)}/verify`, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Backup verification failed');
    return data;
  }

  public static async restoreBackup(businessId: string, token: string, fileName: string, customServerUrl?: string): Promise<{ success: boolean; safetyBackupFile: string; message: string }> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/backups/${encodeURIComponent(fileName)}/restore`, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Backup restoration failed');
    return data;
  }

  public static async triggerRecovery(businessId: string, token: string, customServerUrl?: string): Promise<{ status: string; integrityCheck: string }> {
    const base = this.getBusinessBase(businessId, customServerUrl);
    const res = await fetch(`${base}/maintenance/recovery`, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Database recovery failed');
    return data;
  }
}
