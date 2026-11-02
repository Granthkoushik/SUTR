import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // e.g. 11:00 AM
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

// Map of businessId -> Database instance ensuring per-business data isolation
const businessDatabases = new Map<string, Database.Database>();

export class BusinessDataService {
  private db: Database.Database;
  public readonly businessId: string;

  constructor(businessId: string, customDbPath?: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
      throw new Error('Invalid businessId format: path traversal attempt rejected');
    }
    this.businessId = businessId;

    if (customDbPath) {
      this.db = new Database(customDbPath);
    } else {
      if (businessDatabases.has(businessId)) {
        this.db = businessDatabases.get(businessId)!;
      } else {
        const dataDir = path.resolve(process.cwd(), 'data', 'businesses');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        const dbPath = path.join(dataDir, `business_${businessId}.sqlite`);
        this.db = new Database(dbPath);
        businessDatabases.set(businessId, this.db);
      }
    }

    this.initTables();
    this.seedInitialDataIfEmpty();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        requirement TEXT NOT NULL,
        source TEXT DEFAULT 'Direct',
        status TEXT DEFAULT 'New',
        notes TEXT,
        budget INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'Medium',
        is_archived INTEGER DEFAULT 0,
        assigned_to TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        lead_id TEXT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        requirement TEXT,
        total_deal_value INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Active',
        notes TEXT,
        converted_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS follow_ups (
        id TEXT PRIMARY KEY,
        lead_id TEXT,
        customer_id TEXT,
        contact_name TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL,
        due_time TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        notes TEXT,
        completion_notes TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        interaction_type TEXT NOT NULL,
        summary TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS business_profile (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        city TEXT,
        category TEXT,
        language_pref TEXT DEFAULT 'en',
        voice_pref TEXT DEFAULT 'hi-IN'
      );
    `);
  }

  private seedInitialDataIfEmpty() {
    const leadCount = this.db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
    if (leadCount.count > 0) return;

    // Only seed realistic initial demo records for the default demo business
    if (this.businessId !== 'biz_sharma_enterprises') {
      const profileCount = this.db.prepare('SELECT COUNT(*) as count FROM business_profile').get() as { count: number };
      if (profileCount.count === 0) {
        this.db.prepare(`
          INSERT INTO business_profile (id, business_name, owner_name, phone, city, category, language_pref, voice_pref)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('profile_main', `Business ${this.businessId}`, 'Owner', '', 'India', 'General Trade', 'en', 'hi-IN');
      }
      return;
    }

    // Seed realistic initial business records for demonstration
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Seed Profile
    this.db.prepare(`
      INSERT INTO business_profile (id, business_name, owner_name, phone, city, category, language_pref, voice_pref)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('profile_main', 'Sharma Enterprises & Traders', 'Rajesh Sharma', '+91 98201 44821', 'Pune, Maharashtra', 'Wholesale Hardware & Building Materials', 'en', 'hi-IN');

    // Seed Leads
    const insertLead = this.db.prepare(`
      INSERT INTO leads (id, name, phone, email, requirement, source, status, notes, budget, priority, is_archived, assigned_to, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertLead.run(
      'lead_101',
      'Rahul Patel',
      '+91 98980 12543',
      'rahul.patel@gujarattech.in',
      '3 BHK Flat Electrical Wiring & Heavy Switchgears',
      'WhatsApp Inbound',
      'Follow-up',
      'Client called regarding 3 BHK apartment renovation materials. Needs quotation by tomorrow 11 AM.',
      185000,
      'High',
      0,
      'Rajesh Sharma',
      new Date(Date.now() - 86400000 * 2).toISOString(),
      new Date().toISOString()
    );

    insertLead.run(
      'lead_102',
      'Amitabh Verma',
      '+91 98220 54109',
      'verma.constructions@gmail.com',
      'Galvanized Iron Pipes & Fittings (2-inch, 500 meters)',
      'IndiaMART',
      'Interested',
      'Met at construction site office. Verified technical specs. Awaiting sample delivery.',
      320000,
      'High',
      0,
      'Rajesh Sharma',
      new Date(Date.now() - 86400000 * 3).toISOString(),
      new Date().toISOString()
    );

    insertLead.run(
      'lead_103',
      'Sunita Deshmukh',
      '+91 94260 77129',
      'sunita@deshmukhindustries.com',
      'Industrial Carbide Cutting Tools (Batch of 500 pcs)',
      'Phone Enquiry',
      'Contacted',
      'Initial discussion done. Follow-up scheduled for price negotiation.',
      95000,
      'Medium',
      0,
      'Rajesh Sharma',
      new Date(Date.now() - 86400000).toISOString(),
      new Date().toISOString()
    );

    insertLead.run(
      'lead_104',
      'Karan Joshi',
      '+91 98114 33290',
      'karan.joshi@joshitraders.com',
      'High Pressure Brass Water Ball Valves (ANSI 150#)',
      'Walk-in',
      'New',
      'Walked into showroom. Left requirement catalog. Needs call back.',
      78000,
      'Medium',
      0,
      'Rajesh Sharma',
      new Date().toISOString(),
      new Date().toISOString()
    );

    // Seed Converted Customer
    this.db.prepare(`
      INSERT INTO customers (id, lead_id, name, phone, email, requirement, total_deal_value, status, notes, converted_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'cust_501',
      'lead_converted_099',
      'Vikram Singhania (Singhania Logistics)',
      '+91 98450 66219',
      'vikram@singhanialogistics.com',
      'Warehouse Structural Racking & Palette Supports',
      450000,
      'VIP',
      'Converted successfully. Advance 50% paid. Repeat customer potential.',
      yesterday,
      yesterday
    );

    // Seed Follow-ups
    const insertFollowUp = this.db.prepare(`
      INSERT INTO follow_ups (id, lead_id, customer_id, contact_name, contact_phone, title, due_date, due_time, status, priority, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Today's follow-up
    insertFollowUp.run(
      'flw_201',
      'lead_101',
      null,
      'Rahul Patel',
      '+91 98980 12543',
      'Call regarding 3 BHK electrical fittings estimate',
      today,
      '11:00 AM',
      'pending',
      'high',
      'Confirm bill of materials and delivery timeline.',
      new Date().toISOString()
    );

    // Overdue follow-up
    insertFollowUp.run(
      'flw_202',
      'lead_103',
      null,
      'Sunita Deshmukh',
      '+91 94260 77129',
      'Check cutting tools sample test feedback',
      yesterday,
      '03:30 PM',
      'pending',
      'medium',
      'Sample was delivered 2 days ago. Ask for purchasing approval.',
      new Date(Date.now() - 86400000 * 2).toISOString()
    );

    // Upcoming follow-up
    insertFollowUp.run(
      'flw_203',
      'lead_102',
      null,
      'Amitabh Verma',
      '+91 98220 54109',
      'Contract signing and advance payment token',
      tomorrow,
      '02:00 PM',
      'pending',
      'high',
      'Bring revised proforma invoice to site office.',
      new Date().toISOString()
    );

    // Seed Initial Interaction History
    const insertInteraction = this.db.prepare(`
      INSERT INTO interactions (id, entity_type, entity_id, interaction_type, summary, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertInteraction.run(
      'int_301',
      'lead',
      'lead_101',
      'call',
      'Inbound phone call regarding 3 BHK wiring requirement',
      'Discussed room dimensions and heavy load requirements for AC & geysers.',
      new Date(Date.now() - 86400000 * 2).toISOString()
    );

    insertInteraction.run(
      'int_302',
      'lead',
      'lead_101',
      'whatsapp',
      'WhatsApp catalogue shared',
      'Sent PDF catalogue of copper wiring and modular switch series.',
      new Date(Date.now() - 86400000).toISOString()
    );
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

    // Record creation interaction
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
    this.db.prepare('UPDATE leads SET is_archived = ?, updated_at = ? WHERE id = ?').run(
      isArchived ? 1 : 0,
      new Date().toISOString(),
      id
    );
    return this.getLeadById(id)!;
  }

  public deleteLead(id: string): boolean {
    this.db.prepare('DELETE FROM follow_ups WHERE lead_id = ?').run(id);
    this.db.prepare('DELETE FROM interactions WHERE entity_id = ?').run(id);
    const result = this.db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // --- Customers CRUD & Lead Conversion ---
  public getCustomers(): CustomerRecord[] {
    const rows = this.db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      leadId: r.lead_id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      requirement: r.requirement,
      totalDealValue: r.total_deal_value,
      status: r.status,
      notes: r.notes,
      convertedAt: r.converted_at,
      createdAt: r.created_at,
    }));
  }

  public getCustomerById(id: string): CustomerRecord | null {
    const r = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      leadId: r.lead_id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      requirement: r.requirement,
      totalDealValue: r.total_deal_value,
      status: r.status,
      notes: r.notes,
      convertedAt: r.converted_at,
      createdAt: r.created_at,
    };
  }

  public convertLeadToCustomer(leadId: string, dealValue?: number, customerNotes?: string): CustomerRecord {
    const lead = this.getLeadById(leadId);
    if (!lead) throw new Error('Lead not found for conversion');

    const customerId = `cust_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const finalValue = dealValue !== undefined ? dealValue : (lead.budget || 0);

    this.db.prepare(`
      INSERT INTO customers (id, lead_id, name, phone, email, requirement, total_deal_value, status, notes, converted_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      leadId,
      lead.name,
      lead.phone,
      lead.email,
      lead.requirement,
      finalValue,
      'Active',
      customerNotes || lead.notes,
      now,
      now
    );

    // Update lead status to Converted
    this.updateLead(leadId, { status: 'Converted' });

    // Link any pending follow-ups to customer
    this.db.prepare('UPDATE follow_ups SET customer_id = ? WHERE lead_id = ?').run(customerId, leadId);

    // Add conversion interaction
    this.addInteraction({
      entityType: 'customer',
      entityId: customerId,
      interactionType: 'status_change',
      summary: `Converted from Lead #${lead.id} with deal value ₹${finalValue.toLocaleString('en-IN')}`,
      details: customerNotes,
    });

    return this.getCustomerById(customerId)!;
  }

  // --- Follow-ups Management ---
  public getFollowUps(filterStatus?: 'pending' | 'completed'): FollowUpRecord[] {
    let query = 'SELECT * FROM follow_ups';
    if (filterStatus) {
      query += ` WHERE status = '${filterStatus}'`;
    }
    query += ' ORDER BY due_date ASC, due_time ASC';

    const rows = this.db.prepare(query).all() as any[];
    return rows.map(r => ({
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
      notes: r.notes,
      completionNotes: r.completion_notes,
      completedAt: r.completed_at,
      createdAt: r.created_at,
    }));
  }

  public scheduleFollowUp(data: {
    leadId?: string;
    customerId?: string;
    contactName: string;
    contactPhone: string;
    title: string;
    dueDate: string;
    dueTime?: string;
    priority?: 'high' | 'medium' | 'low';
    notes?: string;
  }): FollowUpRecord {
    const id = `flw_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO follow_ups (id, lead_id, customer_id, contact_name, contact_phone, title, due_date, due_time, status, priority, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(
      id,
      data.leadId || null,
      data.customerId || null,
      data.contactName.trim(),
      data.contactPhone.trim(),
      data.title.trim(),
      data.dueDate,
      data.dueTime || '11:00 AM',
      data.priority || 'medium',
      data.notes || '',
      now
    );

    // If linked to lead, update lead status to Follow-up if currently New
    if (data.leadId) {
      const lead = this.getLeadById(data.leadId);
      if (lead && (lead.status === 'New' || lead.status === 'Contacted')) {
        this.updateLead(data.leadId, { status: 'Follow-up' });
      }

      this.addInteraction({
        entityType: 'lead',
        entityId: data.leadId,
        interactionType: 'note',
        summary: `Follow-up scheduled for ${data.dueDate} ${data.dueTime || ''}: ${data.title}`,
      });
    }

    return this.getFollowUpById(id)!;
  }

  public getFollowUpById(id: string): FollowUpRecord | null {
    const r = this.db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id) as any;
    if (!r) return null;
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
      notes: r.notes,
      completionNotes: r.completion_notes,
      completedAt: r.completed_at,
      createdAt: r.created_at,
    };
  }

  public completeFollowUp(id: string, completionNotes?: string): FollowUpRecord {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE follow_ups SET status = 'completed', completion_notes = ?, completed_at = ? WHERE id = ?
    `).run(completionNotes || 'Completed on schedule', now, id);

    const flw = this.getFollowUpById(id);
    if (flw && flw.leadId) {
      this.addInteraction({
        entityType: 'lead',
        entityId: flw.leadId,
        interactionType: 'call',
        summary: `Follow-up completed: ${flw.title}`,
        details: completionNotes,
      });
    }

    return flw!;
  }

  public rescheduleFollowUp(id: string, newDate: string, newTime?: string): FollowUpRecord {
    this.db.prepare('UPDATE follow_ups SET due_date = ?, due_time = ?, status = \'pending\' WHERE id = ?').run(
      newDate,
      newTime || '11:00 AM',
      id
    );
    return this.getFollowUpById(id)!;
  }

  // --- Interactions History ---
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

    return {
      id,
      ...data,
      createdAt: now,
    };
  }

  // --- Dashboard Summary & Analytics ---
  public getDashboardSummary() {
    const today = new Date().toISOString().split('T')[0];

    const totalLeads = (this.db.prepare('SELECT COUNT(*) as count FROM leads WHERE is_archived = 0').get() as any).count;
    const newLeads = (this.db.prepare('SELECT COUNT(*) as count FROM leads WHERE status = \'New\' AND is_archived = 0').get() as any).count;
    const activeLeads = (this.db.prepare('SELECT COUNT(*) as count FROM leads WHERE status IN (\'New\', \'Contacted\', \'Interested\', \'Follow-up\') AND is_archived = 0').get() as any).count;
    const convertedCustomers = (this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as any).count;

    const followUpsDueToday = (this.db.prepare('SELECT COUNT(*) as count FROM follow_ups WHERE due_date = ? AND status = \'pending\'').get(today) as any).count;
    const overdueFollowUps = (this.db.prepare('SELECT COUNT(*) as count FROM follow_ups WHERE due_date < ? AND status = \'pending\'').get(today) as any).count;

    const recentLeads = this.getLeads(false).slice(0, 5);
    const upcomingFollowUps = this.db.prepare(`
      SELECT * FROM follow_ups WHERE status = 'pending' AND due_date >= ? ORDER BY due_date ASC, due_time ASC LIMIT 5
    `).all(today) as any[];

    // Conversion rate
    const allEverLeads = (this.db.prepare('SELECT COUNT(*) as count FROM leads').get() as any).count;
    const conversionRate = allEverLeads > 0 ? Math.round((convertedCustomers / allEverLeads) * 100) : 0;

    return {
      totalLeads,
      newLeads,
      activeLeads,
      convertedCustomers,
      followUpsDueToday,
      overdueFollowUps,
      conversionRate,
      recentLeads,
      upcomingFollowUps: upcomingFollowUps.map(r => ({
        id: r.id,
        leadId: r.lead_id,
        contactName: r.contact_name,
        contactPhone: r.contact_phone,
        title: r.title,
        dueDate: r.due_date,
        dueTime: r.due_time,
        priority: r.priority,
        status: r.status,
      })),
    };
  }

  public getAnalytics() {
    const totalLeads = (this.db.prepare('SELECT COUNT(*) as count FROM leads').get() as any).count;
    const convertedCount = (this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as any).count;
    const conversionRate = totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : '0';

    // Status breakdown
    const statusRows = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM leads WHERE is_archived = 0 GROUP BY status
    `).all() as any[];

    // Source breakdown
    const sourceRows = this.db.prepare(`
      SELECT source, COUNT(*) as count FROM leads GROUP BY source
    `).all() as any[];

    // Follow-up completion stats
    const totalFollowUps = (this.db.prepare('SELECT COUNT(*) as count FROM follow_ups').get() as any).count;
    const completedFollowUps = (this.db.prepare('SELECT COUNT(*) as count FROM follow_ups WHERE status = \'completed\'').get() as any).count;
    const completionRate = totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;

    return {
      totalLeads,
      convertedCount,
      conversionRate,
      statusBreakdown: statusRows,
      sourceBreakdown: sourceRows,
      followUpStats: {
        total: totalFollowUps,
        completed: completedFollowUps,
        rate: completionRate,
      },
    };
  }

  // --- Profile Settings ---
  public getProfile(): BusinessProfile {
    const r = this.db.prepare('SELECT * FROM business_profile WHERE id = \'profile_main\'').get() as any;
    if (!r) {
      return {
        businessName: 'My Business',
        ownerName: 'Owner',
        phone: '+91 98200 12345',
        city: 'Mumbai',
        category: 'Trading',
        languagePref: 'en',
        voicePref: 'hi-IN',
      };
    }
    return {
      businessName: r.business_name,
      ownerName: r.owner_name,
      phone: r.phone,
      city: r.city,
      category: r.category,
      languagePref: r.language_pref,
      voicePref: r.voice_pref,
    };
  }

  public updateProfile(profile: Partial<BusinessProfile>): BusinessProfile {
    const current = this.getProfile();
    const updated = { ...current, ...profile };

    this.db.prepare(`
      INSERT INTO business_profile (id, business_name, owner_name, phone, city, category, language_pref, voice_pref)
      VALUES ('profile_main', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        business_name = excluded.business_name,
        owner_name = excluded.owner_name,
        phone = excluded.phone,
        city = excluded.city,
        category = excluded.category,
        language_pref = excluded.language_pref,
        voice_pref = excluded.voice_pref
    `).run(
      updated.businessName,
      updated.ownerName,
      updated.phone,
      updated.city,
      updated.category,
      updated.languagePref,
      updated.voicePref
    );

    return updated;
  }

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
}
