import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export interface RegisteredUser {
  id: string;
  phone: string;
  hashedPin: string;
  businessId: string;
  businessName: string;
  businessServerUrl: string;
  createdAt: string;
}

export interface BusinessServerRegistration {
  businessId: string;
  businessName: string;
  serverUrl: string;
  registeredAt: string;
  lastHeartbeat: string;
  status: 'active' | 'offline';
}

export interface CentralSessionTokenPayload {
  jti: string;
  userId: string;
  businessId: string;
  businessServerUrl: string;
  phone: string;
  iat: number;
  exp: number;
}

export class CentralAuthService {
  private db: Database.Database;
  private tokenSecret: string;

  constructor(dbPath?: string, secret?: string) {
    const dataDir = path.resolve(process.cwd(), 'data', 'central');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const file = dbPath || path.join(dataDir, 'central_auth.sqlite');
    this.db = new Database(file);
    this.tokenSecret = secret || process.env.CENTRAL_AUTH_SECRET || 'leadflow_distributed_secure_secret_2026';
    
    // WAL mode for reliability
    this.db.pragma('journal_mode = WAL');
    this.initTables();
    this.seedDefaultAccounts();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS registered_users (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        hashed_pin TEXT NOT NULL,
        business_id TEXT NOT NULL,
        business_name TEXT NOT NULL,
        business_server_url TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS business_servers (
        business_id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        server_url TEXT NOT NULL,
        registered_at TEXT NOT NULL,
        last_heartbeat TEXT NOT NULL,
        status TEXT DEFAULT 'active'
      );

      CREATE TABLE IF NOT EXISTS otp_tokens (
        phone TEXT PRIMARY KEY,
        otp_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_requested_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS verified_registrations (
        phone TEXT PRIMARY KEY,
        verified_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS revoked_tokens (
        jti TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        revoked_at INTEGER NOT NULL
      );
    `);
  }

  /**
   * Cryptographically secure scrypt PIN hashing with random per-user 16-byte salt
   */
  public hashPin(pin: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(pin.trim(), salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
  }

  public verifyPin(pin: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(':')) {
      return false;
    }
    const [salt, key] = storedHash.split(':');
    const derivedKey = crypto.scryptSync(pin.trim(), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(key, 'hex'));
  }

  private hashOtp(otp: string): string {
    return crypto.scryptSync(otp.trim(), 'leadflow_central_otp_salt', 32).toString('hex');
  }

  private seedDefaultAccounts() {
    const defaultPhone = '9820144821';
    const defaultBizId = 'biz_sharma_enterprises';
    const defaultServerUrl = process.env.BUSINESS_SERVER_URL || 'http://localhost:3000/api/business-server/biz_sharma_enterprises';

    // Seed default business server registration
    const existingServer = this.db.prepare('SELECT business_id FROM business_servers WHERE business_id = ?').get(defaultBizId);
    if (!existingServer) {
      this.db.prepare(`
        INSERT INTO business_servers (business_id, business_name, server_url, registered_at, last_heartbeat, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `).run(
        defaultBizId,
        'Sharma Trading & Services',
        defaultServerUrl,
        new Date().toISOString(),
        new Date().toISOString()
      );
    }

    // Seed default user
    const existingUser = this.db.prepare('SELECT id, hashed_pin FROM registered_users WHERE phone = ?').get(defaultPhone) as any;
    if (!existingUser) {
      const defaultPinHash = this.hashPin('1234');
      this.db.prepare(`
        INSERT INTO registered_users (id, phone, hashed_pin, business_id, business_name, business_server_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'usr_demo_101',
        defaultPhone,
        defaultPinHash,
        defaultBizId,
        'Sharma Trading & Services',
        defaultServerUrl,
        new Date().toISOString()
      );
    }
  }

  /**
   * Request OTP (Pure local generation, no external SMS/WhatsApp SaaS dependencies)
   */
  public async requestOtp(phone: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      throw new Error('Please enter a valid 10-digit Indian mobile number');
    }

    const now = Date.now();
    const existing = this.db.prepare('SELECT * FROM otp_tokens WHERE phone = ?').get(cleanPhone) as any;

    // Rate limiting: 60-second cooldown between requests
    if (existing && (now - existing.last_requested_at) < 60 * 1000) {
      const waitSeconds = Math.ceil((60000 - (now - existing.last_requested_at)) / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds}s before requesting another OTP.`);
    }

    // Cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(otp);
    const expiresAt = now + 5 * 60 * 1000; // 5-minute strict expiry

    this.db.prepare(`
      INSERT INTO otp_tokens (phone, otp_hash, expires_at, attempts, last_requested_at, created_at)
      VALUES (?, ?, ?, 0, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET
        otp_hash = excluded.otp_hash,
        expires_at = excluded.expires_at,
        attempts = 0,
        last_requested_at = excluded.last_requested_at,
        created_at = excluded.created_at
    `).run(cleanPhone, otpHash, expiresAt, now, now);

    const isProd = process.env.NODE_ENV === 'production';
    const maskedPhone = `+91 ${cleanPhone.slice(0, 2)}****${cleanPhone.slice(-4)}`;

    return {
      success: true,
      message: `OTP generated for mobile ${maskedPhone}`,
      devOtp: isProd ? undefined : otp,
    };
  }

  public verifyOtp(phone: string, otp: string): boolean {
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    const row = this.db.prepare('SELECT * FROM otp_tokens WHERE phone = ?').get(cleanPhone) as any;
    if (!row) return false;

    // Expiry check
    if (Date.now() > row.expires_at) {
      this.db.prepare('DELETE FROM otp_tokens WHERE phone = ?').run(cleanPhone);
      throw new Error('OTP has expired. Please request a new code.');
    }

    // Attempt limit: maximum 5 failed attempts
    if (row.attempts >= 5) {
      this.db.prepare('DELETE FROM otp_tokens WHERE phone = ?').run(cleanPhone);
      throw new Error('Too many invalid attempts. This OTP has been invalidated for security. Please request a new code.');
    }

    const providedHash = this.hashOtp(otp.trim());
    const isMatch = crypto.timingSafeEqual(Buffer.from(providedHash, 'hex'), Buffer.from(row.otp_hash, 'hex'));

    if (!isMatch) {
      this.db.prepare('UPDATE otp_tokens SET attempts = attempts + 1 WHERE phone = ?').run(cleanPhone);
      return false;
    }

    // Single-use enforcement: Delete immediately upon success
    this.db.prepare('DELETE FROM otp_tokens WHERE phone = ?').run(cleanPhone);
    this.db.prepare('INSERT OR REPLACE INTO verified_registrations (phone, verified_at) VALUES (?, ?)').run(cleanPhone, Date.now());
    return true;
  }

  /**
   * User login with mobile + PIN
   */
  public loginWithCredentials(phone: string, pin: string): { user: RegisteredUser; token: string } {
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    const row = this.db.prepare('SELECT * FROM registered_users WHERE phone = ?').get(cleanPhone) as any;

    if (!row) {
      // Must be verified via OTP within 15 minutes before creating new account
      const verified = this.db.prepare('SELECT * FROM verified_registrations WHERE phone = ?').get(cleanPhone) as any;
      if (!verified || (Date.now() - verified.verified_at > 15 * 60 * 1000)) {
        throw new Error('User not found. Please register or verify with WhatsApp OTP.');
      }
      this.db.prepare('DELETE FROM verified_registrations WHERE phone = ?').run(cleanPhone);

      const businessId = `biz_${cleanPhone}_${crypto.randomBytes(3).toString('hex')}`;
      const businessName = `Business +91 ${cleanPhone}`;
      const userId = `usr_${crypto.randomBytes(4).toString('hex')}`;
      const businessServerUrl = `/api/business-server/${businessId}`;
      const hashedPin = this.hashPin(pin);
      const createdAt = new Date().toISOString();

      this.db.prepare(`
        INSERT INTO registered_users (id, phone, hashed_pin, business_id, business_name, business_server_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, cleanPhone, hashedPin, businessId, businessName, businessServerUrl, createdAt);

      // Register server entry
      this.db.prepare(`
        INSERT OR REPLACE INTO business_servers (business_id, business_name, server_url, registered_at, last_heartbeat, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `).run(businessId, businessName, businessServerUrl, createdAt, createdAt);

      const newUser: RegisteredUser = {
        id: userId,
        phone: cleanPhone,
        hashedPin,
        businessId,
        businessName,
        businessServerUrl,
        createdAt,
      };

      const token = this.generateSignedToken({
        userId,
        phone: cleanPhone,
        businessId,
        businessServerUrl,
      });

      return { user: newUser, token };
    }

    const isPinValid = this.verifyPin(pin, row.hashed_pin);
    if (!isPinValid) {
      throw new Error('Invalid PIN');
    }

    const user: RegisteredUser = {
      id: row.id,
      phone: row.phone,
      hashedPin: row.hashed_pin,
      businessId: row.business_id,
      businessName: row.business_name,
      businessServerUrl: row.business_server_url,
      createdAt: row.created_at,
    };

    const token = this.generateSignedToken({
      userId: user.id,
      phone: user.phone,
      businessId: user.businessId,
      businessServerUrl: user.businessServerUrl,
    });

    return { user, token };
  }

  /**
   * Cryptographically signed HMAC-SHA256 Token
   */
  public generateSignedToken(data: { userId: string; phone: string; businessId: string; businessServerUrl: string; expiresInMs?: number }): string {
    const jti = crypto.randomUUID();
    const now = Date.now();
    const exp = now + (data.expiresInMs || 86400000 * 30); // 30-day or custom short-lived

    const payload: CentralSessionTokenPayload = {
      jti,
      userId: data.userId,
      phone: data.phone,
      businessId: data.businessId,
      businessServerUrl: data.businessServerUrl,
      iat: now,
      exp,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', this.tokenSecret).update(payloadBase64).digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  public verifyToken(token: string): CentralSessionTokenPayload | null {
    try {
      if (!token || !token.includes('.')) return null;
      const [payloadBase64, providedSignature] = token.split('.');
      if (!payloadBase64 || !providedSignature) return null;

      const expectedSignature = crypto.createHmac('sha256', this.tokenSecret).update(payloadBase64).digest('base64url');
      if (!crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
        return null;
      }

      const payload: CentralSessionTokenPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
      if (Date.now() > payload.exp) return null;

      // Check revocation list
      if (payload.jti) {
        const revoked = this.db.prepare('SELECT jti FROM revoked_tokens WHERE jti = ?').get(payload.jti);
        if (revoked) return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  public revokeToken(token: string): boolean {
    try {
      if (!token || !token.includes('.')) return false;
      const [payloadBase64] = token.split('.');
      const payload: CentralSessionTokenPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
      if (payload.jti) {
        this.db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, user_id, revoked_at) VALUES (?, ?, ?)').run(
          payload.jti,
          payload.userId || 'unknown',
          Date.now()
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Business Server Discovery & Registration
   */
  public registerBusinessServer(businessId: string, businessName: string, serverUrl: string): BusinessServerRegistration {
    if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
      throw new Error('Invalid businessId format');
    }

    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO business_servers (business_id, business_name, server_url, registered_at, last_heartbeat, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      ON CONFLICT(business_id) DO UPDATE SET
        business_name = excluded.business_name,
        server_url = excluded.server_url,
        last_heartbeat = excluded.last_heartbeat,
        status = 'active'
    `).run(businessId, businessName, serverUrl, now, now);

    // Also update any registered users for this business
    this.db.prepare('UPDATE registered_users SET business_server_url = ? WHERE business_id = ?').run(serverUrl, businessId);

    return {
      businessId,
      businessName,
      serverUrl,
      registeredAt: now,
      lastHeartbeat: now,
      status: 'active',
    };
  }

  public resolveBusinessServer(businessId: string): BusinessServerRegistration | null {
    if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) return null;
    const row = this.db.prepare('SELECT * FROM business_servers WHERE business_id = ?').get(businessId) as any;
    if (!row) return null;
    return {
      businessId: row.business_id,
      businessName: row.business_name,
      serverUrl: row.server_url,
      registeredAt: row.registered_at,
      lastHeartbeat: row.last_heartbeat,
      status: row.status,
    };
  }

  public getUserByPhone(phone: string): RegisteredUser | null {
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    const row = this.db.prepare('SELECT * FROM registered_users WHERE phone = ?').get(cleanPhone) as any;
    if (!row) return null;
    return {
      id: row.id,
      phone: row.phone,
      hashedPin: row.hashed_pin,
      businessId: row.business_id,
      businessName: row.business_name,
      businessServerUrl: row.business_server_url,
      createdAt: row.created_at,
    };
  }

  public getUserById(userId: string): RegisteredUser | null {
    const row = this.db.prepare('SELECT * FROM registered_users WHERE id = ?').get(userId) as any;
    if (!row) return null;
    return {
      id: row.id,
      phone: row.phone,
      hashedPin: row.hashed_pin,
      businessId: row.business_id,
      businessName: row.business_name,
      businessServerUrl: row.business_server_url,
      createdAt: row.created_at,
    };
  }

  public close() {
    this.db.close();
  }
}
