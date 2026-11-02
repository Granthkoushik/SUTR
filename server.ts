import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { CentralAuthService } from './server/central-auth/centralAuthService';
import { createCentralAuthRouter } from './server/central-auth/centralAuthRoutes';
import { createBusinessServerApp } from './server/business-server/businessServer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON Parser
  app.use(express.json());

  // 1. Initialize Independent Central Authentication Service
  // Operates exclusively on central_auth.sqlite (zero business records stored)
  const centralAuth = new CentralAuthService();
  const centralAuthRouter = createCentralAuthRouter(centralAuth);

  // Health-check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'LeadFlow Distributed Architecture',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      centralAuth: 'online',
      architecture: 'Distributed Business-Owned Server',
    });
  });

  // Mount Central Auth routes
  app.use('/api/central-auth', centralAuthRouter);
  app.use('/api/auth', centralAuthRouter); // Compatibility alias

  // 2. Cache of instantiated Business Servers (each with its own independent SQLite database & auth)
  const businessServerInstances = new Map<string, ReturnType<typeof createBusinessServerApp>>();

  function getOrCreateBusinessServer(businessId: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
      throw new Error(`Invalid business ID '${businessId}': path traversal rejected`);
    }

    if (!businessServerInstances.has(businessId)) {
      const serverApp = createBusinessServerApp({
        businessId,
        dataBaseDir: path.resolve(process.cwd(), 'data', 'business_storage'),
      });
      businessServerInstances.set(businessId, serverApp);
    }
    return businessServerInstances.get(businessId)!;
  }

  // Pre-seed demo business server instance
  getOrCreateBusinessServer('biz_sharma_enterprises');

  // Dynamic dispatch router for local business server requests
  const handleBusinessRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const businessId = req.params.businessId;
    try {
      const instance = getOrCreateBusinessServer(businessId);
      // Forward request to independent business server app
      instance.app(req, res, next);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Invalid business server request' });
    }
  };

  // Direct business-owned routes
  app.use('/api/business-server/:businessId', handleBusinessRequest);
  app.use('/api/business/:businessId', handleBusinessRequest);

  // Vite Integration for Full-Stack development / production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LeadFlow Distributed Engine] Ready on http://localhost:${PORT}`);
    console.log(`[LeadFlow Architecture] Central Auth: /api/central-auth`);
    console.log(`[LeadFlow Architecture] Business Server: /api/business-server/:businessId`);
  });
}

startServer().catch((err) => {
  console.error('[LeadFlow Server Error] Startup failed:', err);
  process.exit(1);
});
