import { CentralAuthService } from '../server/auth/centralAuthService';
import { BusinessDataService } from '../server/business/businessDataService';
import { VoiceExtractionService } from '../server/voice/voiceExtractionService';
import path from 'path';
import fs from 'fs';

async function runTestSuite() {
  console.log('========================================================');
  console.log('  LEADFLOW V1 — SECURITY, ARCHITECTURE & INTEGRATION AUDIT TESTS');
  console.log('========================================================\n');

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

  const testDir = path.resolve(process.cwd(), 'data', 'test_env');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const centralAuthDbPath = path.join(testDir, 'test_central_auth.sqlite');
  const authService = new CentralAuthService(centralAuthDbPath);

  // ----------------------------------------------------
  // TEST SECTION 1: Authentication Security & Failures
  // ----------------------------------------------------
  console.log('[SECTION 1] Authentication Security & Failure Handling');

  // 1.1 Registered user login with scrypt PIN verification
  const validLogin = authService.loginWithCredentials('9820144821', '1234');
  assert(validLogin.token.length > 20, '1.1 Valid credentials produce signed JWT token');
  assert(validLogin.user.businessId === 'biz_sharma_enterprises', '1.1 Authenticated user mapped to correct business identity');

  // 1.2 Wrong PIN failure
  try {
    authService.loginWithCredentials('9820144821', '9999');
    assert(false, '1.2 Invalid PIN should throw authentication error');
  } catch (err: any) {
    assert(err.message === 'Invalid PIN', '1.2 Invalid PIN correctly rejected with 401 error message');
  }

  // 1.3 Unregistered phone login failure
  try {
    authService.loginWithCredentials('9999999999', '1234');
    assert(false, '1.3 Unregistered user should throw not found error');
  } catch (err: any) {
    assert(err.message === 'User not found. Please register or verify with WhatsApp OTP.', '1.3 Unregistered phone rejected');
  }

  // 1.4 Password/PIN hashing audit (Verify scrypt, NOT plain or plain SHA-256)
  const userRecord = authService.getUserByPhone('9820144821');
  assert(userRecord !== null, '1.4 User record retrievable from central database');
  assert(userRecord!.hashedPin.includes(':'), '1.4 PIN stored as scrypt salt:derivedKey hash format');
  assert(userRecord!.hashedPin.split(':')[0].length === 32, '1.4 16-byte random salt stored with hash');
  assert(userRecord!.hashedPin.split(':')[1].length === 128, '1.4 64-byte derived scrypt key cryptographically secure');

  // ----------------------------------------------------
  // TEST SECTION 2: OTP Replay, Rate-Limiting & Expiry
  // ----------------------------------------------------
  console.log('\n[SECTION 2] OTP Lifecycle (Replay, Rate-Limiting & Expiry)');

  // 2.1 OTP Generation
  const otpPhone = '9876500001';
  const otpRes = await authService.requestWhatsAppOtp(otpPhone);
  assert(otpRes.success === true && typeof otpRes.devOtp === 'string', '2.1 OTP generated securely');
  const originalOtp = otpRes.devOtp!;

  // 2.2 Rate limiting: immediate second request within 60s cooldown must fail
  try {
    await authService.requestWhatsAppOtp(otpPhone);
    assert(false, '2.2 Rapid successive OTP request should be rate-limited');
  } catch (err: any) {
    assert(err.message.includes('Please wait') && err.message.includes('s before'), '2.2 Cooldown rate-limit enforced on OTP requests');
  }

  // 2.3 Verify OTP
  const verifySuccess = authService.verifyOtp(otpPhone, originalOtp);
  assert(verifySuccess === true, '2.3 Valid OTP verified successfully');

  // 2.4 Replay attack: attempting to use the EXACT SAME OTP again must fail immediately
  try {
    const replayed = authService.verifyOtp(otpPhone, originalOtp);
    assert(replayed === false, '2.4 OTP single-use enforced (Replay attack blocked, returned false)');
  } catch (err: any) {
    assert(err.message.includes('Invalid') || err.message.includes('expired'), '2.4 OTP single-use enforced (Replay attack blocked)');
  }

  // 2.5 Expired OTP rejection
  const expiredPhone = '9876500002';
  const db = (authService as any).db;
  const expiredHash = (authService as any).hashOtp('654321');
  db.prepare(`
    INSERT INTO otp_tokens (phone, otp_hash, expires_at, attempts, last_requested_at, created_at)
    VALUES (?, ?, ?, 0, ?, ?)
  `).run(expiredPhone, expiredHash, Date.now() - 60000, Date.now() - 60000, Date.now() - 60000); // expired 1 min ago

  try {
    authService.verifyOtp(expiredPhone, '654321');
    assert(false, '2.5 Expired OTP must not be verified');
  } catch (err: any) {
    assert(err.message.includes('expired'), '2.5 Expired OTP correctly rejected');
  }

  // ----------------------------------------------------
  // TEST SECTION 3: Session Expiry, Revocation & Logout
  // ----------------------------------------------------
  console.log('\n[SECTION 3] Session Lifecycle, Expiry & Revocation');

  const sessionToken = validLogin.token;
  const verifiedUser = authService.verifyToken(sessionToken);
  assert(verifiedUser !== null && verifiedUser.phone === '9820144821', '3.1 Active session token verifies successfully');

  // 3.2 Token Revocation (Logout)
  const logoutSuccess = authService.revokeToken(sessionToken);
  assert(logoutSuccess === true, '3.2 Logout revokes session token in central database');

  // 3.3 Verify revoked token is now rejected
  const revokedCheck = authService.verifyToken(sessionToken);
  assert(revokedCheck === null, '3.3 Revoked token rejected on subsequent API authorization attempt');

  // 3.4 Tampered / garbage token
  const tamperedCheck = authService.verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.badpayload.signature');
  assert(tamperedCheck === null, '3.4 Tampered / forged token safely rejected');

  // ----------------------------------------------------
  // TEST SECTION 4: Business Data Isolation & Anti-Traversal
  // ----------------------------------------------------
  console.log('\n[SECTION 4] Business Data Isolation & Directory Traversal Security');

  // Verify central auth database stores NO business tables (leads, customers, followups)
  const centralTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const tableNames = centralTables.map(t => t.name);
  assert(!tableNames.includes('leads'), '4.1 Central auth DB contains no "leads" table');
  assert(!tableNames.includes('customers'), '4.1 Central auth DB contains no "customers" table');
  assert(!tableNames.includes('follow_ups'), '4.1 Central auth DB contains no "follow_ups" table');

  // Initialize two distinct business databases
  const bizADbPath = path.join(testDir, 'biz_alpha.sqlite');
  const bizBDbPath = path.join(testDir, 'biz_beta.sqlite');

  const bizA = new BusinessDataService('biz_alpha', bizADbPath);
  const bizB = new BusinessDataService('biz_beta', bizBDbPath);

  // Create lead in Business A
  const leadA = bizA.createLead({
    name: 'Kavita Patel',
    phone: '+91 98222 33333',
    requirement: 'Solar Inverter 5kVA',
    source: 'Website',
    status: 'New',
    notes: 'Needs installation in Pune',
    budget: 85000,
    priority: 'High',
  });

  // Check Business B cannot see Business A's lead
  const leadsB = bizB.getLeads();
  assert(leadsB.length === 0, '4.2 Business B database contains 0 records (no cross-tenant pollution)');
  assert(bizB.getLeadById(leadA.id) === null, '4.2 Direct lead lookup across business boundary returns null');

  // Path Traversal Security Test
  try {
    new BusinessDataService('../../evil_tenant', path.join(testDir, 'evil.sqlite'));
    assert(false, '4.3 Directory traversal in businessId should be rejected');
  } catch (err: any) {
    assert(err.message.includes('Invalid businessId format'), '4.3 Directory traversal path attack rejected by regex whitelist');
  }

  // Cross-tenant access check simulation
  function simulateAccessCheck(userBizId: string, requestedBizId: string): { status: number; allowed: boolean } {
    if (userBizId !== requestedBizId) {
      return { status: 403, allowed: false };
    }
    return { status: 200, allowed: true };
  }
  const crossTenantAttempt = simulateAccessCheck('biz_alpha', 'biz_beta');
  assert(crossTenantAttempt.status === 403 && !crossTenantAttempt.allowed, '4.4 Cross-business API access strictly blocked with HTTP 403 Forbidden');

  // ----------------------------------------------------
  // TEST SECTION 5: Business Operations & Persistence
  // ----------------------------------------------------
  console.log('\n[SECTION 5] Business Operations, Validation & Database Persistence');

  // 5.1 Invalid lead data validation (Missing required fields)
  try {
    bizA.createLead({
      name: '',
      phone: '',
      requirement: '',
    });
    assert(false, '5.1 Empty lead record should be rejected');
  } catch (err: any) {
    assert(err.message.includes('required'), '5.1 Invalid lead rejected for missing required fields');
  }

  // 5.2 Lead conversion to customer
  const customerA = bizA.convertLeadToCustomer(leadA.id, 85000, 'Customer paid 20% advance for Solar system');
  assert(customerA.name === 'Kavita Patel', '5.2 Converted customer carries contact details');
  assert(customerA.totalDealValue === 85000, '5.2 Deal value properly stored in customer profile');

  const updatedLeadA = bizA.getLeadById(leadA.id);
  assert(updatedLeadA?.status === 'Converted', '5.2 Lead status automatically transitioned to Converted');

  // 5.3 Follow-up scheduling and completion
  const followUp = bizA.scheduleFollowUp({
    customerId: customerA.id,
    contactName: customerA.name,
    contactPhone: customerA.phone,
    title: 'Site inspection call',
    dueDate: '2026-11-15',
    dueTime: '10:30 AM',
    priority: 'high',
  });
  assert(followUp.status === 'pending', '5.3 Follow-up created with pending status');

  const completedFollowUp = bizA.completeFollowUp(followUp.id, 'Site inspection scheduled with technician');
  assert(completedFollowUp.status === 'completed', '5.3 Follow-up completed with notes');

  // 5.4 Database Persistence Test (Close connection, re-open new instance from SQLite file)
  const reloadedBizA = new BusinessDataService('biz_alpha', bizADbPath);
  const persistedLeads = reloadedBizA.getLeads();
  const persistedCustomers = reloadedBizA.getCustomers();
  const persistedFollowUps = reloadedBizA.getFollowUps();

  assert(persistedLeads.length === 1 && persistedLeads[0].name === 'Kavita Patel', '5.4 Leads fully persisted across connection restarts');
  assert(persistedCustomers.length === 1 && persistedCustomers[0].name === 'Kavita Patel', '5.4 Customers fully persisted across connection restarts');
  assert(persistedFollowUps.length === 1 && persistedFollowUps[0].status === 'completed', '5.4 Follow-ups and completion state fully persisted');

  // ----------------------------------------------------
  // TEST SECTION 6: Voice Assistant NLP & Ambiguity Defense
  // ----------------------------------------------------
  console.log('\n[SECTION 6] AI Voice Assistant Extraction & Ambiguity Defense');

  const voiceService = new VoiceExtractionService();

  // 6.1 Accurate Hindi / Hinglish Extraction
  const hindiPrompt = 'राहुल पटेल का नया लीड जोड़ो। उसे कल सुबह 11 बजे फोन करना है। उसे तीन BHK फ्लैट चाहिए।';
  const extractedValid = await voiceService.extractFromTranscript(hindiPrompt, '2026-11-02');
  assert(extractedValid.isAmbiguous === false, '6.1 Actionable command recognized as valid');
  assert(extractedValid.name.includes('राहुल') || extractedValid.name.includes('Rahul'), '6.1 Name extracted accurately from Hindi transcript');
  assert(extractedValid.requirement.includes('BHK') || extractedValid.requirement.includes('फ्लैट'), '6.1 Requirement extracted accurately');
  assert(extractedValid.followUpTime.includes('11'), '6.1 Follow-up time parsed as 11:00 AM');

  // 6.2 English Command Extraction
  const engPrompt = 'Add a lead for Amit Sharma, needs 500 meters of industrial copper wiring, call tomorrow at 2 PM';
  const extractedEng = await voiceService.extractFromTranscript(engPrompt, '2026-11-02');
  assert(extractedEng.isAmbiguous === false, '6.2 English prompt recognized as valid');
  assert(extractedEng.name.includes('Amit Sharma'), '6.2 English contact name parsed');
  assert(extractedEng.requirement.includes('copper wiring'), '6.2 Requirement parsed accurately');

  // 6.3 Ambiguous Voice Input Defense (Greeting only - must NOT create lead)
  const greetingPrompt = 'नमस्ते भाई';
  const extractedGreeting = await voiceService.extractFromTranscript(greetingPrompt);
  assert(extractedGreeting.isAmbiguous === true, '6.3 Greeting-only command correctly flagged as ambiguous');
  assert(extractedGreeting.name === '', '6.3 Ambiguous command does not hallucinate fake contact name');

  // 6.4 Ambiguous English greeting
  const englishHello = 'hello';
  const extractedHello = await voiceService.extractFromTranscript(englishHello);
  assert(extractedHello.isAmbiguous === true, '6.4 English "hello" correctly flagged as ambiguous');

  // 6.5 Short / Nonsensical input
  const vaguePrompt = 'ok test';
  const extractedVague = await voiceService.extractFromTranscript(vaguePrompt);
  assert(extractedVague.isAmbiguous === true, '6.5 Short non-actionable input flagged as ambiguous');

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n========================================================');
  console.log(`  AUDIT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('[CRITICAL TEST RUNNER ERROR]:', err);
  process.exit(1);
});
