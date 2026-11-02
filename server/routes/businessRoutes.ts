import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export function createBusinessRouter(): Router {
  const router = Router({ mergeParams: true });

  // Dashboard API
  router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = req.businessService!.getDashboardSummary();
      return res.json(summary);
    } catch (err: any) {
      console.error('[Business API] Dashboard error:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch dashboard summary' });
    }
  });

  // Analytics API
  router.get('/analytics', (req: AuthenticatedRequest, res: Response) => {
    try {
      const analytics = req.businessService!.getAnalytics();
      return res.json(analytics);
    } catch (err: any) {
      console.error('[Business API] Analytics error:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
    }
  });

  // Leads CRUD
  router.get('/leads', (req: AuthenticatedRequest, res: Response) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const leads = req.businessService!.getLeads(includeArchived);
      return res.json(leads);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/leads', (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, phone, requirement } = req.body;
      if (!name || !phone || !requirement) {
        return res.status(400).json({ error: 'Name, phone, and requirement are required fields' });
      }

      const lead = req.businessService!.createLead(req.body);
      return res.status(201).json(lead);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.get('/leads/:id', (req: AuthenticatedRequest, res: Response) => {
    try {
      const lead = req.businessService!.getLeadById(req.params.id);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      return res.json(lead);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.put('/leads/:id', (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = req.businessService!.updateLead(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.post('/leads/:id/archive', (req: AuthenticatedRequest, res: Response) => {
    try {
      const isArchived = req.body.isArchived !== false;
      const lead = req.businessService!.archiveLead(req.params.id, isArchived);
      return res.json(lead);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.delete('/leads/:id', (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = req.businessService!.deleteLead(req.params.id);
      return res.json({ success: deleted });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Convert Lead to Customer
  router.post('/leads/:id/convert', (req: AuthenticatedRequest, res: Response) => {
    try {
      const { dealValue, customerNotes } = req.body;
      const customer = req.businessService!.convertLeadToCustomer(req.params.id, dealValue, customerNotes);
      return res.json(customer);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Customers
  router.get('/customers', (req: AuthenticatedRequest, res: Response) => {
    try {
      const customers = req.businessService!.getCustomers();
      return res.json(customers);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.get('/customers/:id', (req: AuthenticatedRequest, res: Response) => {
    try {
      const customer = req.businessService!.getCustomerById(req.params.id);
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      return res.json(customer);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Follow-ups
  router.get('/followups', (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = req.query.status as any;
      const followUps = req.businessService!.getFollowUps(status);
      return res.json(followUps);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/followups', (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contactName, contactPhone, title, dueDate } = req.body;
      if (!contactName || !contactPhone || !title || !dueDate) {
        return res.status(400).json({ error: 'Contact name, phone, title, and dueDate are required' });
      }

      const followUp = req.businessService!.scheduleFollowUp(req.body);
      return res.status(201).json(followUp);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.put('/followups/:id/complete', (req: AuthenticatedRequest, res: Response) => {
    try {
      const { completionNotes } = req.body;
      const completed = req.businessService!.completeFollowUp(req.params.id, completionNotes);
      return res.json(completed);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.put('/followups/:id/reschedule', (req: AuthenticatedRequest, res: Response) => {
    try {
      const { dueDate, dueTime } = req.body;
      if (!dueDate) return res.status(400).json({ error: 'New dueDate is required' });

      const rescheduled = req.businessService!.rescheduleFollowUp(req.params.id, dueDate, dueTime);
      return res.json(rescheduled);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Interaction History
  router.get('/interactions/:entityId', (req: AuthenticatedRequest, res: Response) => {
    try {
      const history = req.businessService!.getInteractions(req.params.entityId);
      return res.json(history);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/interactions', (req: AuthenticatedRequest, res: Response) => {
    try {
      const { entityType, entityId, interactionType, summary } = req.body;
      if (!entityType || !entityId || !interactionType || !summary) {
        return res.status(400).json({ error: 'entityType, entityId, interactionType, and summary are required' });
      }

      const interaction = req.businessService!.addInteraction(req.body);
      return res.status(201).json(interaction);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Business Profile & Preferences
  router.get('/profile', (req: AuthenticatedRequest, res: Response) => {
    try {
      const profile = req.businessService!.getProfile();
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.put('/profile', (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = req.businessService!.updateProfile(req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  return router;
}
