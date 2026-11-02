import Database from 'better-sqlite3';
import { BusinessDatabaseManager } from './businessDatabase';

export interface LeadRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  requirement: string;
  source: string;
  status: 'New' | 'Contacted' | 'Interested' | 'Follow-up' | 'Converted' | 'Lost';
  notes: string;
  budget: number;
  priority: 'High' | 'Medium' | 'Low';
  isArchived: boolean;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRecord {
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

export interface FollowUpRecord {
  id: string;
  leadId?: string;
  customerId?: string;
  contactName: string;
  contactPhone: string;
  title: string;
  dueDate: string;
  dueTime: string;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  notes: string;
  completionNotes?: string;
  completedAt?: string;
  createdAt: string;
}

export interface InteractionRecord {
  id: string;
  entityType: 'lead' | 'customer';
  entityId: string;
  interactionType: 'call' | 'whatsapp' | 'note' | 'status_change' | 'meeting';
  summary: string;
  details?: string;
  createdAt: string;
}

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  phone: string;
  city: string;
  category: string;
  languagePref: 'en' | 'hi';
  voicePref: string;
}

export class BusinessDataService {
  private dbManager: BusinessDatabaseManager;
  public readonly businessId: string;

  constructor(dbManager: BusinessDatabaseManager) {
    this.dbManager = dbManager;
    this.businessId = dbManager.businessId;
    this.seedDefaultProfileIfEmpty();
  }

  private get db(): Database.Database {
    return this.dbManager.getRawDb();
  }

  private seedDefaultProfileIfEmpty() {
    const row = this.db.prepare('SELECT id FROM business_profile WHERE id = ?').get('profile_main');
    if (!row) {
      const defaultName = this.businessId === 'biz_sharma_enterprises' ? 'Sharma Trading & Services' : `Business ${this.businessId}`;
      const defaultOwner = this.businessId === 'biz_sharma_enterprises' ? 'Rajesh Sharma' : 'Business Owner';
      const defaultPhone = this.businessId === 'biz_sharma_enterprises' ? '+91 98201 44821' : '+91 98000 00000';
      const defaultCity = this.businessId === 'biz_sharma_enterprises' ? 'Pune, Maharashtra' : 'Mumbai, Maharashtra';
      const defaultCategory = this.businessId === 'biz_sharma_enterprises' ? 'Wholesale Hardware & Building Materials' : 'General Trading & Supplies';

      this.db.prepare(`
        INSERT INTO business_profile (id, business_name, owner_name, phone, city, category, language_pref, voice_pref)
        VALUES (?, ?, ?, ?, ?, ?, 'en', 'hi-IN')
      `).run('profile_main', defaultName, defaultOwner, defaultPhone, defaultCity, defaultCategory);
    }
  }

  // --- Leads CRUD ---
  public getLeads(includeArchived: boolean = false): LeadRecord[] {
    const query = includeArchived
      ? 'SELECT * FROM leads ORDER BY created_at DESC'
      : 'SELECT * FROM leads WHERE is_archived = 0 ORDER BY created_at DESC';
    const rows = this.db.prepare(query).all() as any[];
    return rows.map(r => this.mapLeadRow(r));
  }

  public getLeadById(id: string): LeadRecord | null {
    const row = this.db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;
    return row ? this.mapLeadRow(row) : null;
  }

