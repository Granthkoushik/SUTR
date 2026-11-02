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

export interface WhatsAppOtpProvider {
  name: string;
  isLiveConfigured: boolean;
  sendOtp(phone: string, otp: string): Promise<{ success: boolean; messageId?: string; devOtp?: string }>;
}

// WhatsApp Cloud API Provider
export class WhatsAppCloudApiProvider implements WhatsAppOtpProvider {
  name = 'WhatsApp Cloud API';
  isLiveConfigured: boolean;
  private token?: string;
  private phoneNumberId?: string;

  constructor() {
    this.token = process.env.WHATSAPP_CLOUD_API_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.isLiveConfigured = Boolean(this.token && this.phoneNumberId);
  }

  async sendOtp(phone: string, otp: string): Promise<{ success: boolean; messageId?: string; devOtp?: string }> {
    const maskedPhone = `+91 ******${phone.slice(-4)}`;

    if (this.isLiveConfigured) {
      try {
        const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: `91${phone}`,
            type: 'template',
            template: {
              name: 'leadflow_otp_verification',
              language: { code: 'en' },
              components: [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: otp }],
                },
                {
                  type: 'button',
                  sub_type: 'url',
                  index: '0',
                  parameters: [{ type: 'text', text: otp }],
                },
              ],
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          console.error('[WhatsApp Cloud API Error] Delivery failed:', data.error?.message || data);
          throw new Error(`WhatsApp delivery failed: ${data.error?.message || 'API error'}`);
        }

        return {
          success: true,
          messageId: data.messages?.[0]?.id || `wa_live_${Date.now()}`,
          devOtp: undefined, // Never expose in production live mode
        };
      } catch (err: any) {
        console.error('[WhatsApp Cloud API Gateway Error]:', err.message);
        throw err;
      }
    }

    // Development / Prototyping provider when Cloud API credentials are not provided in environment
    const isProd = process.env.NODE_ENV === 'production';
    return {
      success: true,
      messageId: `wa_sim_${Date.now()}`,
      devOtp: isProd ? undefined : otp, // Completely disabled in production
    };
  }
}

export class CentralAuthService {
  private db: Database.Database;
  private otpProvider: WhatsAppOtpProvider;

  constructor(dbPath?: string, otpProvider?: WhatsAppOtpProvider) {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const file = dbPath || path.join(dataDir, 'central_auth.sqlite');
    this.db = new Database(file);
    this.otpProvider = otpProvider || new WhatsAppCloudApiProvider();
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

      CREATE TABLE IF NOT EXISTS otp_tokens (
        phone TEXT PRIMARY KEY,
        otp_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_requested_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS revoked_tokens (
        jti TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        revoked_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS verified_registrations (
        phone TEXT PRIMARY KEY,
        verified_at INTEGER NOT NULL
      );
    `);
  }

  /**
   * Cryptographically secure scrypt PIN hashing with random per-user 16-byte salt
   * Stores as salt:derivedKey
   */
  public hashPin(pin: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(pin.trim(), salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
  }

  public verifyPin(pin: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(':')) {
      // Fallback for initial demo seed migration if needed
      return false;
    }
    const [salt, key] = storedHash.split(':');
    const derivedKey = crypto.scryptSync(pin.trim(), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(key, 'hex'));
  }

  private hashOtp(otp: string): string {
    return crypto.scryptSync(otp.trim(), 'leadflow_otp_salt_static', 32).toString('hex');
  }

  private seedDefaultAccounts() {
    const defaultPhone = '9820144821';
    const existing = this.db.prepare('SELECT id, hashed_pin FROM registered_users WHERE phone = ?').get(defaultPhone) as any;
    if (!existing) {
      const defaultPinHash = this.hashPin('1234');
      this.db.prepare(`
        INSERT INTO registered_users (id, phone, hashed_pin, business_id, business_name, business_server_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'usr_demo_101',
        defaultPhone,
        defaultPinHash,
        'biz_sharma_enterprises',
        'Sharma Trading & Services',
        'http://localhost:3000/api/business/biz_sharma_enterprises',
        new Date().toISOString()
      );
    } else if (!existing.hashed_pin.includes(':')) {
      // Migrate legacy SHA-256 hash to scrypt
      const updatedHash = this.hashPin('1234');
      this.db.prepare('UPDATE registered_users SET hashed_pin = ? WHERE phone = ?').run(updatedHash, defaultPhone);
    }
  }

  public async requestWhatsAppOtp(phone: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
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

    // Generate cryptographically random 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(otp);
    const expiresAt = now + 5 * 60 * 1000; // Strict 5-minute expiry

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

    const result = await this.otpProvider.sendOtp(cleanPhone, otp);

    return {
      success: true,
      message: `WhatsApp OTP dispatched to +91 ${cleanPhone.slice(0, 2)}****${cleanPhone.slice(-4)}`,
      devOtp: result.devOtp,
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
    // Mark phone as OTP-verified for account registration or login
    this.db.prepare('INSERT OR REPLACE INTO verified_registrations (phone, verified_at) VALUES (?, ?)').run(cleanPhone, Date.now());
    return true;
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

  public loginWithCredentials(phone: string, pin: string): { user: RegisteredUser; token: string } {
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    const row = this.db.prepare('SELECT * FROM registered_users WHERE phone = ?').get(cleanPhone) as any;

    if (!row) {
      // Must be verified via WhatsApp OTP within 15 minutes before creating new account
      const verified = this.db.prepare('SELECT * FROM verified_registrations WHERE phone = ?').get(cleanPhone) as any;
      if (!verified || (Date.now() - verified.verified_at > 15 * 60 * 1000)) {
        throw new Error('User not found. Please register or verify with WhatsApp OTP.');
      }
      // Consume verified OTP registration record
      this.db.prepare('DELETE FROM verified_registrations WHERE phone = ?').run(cleanPhone);

      // Auto-register new small business on first valid WhatsApp OTP + PIN creation
      const businessId = `biz_${cleanPhone}_${crypto.randomBytes(4).toString('hex')}`;
      const businessName = `Business +91 ${cleanPhone}`;
      const userId = `usr_${crypto.randomBytes(4).toString('hex')}`;
      const businessServerUrl = `http://localhost:3000/api/business/${businessId}`;
      const hashedPin = this.hashPin(pin);

      this.db.prepare(`
        INSERT INTO registered_users (id, phone, hashed_pin, business_id, business_name, business_server_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, cleanPhone, hashedPin, businessId, businessName, businessServerUrl, new Date().toISOString());

      const newUser: RegisteredUser = {
        id: userId,
        phone: cleanPhone,
        hashedPin,
        businessId,
        businessName,
        businessServerUrl,
        createdAt: new Date().toISOString(),
      };

      const jti = crypto.randomUUID();
      const token = Buffer.from(JSON.stringify({ jti, userId, businessId, phone: cleanPhone, exp: Date.now() + 86400000 * 30 })).toString('base64');
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

    const jti = crypto.randomUUID();
    const token = Buffer.from(JSON.stringify({ jti, userId: user.id, businessId: user.businessId, phone: user.phone, exp: Date.now() + 86400000 * 30 })).toString('base64');
    return { user, token };
  }

  public verifyToken(token: string): { jti: string; userId: string; businessId: string; phone: string } | null {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
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
      const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
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

  public getWhatsAppProviderInfo() {
    return {
      name: this.otpProvider.name,
      isLiveConfigured: this.otpProvider.isLiveConfigured,
    };
  }
}
