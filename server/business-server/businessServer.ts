import express, { Express, Request, Response, NextFunction } from 'express';
import { BusinessDatabaseManager } from './businessDatabase';
import { BusinessDataService } from './businessDataService';
import { createBusinessAuthMiddleware } from './businessAuthMiddleware';
import { createBusinessRouter } from './businessRoutes';

export interface BusinessServerOptions {
  businessId: string;
  dataBaseDir?: string;
  tokenSecret?: string;
}

export function createBusinessServerApp(options: BusinessServerOptions): {
  app: Express;
  dbManager: BusinessDatabaseManager;
  dataService: BusinessDataService;
} {
  const { businessId, dataBaseDir, tokenSecret } = options;

  if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
    throw new Error(`Invalid businessId: '${businessId}'. Path traversal pattern rejected.`);
  }

  const app = express();
  const dbManager = new BusinessDatabaseManager(businessId, dataBaseDir);
  const dataService = new BusinessDataService(dbManager);
  const authMiddleware = createBusinessAuthMiddleware(businessId, tokenSecret);

  // 1. Local LAN & CORS headers for direct connection from browser/VPN
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // 2. Unauthenticated Local Health Endpoint
  app.get('/health', (req: Request, res: Response) => {
    return res.json({
      status: 'healthy',
      serverType: 'LeadFlow Independent Business Server',
      businessId,
      timestamp: new Date().toISOString(),
    });
  });

  // 3. Mount Authenticated Business Routes
  // Supports both root-level mounting (when running as standalone port)
  // and path-scoped mounting (e.g. /api or /api/business-server/:businessId)
  const businessRouter = createBusinessRouter(dataService, dbManager);

  app.use('/api', authMiddleware, businessRouter);
  app.use('/', authMiddleware, businessRouter);

  return { app, dbManager, dataService };
}