  public createLead(data: Partial<Omit<LeadRecord, 'id' | 'createdAt' | 'updatedAt'>> & { name: string; phone: string; requirement: string }): LeadRecord {
    if (!data.name || !data.name.trim() || !data.phone || !data.phone.trim() || !data.requirement || !data.requirement.trim()) {
      throw new Error('Name, phone, and requirement are required fields');
    }

    const id = `lead_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO leads (id, name, phone, email, requirement, source, status, notes, budget, priority, is_archived, assigned_to, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name.trim(),
      data.phone.trim(),
      data.email?.trim() || '',
      data.requirement.trim(),
      data.source || 'Direct',
      data.status || 'New',
      data.notes || '',
      data.budget || 0,
      data.priority || 'Medium',
      data.isArchived ? 1 : 0,
      data.assignedTo || 'Owner',
      now,
      now
    );

    this.addInteraction({
      entityType: 'lead',
      entityId: id,
      interactionType: 'note',
      summary: `Lead created from ${data.source || 'Direct'}`,
      details: data.notes || '',
    });

    return this.getLeadById(id)!;
  }

  public updateLead(id: string, updates: Partial<Omit<LeadRecord, 'id' | 'createdAt'>>): LeadRecord {
    const current = this.getLeadById(id);
    if (!current) throw new Error('Lead not found');

    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };

    this.db.prepare(`
      UPDATE leads SET
        name = ?, phone = ?, email = ?, requirement = ?, source = ?, status = ?,
        notes = ?, budget = ?, priority = ?, is_archived = ?, assigned_to = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.phone,
      updated.email,
      updated.requirement,
      updated.source,
      updated.status,
      updated.notes,
      updated.budget,
      updated.priority,
      updated.isArchived ? 1 : 0,
      updated.assignedTo,
      updated.updatedAt,
      id
    );

    if (updates.status && updates.status !== current.status) {
      this.addInteraction({
        entityType: 'lead',
        entityId: id,
        interactionType: 'status_change',
        summary: `Status changed from ${current.status} to ${updates.status}`,
      });
    }

