import { CentralAuthService } from '../server/central-auth/centralAuthService';
import { createBusinessServerApp } from '../server/business-server/businessServer';
import { LocalVoiceService } from '../server/business-server/localVoiceService';
import path from 'path';
import fs from 'fs';

async function runDistributedArchitectureTests() {
  console.log('================================================================');
  console.log('  LEADFLOW V2 — DISTRIBUTED BUSINESS-OWNED SERVER INTEGRATION TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  const testDir = path.resolve(process.cwd(), 'data', 'test_distributed_env');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const centralDbPath = path.join(testDir, 'central_auth.sqlite');
  const sharedSecret = 'test_distributed_cluster_secret_xyz_99';

  // ----------------------------------------------------
  // SECTION 1: Central Authentication Server Independence
  // ----------------------------------------------------
  console.log('[SECTION 1] Central Authentication Server Storage & Independence');
  const centralAuth = new CentralAuthService(centralDbPath, sharedSecret);

  // Check central tables: must NOT contain leads, customers, or follow_ups
  const db = (centralAuth as any).db;
  const centralTables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map(t => t.name);

  assert(!centralTables.includes('leads'), '1.1 Central auth DB contains zero "leads" tables');
  assert(!centralTables.includes('customers'), '1.1 Central auth DB contains zero "customers" tables');
  assert(!centralTables.includes('follow_ups'), '1.1 Central auth DB contains zero "follow_ups" tables');
  assert(centralTables.includes('registered_users'), '1.1 Central auth DB contains "registered_users"');
  assert(centralTables.includes('business_servers'), '1.1 Central auth DB contains "business_servers" registration table');

  // ----------------------------------------------------
  // SECTION 2: Server Discovery & Registration
  // ----------------------------------------------------
  console.log('\n[SECTION 2] Independent Business Server Registration & Discovery');

  const serverAlphaReg = centralAuth.registerBusinessServer(
    'biz_alpha',
    'Alpha Industrial Automation (Owner Machine: WIN-PC-ALPHA)',
    'http://192.168.1.101:5001'
  );
  assert(serverAlphaReg.businessId === 'biz_alpha', '2.1 Server Alpha registered its independent address');

  const serverBetaReg = centralAuth.registerBusinessServer(
    'biz_beta',
    'Beta Electrical Supplies (Owner Machine: WIN-PC-BETA)',
    'http://192.168.1.102:5002'
  );
  assert(serverBetaReg.businessId === 'biz_beta', '2.2 Server Beta registered its independent address');

  // Server discovery resolution
  const resolvedAlpha = centralAuth.resolveBusinessServer('biz_alpha');
  assert(resolvedAlpha?.serverUrl === 'http://192.168.1.101:5001', '2.3 Central Auth resolves Server Alpha address correctly');

  const resolvedBeta = centralAuth.resolveBusinessServer('biz_beta');
  assert(resolvedBeta?.serverUrl === 'http://192.168.1.102:5002', '2.4 Central Auth resolves Server Beta address correctly');

  // ----------------------------------------------------
  // SECTION 3: User Authentication & Signed Token Issuance
  // ----------------------------------------------------
  console.log('\n[SECTION 3] Authentication & Signed Token Issuance');

  // Register User Alpha (Mobile 9876500001)
  const otpAlpha = await centralAuth.requestOtp('9876500001');
  centralAuth.verifyOtp('9876500001', otpAlpha.devOtp!);
  const loginAlpha = centralAuth.loginWithCredentials('9876500001', '4321');
  assert(loginAlpha.user.phone === '9876500001', '3.1 User Alpha authenticated via Central Auth');

  // Re-bind User Alpha to biz_alpha
  centralAuth.registerBusinessServer('biz_alpha', 'Alpha Industrial', 'http://192.168.1.101:5001');
  const tokenAlpha = centralAuth.generateSignedToken({
    userId: loginAlpha.user.id,
    phone: '9876500001',
    businessId: 'biz_alpha',
    businessServerUrl: 'http://192.168.1.101:5001',
  });

  // Register User Beta (Mobile 9876500002)
  const otpBeta = await centralAuth.requestOtp('9876500002');
  centralAuth.verifyOtp('9876500002', otpBeta.devOtp!);
  const loginBeta = centralAuth.loginWithCredentials('9876500002', '5678');
  assert(loginBeta.user.phone === '9876500002', '3.2 User Beta authenticated via Central Auth');

  const tokenBeta = centralAuth.generateSignedToken({
    userId: loginBeta.user.id,
    phone: '9876500002',
    businessId: 'biz_beta',
    businessServerUrl: 'http://192.168.1.102:5002',
  });

  // Verify tokens
  const verifiedAlpha = centralAuth.verifyToken(tokenAlpha);
  assert(verifiedAlpha?.businessId === 'biz_alpha', '3.3 Token Alpha bound to biz_alpha');

  const verifiedBeta = centralAuth.verifyToken(tokenBeta);
  assert(verifiedBeta?.businessId === 'biz_beta', '3.4 Token Beta bound to biz_beta');

  // ----------------------------------------------------
  // SECTION 4: Two Independent Business Server Instances
  // ----------------------------------------------------
  console.log('\n[SECTION 4] Initializing Two Independent Business Server Instances');

  const businessStorageDir = path.join(testDir, 'business_storage');

  // Business Server Alpha (Independent instance for biz_alpha)
  const serverAlpha = createBusinessServerApp({
    businessId: 'biz_alpha',
    dataBaseDir: businessStorageDir,
    tokenSecret: sharedSecret,
  });

  // Business Server Beta (Independent instance for biz_beta)
  const serverBeta = createBusinessServerApp({
    businessId: 'biz_beta',
    dataBaseDir: businessStorageDir,
    tokenSecret: sharedSecret,
  });

  assert(serverAlpha.dbManager.databasePath !== serverBeta.dbManager.databasePath, '4.1 Server Alpha and Server Beta have completely separate database files');

  // ----------------------------------------------------
  // SECTION 5: Cross-Business Access Rejection (403 Forbidden)
  // ----------------------------------------------------
  console.log('\n[SECTION 5] Cross-Tenant Authorization & Attack Rejection');

  // Simulate User Alpha trying to access Business Server Beta
  function testTokenAccess(serverApp: any, token: string): Promise<{ status: number; body: any }> {
    return new Promise((resolve) => {
      const mockReq: any = {
        method: 'GET',
        url: '/leads',
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const mockRes: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: any) {
          resolve({ status: this.statusCode, body: data });
        },
        setHeader() {},
        header() {},
      };
      serverApp.app(mockReq, mockRes, () => {});
    });
  }

  // User Alpha -> Server Beta
  const crossAttack1 = await testTokenAccess(serverBeta, tokenAlpha);
  assert(crossAttack1.status === 403, '5.1 User Alpha accessing Server Beta rejected with HTTP 403 Forbidden');
  assert(crossAttack1.body.error.includes('Cross-tenant access is strictly blocked'), '5.1 Clear cross-tenant blocking explanation');

  // User Beta -> Server Alpha
  const crossAttack2 = await testTokenAccess(serverAlpha, tokenBeta);
  assert(crossAttack2.status === 403, '5.2 User Beta accessing Server Alpha rejected with HTTP 403 Forbidden');

  // Unauthenticated / Missing Bearer token
  const unauthAttack = await testTokenAccess(serverAlpha, '');
  assert(unauthAttack.status === 401, '5.3 Missing authorization header rejected with HTTP 401');

  // ----------------------------------------------------
  // SECTION 6: Strict Data Isolation Between Business Servers
  // ----------------------------------------------------
  console.log('\n[SECTION 6] Strict Data Isolation Across Independent Databases');

  // User Alpha creates lead on Server Alpha
  const leadAlpha = serverAlpha.dataService.createLead({
    name: 'Alpha Robotics India',
    phone: '+91 98111 22233',
    requirement: '5-Axis Servo Controller Panel',
    source: 'Website',
    status: 'New',
    budget: 450000,
    priority: 'High',
  });

  // User Beta creates lead on Server Beta
  const leadBeta = serverBeta.dataService.createLead({
    name: 'Beta Chemical Valves',
    phone: '+91 98444 55566',
    requirement: 'PTFE Lined Ball Valves (300 PSI)',
    source: 'Phone',
    status: 'Interested',
    budget: 180000,
    priority: 'Medium',
  });

  // Verify Server Alpha data
  const alphaLeads = serverAlpha.dataService.getLeads();
  assert(alphaLeads.length === 1 && alphaLeads[0].name === 'Alpha Robotics India', '6.1 Server Alpha contains only Alpha records');
  assert(!alphaLeads.some(l => l.name.includes('Beta')), '6.1 Zero Beta records leaked into Server Alpha');

  // Verify Server Beta data
  const betaLeads = serverBeta.dataService.getLeads();
  assert(betaLeads.length === 1 && betaLeads[0].name === 'Beta Chemical Valves', '6.2 Server Beta contains only Beta records');
  assert(!betaLeads.some(l => l.name.includes('Alpha')), '6.2 Zero Alpha records leaked into Server Beta');

  // Verify Central Auth DB has ZERO leads
  const centralLeadsCheck = (centralAuth as any).db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='leads'").get();
  assert(!centralLeadsCheck, '6.3 Central Auth DB contains absolutely zero business lead records');

  // ----------------------------------------------------
  // SECTION 7: Local Backup Creation, SHA-256 Checksum & Restore
  // ----------------------------------------------------
  console.log('\n[SECTION 7] Local Backup, SHA-256 Verification & Restore');

  // 7.1 Create Backup on Server Alpha
  const backupAlpha = await serverAlpha.dbManager.createBackup('Test pre-modification snapshot');
  assert(fs.existsSync(backupAlpha.filePath), '7.1 Backup file created on local filesystem');
  assert(backupAlpha.sha256Checksum.length === 64, '7.1 SHA-256 checksum generated');

  const sha256File = `${backupAlpha.filePath}.sha256`;
  assert(fs.existsSync(sha256File), '7.1 Companion .sha256 checksum file written alongside backup');

  // 7.2 Verify Backup Integrity
  const verifyRes = serverAlpha.dbManager.verifyBackup(backupAlpha.fileName);
  assert(verifyRes.isValid === true && verifyRes.checksumMatch === true, '7.2 Backup passed SHA-256 integrity verification');
  assert(verifyRes.integrityCheck === 'ok', '7.2 Backup passed SQLite structural PRAGMA integrity_check');

  // 7.3 Mutate Server Alpha state (Add temporary lead, delete original lead)
  serverAlpha.dataService.createLead({
    name: 'Temporary Unwanted Lead',
    phone: '+91 90000 00000',
    requirement: 'Temporary Item',
  });
  serverAlpha.dataService.deleteLead(leadAlpha.id);
  assert(serverAlpha.dataService.getLeads().length === 1 && serverAlpha.dataService.getLeads()[0].name === 'Temporary Unwanted Lead', '7.3 Server Alpha mutated with temporary record');

  // 7.4 Restore Server Alpha from Backup
  const restoreRes = await serverAlpha.dbManager.restoreFromBackup(backupAlpha.fileName);
  assert(restoreRes.success === true, '7.4 Database restored successfully from verified backup');

  // Verify restored state matches snapshot
  const restoredLeads = serverAlpha.dataService.getLeads();
  assert(restoredLeads.length === 1 && restoredLeads[0].name === 'Alpha Robotics India', '7.4 Original lead restored and temporary record wiped');

  // ----------------------------------------------------
  // SECTION 8: Crash Recovery & WAL Truncation
  // ----------------------------------------------------
  console.log('\n[SECTION 8] Database Crash Recovery & Resilience');

  const recoveryCheck = serverAlpha.dbManager.recoverDatabase();
  assert(recoveryCheck.status === 'healthy', '8.1 Database recovery and WAL truncation verified healthy');
  assert(recoveryCheck.integrityCheck === 'ok', '8.1 PRAGMA integrity_check confirms non-corrupt state');

  // ----------------------------------------------------
  // SECTION 9: Offline Resilience
  // ----------------------------------------------------
  console.log('\n[SECTION 9] Offline Resilience Testing');

  // Simulate Central Auth Server going down (close connection)
  centralAuth.close();
  console.log('  [SIMULATION] Central Auth Server is now OFFLINE.');

  // Existing authenticated session on Business Server Alpha should CONTINUE working locally!
  const offlineLead = serverAlpha.dataService.createLead({
    name: 'Offline Generated Lead',
    phone: '+91 97777 88888',
    requirement: 'Emergency Hydraulic Power Pack',
  });
  assert(offlineLead.name === 'Offline Generated Lead', '9.1 Business Server Alpha operates locally while Central Auth is completely offline');

  const offlineLeadsList = serverAlpha.dataService.getLeads();
  assert(offlineLeadsList.length === 2, '9.2 Business Server Alpha reads/writes records locally with zero internet/central dependencies');

  // ----------------------------------------------------
  // SECTION 10: Local-Only Voice NLP Extraction
  // ----------------------------------------------------
  console.log('\n[SECTION 10] Local-Only Voice NLP Processing (Zero External AI)');

  const localVoice = new LocalVoiceService();

  // 10.1 Hindi Spoken Prompt
  const hindiVoice = localVoice.extractFromTranscript(
    'राहुल पटेल का नया लीड जोड़ो। उसे कल सुबह 11 बजे फोन करना है। उसे तीन BHK फ्लैट चाहिए।',
    '2026-11-02'
  );
  assert(hindiVoice.isAmbiguous === false, '10.1 Actionable Hindi voice command processed locally');
  assert(hindiVoice.name.includes('राहुल') || hindiVoice.name.includes('Rahul'), '10.1 Contact name extracted from Hindi speech');
  assert(hindiVoice.requirement.includes('BHK') || hindiVoice.requirement.includes('फ्लैट'), '10.1 Requirement extracted from Hindi speech');
  assert(hindiVoice.followUpTime.includes('11'), '10.1 11:00 AM follow-up time extracted');

  // 10.2 English Spoken Prompt
  const engVoice = localVoice.extractFromTranscript(
    'Add a lead for Amit Sharma, needs 500 meters of industrial copper wiring, call tomorrow at 2 PM',
    '2026-11-02'
  );
  assert(engVoice.isAmbiguous === false, '10.2 Actionable English voice command processed locally');
  assert(engVoice.name.includes('Amit Sharma'), '10.2 Contact name extracted from English speech');

  // 10.3 Ambiguous Commands Defense (Must NOT create fake records)
  const greetingVoice = localVoice.extractFromTranscript('नमस्ते भाई');
  assert(greetingVoice.isAmbiguous === true, '10.3 Conversational greeting flagged as ambiguous');
  assert(greetingVoice.name === '', '10.3 Ambiguous command does not hallucinate fake contact name');

  const helloVoice = localVoice.extractFromTranscript('hello');
  assert(helloVoice.isAmbiguous === true, '10.4 English "hello" flagged as ambiguous');

  // Cleanup
  serverAlpha.dbManager.close();
  serverBeta.dbManager.close();

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n================================================================');
  console.log(`  DISTRIBUTED ARCHITECTURE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDistributedArchitectureTests().catch((err) => {
  console.error('[CRITICAL TEST RUNNER ERROR]:', err);
  process.exit(1);
});
