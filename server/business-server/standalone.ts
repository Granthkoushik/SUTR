import { createBusinessServerApp } from './businessServer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      args[key] = val || 'true';
    }
  });
  return args;
}

const args = parseArgs();
const PORT = parseInt(args.port || process.env.PORT || '5001', 10);
const BUSINESS_ID = args.businessId || process.env.BUSINESS_ID || 'biz_sharma_enterprises';
const DATA_DIR = args.dataDir || process.env.BUSINESS_DATA_DIR || path.resolve(process.cwd(), 'data', 'business_storage');
const SECRET = args.secret || process.env.CENTRAL_AUTH_SECRET;

console.log(`[LeadFlow Business Server] Initializing for business: "${BUSINESS_ID}"...`);
console.log(`[LeadFlow Business Server] Local storage: ${path.join(DATA_DIR, BUSINESS_ID)}`);

const { app, dbManager } = createBusinessServerApp({
  businessId: BUSINESS_ID,
  dataBaseDir: DATA_DIR,
  tokenSecret: SECRET,
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[LeadFlow Business Server] Running independently on http://localhost:${PORT}`);
  console.log(`[LeadFlow Business Server] Health check: http://localhost:${PORT}/health`);
});

process.on('SIGINT', () => {
  console.log('[LeadFlow Business Server] Gracefully shutting down...');
  dbManager.close();
  server.close(() => {
    console.log('[LeadFlow Business Server] Stopped.');
    process.exit(0);
  });
});