    return this.getLeadById(id)!;
  }

  public archiveLead(id: string, isArchived: boolean = true): LeadRecord {
    const current = this.getLeadById(id);
    if (!current) throw new Error('Lead not found');

    this.db.prepare('UPDATE leads SET is_archived = ?, updated_at = ? WHERE id = ?').run(
      isArchived ? 1 : 0,
      new Date().toISOString(),
      id
    );

    return this.getLeadById(id)!;
  }

  public deleteLead(id: string): boolean {
    const info = this.db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    return info.changes > 0;
  }

  // --- Lead-to-Customer Conversion ---
  public convertLeadToCustomer(leadId: string, dealValue: number = 0, notes: string = ''): CustomerRecord {
    const lead = this.getLeadById(leadId);
    if (!lead) throw new Error('Lead not found');

    const customerId = `cust_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.transaction(() => {
      // 1. Mark lead as Converted
      this.updateLead(leadId, { status: 'Converted' });

      // 2. Insert into customers table
      this.db.prepare(`
        INSERT INTO customers (id, lead_id, name, phone, email, requirement, total_deal_value, status, notes, converted_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?)
      `).run(
        customerId,
        lead.id,
        lead.name,
        lead.phone,
        lead.email,
        lead.requirement,
        dealValue || lead.budget || 0,
        notes || lead.notes,
        now,
        now
      );

      // 3. Log interaction
      this.addInteraction({
        entityType: 'customer',
        entityId: customerId,
        interactionType: 'status_change',
        summary: `Converted from lead "${lead.name}" with deal value ₹${dealValue || lead.budget}`,
        details: notes,
      });
    })();

    return this.getCustomerById(customerId)!;
  }

  // --- Customers CRUD ---
  public getCustomers(): CustomerRecord[] {
    const rows = this.db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all() as any[];
    return rows.map(r => this.mapCustomerRow(r));
  }

  public getCustomerById(id: string): CustomerRecord | null {
    const row = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    return row ? this.mapCustomerRow(row) : null;
  }

  // --- Follow-ups Management ---
  public getFollowUps(status?: 'pending' | 'completed' | 'cancelled'): FollowUpRecord[] {
    let query = 'SELECT * FROM follow_ups';
    const params: any[] = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY due_date ASC, due_time ASC';
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(r => this.mapFollowUpRow(r));
  }

  public scheduleFollowUp(data: Omit<FollowUpRecord, 'id' | 'status' | 'createdAt'>): FollowUpRecord {
    if (!data.contactName || !data.contactPhone || !data.title || !data.dueDate) {
      throw new Error('contactName, contactPhone, title, and dueDate are required fields');
    }

    const id = `flw_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO follow_ups (id, lead_id, customer_id, contact_name, contact_phone, title, due_date, due_time, status, priority, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(
      id,
      data.leadId || null,
      data.customerId || null,
      data.contactName,
      data.contactPhone,
      data.title,
      data.dueDate,
      data.dueTime || '11:00 AM',
      data.priority || 'medium',
      data.notes || '',
      now
    );

    return this.getFollowUpById(id)!;
  }

  public getFollowUpById(id: string): FollowUpRecord | null {
    const row = this.db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id) as any;
    return row ? this.mapFollowUpRow(row) : null;
  }

  public completeFollowUp(id: string, completionNotes: string = ''): FollowUpRecord {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE follow_ups SET
        status = 'completed',
        completion_notes = ?,
        completed_at = ?
      WHERE id = ?
    `).run(completionNotes, now, id);

    const followUp = this.getFollowUpById(id);
    if (followUp && (followUp.leadId || followUp.customerId)) {
      this.addInteraction({
        entityType: followUp.customerId ? 'customer' : 'lead',
        entityId: (followUp.customerId || followUp.leadId)!,
        interactionType: 'call',
        summary: `Follow-up completed: ${followUp.title}`,
        details: completionNotes,
      });
    }

    return followUp!;
  }

  public rescheduleFollowUp(id: string, dueDate: string, dueTime?: string): FollowUpRecord {
    this.db.prepare(`
      UPDATE follow_ups SET
        due_date = ?,
        due_time = COALESCE(?, due_time),
        status = 'pending'
      WHERE id = ?
    `).run(dueDate, dueTime || null, id);

    return this.getFollowUpById(id)!;
  }

  // --- Interaction History ---
  public getInteractions(entityId: string): InteractionRecord[] {
    const rows = this.db.prepare('SELECT * FROM interactions WHERE entity_id = ? ORDER BY created_at DESC').all(entityId) as any[];
    return rows.map(r => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      interactionType: r.interaction_type,
      summary: r.summary,
      details: r.details,
      createdAt: r.created_at,
    }));
  }

  public addInteraction(data: Omit<InteractionRecord, 'id' | 'createdAt'>): InteractionRecord {
    const id = `int_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO interactions (id, entity_type, entity_id, interaction_type, summary, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.entityType, data.entityId, data.interactionType, data.summary, data.details || '', now);

    return { id, ...data, createdAt: now };
  }

  // --- Profile Settings ---
  public getProfile(): BusinessProfile {
    const row = this.db.prepare('SELECT * FROM business_profile WHERE id = ?').get('profile_main') as any;
    return {
      businessName: row.business_name,
      ownerName: row.owner_name,
      phone: row.phone,
      city: row.city || '',
      category: row.category || '',
      languagePref: row.language_pref || 'en',
      voicePref: row.voice_pref || 'hi-IN',
    };
  }

  public updateProfile(updates: Partial<BusinessProfile>): BusinessProfile {
    const current = this.getProfile();
    const updated = { ...current, ...updates };

    this.db.prepare(`
      UPDATE business_profile SET
        business_name = ?, owner_name = ?, phone = ?, city = ?, category = ?,
        language_pref = ?, voice_pref = ?
      WHERE id = ?
    `).run(
      updated.businessName,
      updated.ownerName,
      updated.phone,
      updated.city,
      updated.category,
      updated.languagePref,
      updated.voicePref,
      'profile_main'
    );

    return updated;
  }

  // --- Dashboard Summary & Analytics ---
  public getDashboardSummary() {
    const today = new Date().toISOString().split('T')[0];

    const totalLeads = (this.db.prepare('SELECT COUNT(*) as count FROM leads WHERE is_archived = 0').get() as any).count;
    const newLeads = (this.db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'New' AND is_archived = 0").get() as any).count;
    const activeLeads = (this.db.prepare("SELECT COUNT(*) as count FROM leads WHERE status IN ('Contacted', 'Interested', 'Follow-up') AND is_archived = 0").get() as any).count;
    const convertedCustomers = (this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as any).count;

    const followUpsToday = (this.db.prepare("SELECT COUNT(*) as count FROM follow_ups WHERE due_date = ? AND status = 'pending'").get(today) as any).count;
    const overdueFollowUps = (this.db.prepare("SELECT COUNT(*) as count FROM follow_ups WHERE due_date < ? AND status = 'pending'").get(today) as any).count;

    const recentLeads = this.db.prepare('SELECT * FROM leads WHERE is_archived = 0 ORDER BY created_at DESC LIMIT 5').all().map(r => this.mapLeadRow(r));
    const upcomingFollowUps = this.db.prepare("SELECT * FROM follow_ups WHERE status = 'pending' ORDER BY due_date ASC, due_time ASC LIMIT 5").all().map(r => this.mapFollowUpRow(r));

    const totalDeals = (this.db.prepare('SELECT SUM(total_deal_value) as sum FROM customers').get() as any).sum || 0;
    const conversionRate = totalLeads + convertedCustomers > 0 ? Math.round((convertedCustomers / (totalLeads + convertedCustomers)) * 100) : 0;

    return {
      totalLeads,
      newLeads,
      activeLeads,
      convertedCustomers,
      followUpsToday,
      overdueFollowUps,
      recentLeads,
      upcomingFollowUps,
      conversionRate,
      totalDeals,
    };
  }

  public getAnalytics() {
    const totalLeads = (this.db.prepare('SELECT COUNT(*) as count FROM leads WHERE is_archived = 0').get() as any).count;
    const convertedLeads = (this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as any).count;
    const conversionRate = totalLeads + convertedLeads > 0 ? Math.round((convertedLeads / (totalLeads + convertedLeads)) * 100) : 0;

    const statusCounts = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM leads WHERE is_archived = 0 GROUP BY status
    `).all() as { status: string; count: number }[];

    const statusDistribution = statusCounts.map(s => ({
      status: s.status,
      count: s.count,
      percentage: totalLeads > 0 ? Math.round((s.count / totalLeads) * 100) : 0,
    }));

    const totalFollowUps = (this.db.prepare('SELECT COUNT(*) as count FROM follow_ups').get() as any).count;
    const completedFollowUps = (this.db.prepare("SELECT COUNT(*) as count FROM follow_ups WHERE status = 'completed'").get() as any).count;
    const followUpCompletionRate = totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;

    return {
      totalLeads,
      convertedLeads,
      conversionRate,
      statusDistribution,
      totalFollowUps,
      completedFollowUps,
      followUpCompletionRate,
    };
  }

  // --- Internal Row Mappers ---
  private mapLeadRow(r: any): LeadRecord {
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email || '',
      requirement: r.requirement,
      source: r.source,
      status: r.status,
      notes: r.notes || '',
      budget: r.budget || 0,
      priority: r.priority,
      isArchived: Boolean(r.is_archived),
      assignedTo: r.assigned_to || 'Owner',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapCustomerRow(r: any): CustomerRecord {
    return {
      id: r.id,
      leadId: r.lead_id,
      name: r.name,
      phone: r.phone,
      email: r.email || '',
      requirement: r.requirement || '',
      totalDealValue: r.total_deal_value || 0,
      status: r.status,
      notes: r.notes || '',
      convertedAt: r.converted_at,
      createdAt: r.created_at,
    };
  }

  private mapFollowUpRow(r: any): FollowUpRecord {
    return {
      id: r.id,
      leadId: r.lead_id,
      customerId: r.customer_id,
      contactName: r.contact_name,
      contactPhone: r.contact_phone,
      title: r.title,
      dueDate: r.due_date,
      dueTime: r.due_time,
      status: r.status,
      priority: r.priority,
      notes: r.notes || '',
      completionNotes: r.completion_notes,
      completedAt: r.completed_at,
      createdAt: r.created_at,
    };
  }
}
