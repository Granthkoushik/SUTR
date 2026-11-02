import { Router, Response } from 'express';
import { BusinessAuthenticatedRequest } from './businessAuthMiddleware';
import { BusinessDataService } from './businessDataService';
import { BusinessDatabaseManager } from './businessDatabase';
import { LocalVoiceService } from './localVoiceService';

export function createBusinessRouter(
  dataService: BusinessDataService,
  dbManager: BusinessDatabaseManager
): Router {
  const router = Router();
  const voiceService = new LocalVoiceService();

  // 1. Dashboard
  router.get('/dashboard', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const summary = dataService.getDashboardSummary();
      return res.json(summary);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch dashboard' });
    }
  });

  // 2. Analytics
  router.get('/analytics', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const analytics = dataService.getAnalytics();
      return res.json(analytics);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
    }
  });

  // 3. Leads CRUD
  router.get('/leads', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const leads = dataService.getLeads(includeArchived);
      return res.json(leads);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/leads', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const { name, phone, requirement } = req.body;
      if (!name || !phone || !requirement) {
        return res.status(400).json({ error: 'Name, phone, and requirement are required fields' });
      }

      const lead = dataService.createLead(req.body);
      return res.status(201).json(lead);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.get('/leads/:id', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const lead = dataService.getLeadById(req.params.id);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      return res.json(lead);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.put('/leads/:id', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const updated = dataService.updateLead(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.post('/leads/:id/archive', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const isArchived = req.body.isArchived !== false;
      const lead = dataService.archiveLead(req.params.id, isArchived);
      return res.json(lead);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.delete('/leads/:id', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const deleted = dataService.deleteLead(req.params.id);
      return res.json({ success: deleted });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/leads/:id/convert', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const { dealValue, customerNotes } = req.body;
      const customer = dataService.convertLeadToCustomer(req.params.id, dealValue, customerNotes);
      return res.json(customer);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // 4. Customers
  router.get('/customers', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const customers = dataService.getCustomers();
      return res.json(customers);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.get('/customers/:id', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const customer = dataService.getCustomerById(req.params.id);
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      return res.json(customer);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 5. Follow-ups
  router.get('/followups', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const status = req.query.status as any;
      const followUps = dataService.getFollowUps(status);
      return res.json(followUps);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/followups', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const { contactName, contactPhone, title, dueDate } = req.body;
      if (!contactName || !contactPhone || !title || !dueDate) {
        return res.status(400).json({ error: 'Contact name, phone, title, and dueDate are required' });
      }

      const followUp = dataService.scheduleFollowUp(req.body);
      return res.status(201).json(followUp);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.put('/followups/:id/complete', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const { completionNotes } = req.body;
      const completed = dataService.completeFollowUp(req.params.id, completionNotes);
      return res.json(completed);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  router.put('/followups/:id/reschedule', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const { dueDate, dueTime } = req.body;
      if (!dueDate) return res.status(400).json({ error: 'New dueDate is required' });

      const rescheduled = dataService.rescheduleFollowUp(req.params.id, dueDate, dueTime);
      return res.json(rescheduled);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // 6. Interaction History
  router.get('/interactions/:entityId', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const history = dataService.getInteractions(req.params.entityId);
      return res.json(history);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/interactions', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const { entityType, entityId, interactionType, summary } = req.body;
      if (!entityType || !entityId || !interactionType || !summary) {
        return res.status(400).json({ error: 'entityType, entityId, interactionType, and summary are required' });
      }

      const interaction = dataService.addInteraction(req.body);
      return res.status(201).json(interaction);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // 7. Profile & Settings
  router.get('/profile', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const profile = dataService.getProfile();
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.put('/profile', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const updated = dataService.updateProfile(req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // 8. Local Voice Processing API (Zero external AI calls)
  router.post('/voice/extract', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const { transcript, today } = req.body;
      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ error: 'Audio transcript text is required' });
      }

      const extracted = voiceService.extractFromTranscript(transcript, today);
      if (extracted.isAmbiguous) {
        return res.status(422).json({
          success: false,
          error: extracted.ambiguityReason || 'Spoken input is ambiguous or lacks actionable lead information',
          extracted,
        });
      }

      return res.json({
        success: true,
        extracted,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to process voice transcript' });
    }
  });

  // 9. Local Backup & Recovery APIs
  router.post('/backups', async (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const { notes } = req.body;
      const backup = await dbManager.createBackup(notes);
      return res.status(201).json(backup);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to create backup' });
    }
  });

  router.get('/backups', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const backups = dbManager.listBackups();
      return res.json(backups);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to list backups' });
    }
  });

  router.post('/backups/:fileName/verify', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const result = dbManager.verifyBackup(req.params.fileName);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Backup verification error' });
    }
  });

  router.post('/backups/:fileName/restore', async (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const result = await dbManager.restoreFromBackup(req.params.fileName);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Database restoration failed' });
    }
  });

  router.post('/maintenance/recovery', (req: BusinessAuthenticatedRequest, res: Response) => {
    try {
      const recovery = dbManager.recoverDatabase();
      return res.json(recovery);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Database recovery failed' });
    }
  });

  return router;
}
