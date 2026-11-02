import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export interface BackupRecord {
  id: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  createdAt: string;
  verified: boolean;
  notes?: string;
}

export class BusinessDatabaseManager {
  private db!: Database.Database;
  public readonly businessId: string;
  public readonly databaseDir: string;
  public readonly databasePath: string;
  public readonly backupDir: string;

  constructor(businessId: string, customBaseDir?: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
      throw new Error(`Invalid businessId: '${businessId}'. Directory traversal rejected.`);
    }
    this.businessId = businessId;

    const baseDir = customBaseDir || path.resolve(process.cwd(), 'data', 'business_storage');
    this.databaseDir = path.join(baseDir, businessId);
    this.backupDir = path.join(this.databaseDir, 'backups');

    if (!fs.existsSync(this.databaseDir)) {
      fs.mkdirSync(this.databaseDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    this.databasePath = path.join(this.databaseDir, 'leadflow.sqlite');
    this.initDatabase();
  }

  private initDatabase() {
    this.db = new Database(this.databasePath);

    // 1. Crash Recovery & Resilience configuration (WAL mode)
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');

    // Run recovery checkpoint & integrity check on startup
    this.recoverDatabase();

    // 2. Run versioned migrations
    this.runMigrations();
  }

  /**
   * Database Recovery after unexpected shutdown:
   * Flushes WAL journals and verifies database integrity.
   */
  public recoverDatabase(): { status: 'healthy' | 'recovered' | 'corrupt'; integrityCheck: string } {
    try {
      this.db.pragma('wal_checkpoint(TRUNCATE)');
      const checkResult = this.db.pragma('integrity_check') as [{ integrity_check: string }];
      const resultText = checkResult?.[0]?.integrity_check || 'ok';

      return {
        status: resultText === 'ok' ? 'healthy' : 'corrupt',
        integrityCheck: resultText,
      };
    } catch (err: any) {
      console.error(`[BusinessDB Recovery Error - ${this.businessId}]:`, err);
      return {
        status: 'corrupt',
        integrityCheck: err.message,
      };
    }
  }

  /**
   * Versioned database migrations engine
   */
  private runMigrations() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const applied = new Set<number>(
      (this.db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map(r => r.version)
    );

    // Migration 1: Base Tables
    if (!applied.has(1)) {
      this.db.transaction(() => {
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
            due_time TEXT DEFAULT '11:00 AM',
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

          CREATE TABLE IF NOT EXISTS backups_metadata (
            id TEXT PRIMARY KEY,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size_bytes INTEGER NOT NULL,
            sha256_checksum TEXT NOT NULL,
            created_at TEXT NOT NULL,
            verified INTEGER DEFAULT 0,
            notes TEXT
          );
        `);

        this.db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (1, ?, ?)').run(
          '001_initial_core_schema',
          new Date().toISOString()
        );
      })();
    }

    // Migration 2: Performance Indices
    if (!applied.has(2)) {
      this.db.transaction(() => {
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
          CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads (is_archived);
          CREATE INDEX IF NOT EXISTS idx_followups_due_date ON follow_ups (due_date);
          CREATE INDEX IF NOT EXISTS idx_followups_status ON follow_ups (status);
          CREATE INDEX IF NOT EXISTS idx_interactions_entity ON interactions (entity_id);
        `);

        this.db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (2, ?, ?)').run(
          '002_performance_indices',
          new Date().toISOString()
        );
      })();
    }
  }

  public getRawDb(): Database.Database {
    return this.db;
  }

  /**
   * Local Backup Creation:
   * Uses safe live SQLite backup API to avoid read lockouts, computes SHA-256 hash.
   */
  public async createBackup(notes?: string): Promise<BackupRecord> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${this.businessId}_${timestamp}.sqlite`;
    const backupFilePath = path.join(this.backupDir, backupFileName);
    const checksumFilePath = path.join(this.backupDir, `${backupFileName}.sha256`);

    // Run online safe backup
    await this.db.backup(backupFilePath);

    // Compute cryptographic SHA-256 checksum
    const fileBuffer = fs.readFileSync(backupFilePath);
    const sha256Checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const fileSizeBytes = fileBuffer.length;

    // Write checksum file alongside backup
    fs.writeFileSync(checksumFilePath, `${sha256Checksum}  ${backupFileName}\n`, 'utf-8');

    const backupId = `bkp_${Date.now()}`;
    const createdAt = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO backups_metadata (id, file_name, file_path, file_size_bytes, sha256_checksum, created_at, verified, notes)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(backupId, backupFileName, backupFilePath, fileSizeBytes, sha256Checksum, createdAt, notes || 'Local automated snapshot');

    return {
      id: backupId,
      fileName: backupFileName,
      filePath: backupFilePath,
      fileSizeBytes,
      sha256Checksum,
      createdAt,
      verified: true,
      notes,
    };
  }

  /**
   * Local Backup Integrity Verification:
   * 1. Verifies SHA-256 checksum against file content.
   * 2. Opens isolated read-only SQLite handle on the backup and executes PRAGMA integrity_check.
   */
  public verifyBackup(fileName: string): { isValid: boolean; checksumMatch: boolean; integrityCheck: string; error?: string } {
    const backupFilePath = path.join(this.backupDir, path.basename(fileName));
    if (!fs.existsSync(backupFilePath)) {
      return { isValid: false, checksumMatch: false, integrityCheck: 'missing', error: 'Backup file does not exist on disk' };
    }

    try {
      // 1. Check SHA-256
      const fileBuffer = fs.readFileSync(backupFilePath);
      const computedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const checksumFilePath = `${backupFilePath}.sha256`;
      let storedHash = '';
      if (fs.existsSync(checksumFilePath)) {
        storedHash = fs.readFileSync(checksumFilePath, 'utf-8').trim().split(/\s+/)[0];
      } else {
        const row = this.db.prepare('SELECT sha256_checksum FROM backups_metadata WHERE file_name = ?').get(path.basename(fileName)) as any;
        storedHash = row?.sha256_checksum || '';
      }

      const checksumMatch = storedHash ? computedHash === storedHash : true;

      // 2. Check SQLite structural integrity
      const testDb = new Database(backupFilePath, { readonly: true });
      const checkRes = testDb.pragma('integrity_check') as [{ integrity_check: string }];
      testDb.close();

      const integrityCheck = checkRes?.[0]?.integrity_check || 'unknown';
      const isValid = checksumMatch && integrityCheck === 'ok';

      return {
        isValid,
        checksumMatch,
        integrityCheck,
      };
    } catch (err: any) {
      return {
        isValid: false,
        checksumMatch: false,
        integrityCheck: 'failed',
        error: err.message,
      };
    }
  }

  /**
   * Local Restore Functionality:
   * Verifies backup integrity, creates pre-restore safety snapshot, and restores target snapshot.
   */
  public async restoreFromBackup(fileName: string): Promise<{ success: boolean; safetyBackupFile: string; message: string }> {
    const safeFileName = path.basename(fileName);
    const backupFilePath = path.join(this.backupDir, safeFileName);

    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file '${safeFileName}' not found`);
    }

    // 1. Verify target backup integrity BEFORE touching current database
    const verification = this.verifyBackup(safeFileName);
    if (!verification.isValid) {
      throw new Error(`Cannot restore: Backup failed integrity verification (${verification.integrityCheck})`);
    }

    // 2. Create safety rollback backup of current state
    const safetyTimestamp = Date.now();
    const safetyFileName = `safety_rollback_before_restore_${safetyTimestamp}.sqlite`;
    const safetyFilePath = path.join(this.backupDir, safetyFileName);
    await this.db.backup(safetyFilePath);

    // 3. Close active database handle
    this.db.close();

    // 4. Overwrite main database with the verified backup
    fs.copyFileSync(backupFilePath, this.databasePath);

    // Clean any lingering WAL / SHM files to ensure fresh reload
    const walFile = `${this.databasePath}-wal`;
    const shmFile = `${this.databasePath}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    // 5. Re-open database & run recovery checks
    this.initDatabase();

    return {
      success: true,
      safetyBackupFile: safetyFileName,
      message: `Database successfully restored from '${safeFileName}'. Safety rollback created as '${safetyFileName}'.`,
    };
  }

  /**
   * List all local backups with status and checksum
   */
  public listBackups(): BackupRecord[] {
    const rows = this.db.prepare('SELECT * FROM backups_metadata ORDER BY created_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      fileName: r.file_name,
      filePath: r.file_path,
      fileSizeBytes: r.file_size_bytes,
      sha256Checksum: r.sha256_checksum,
      createdAt: r.created_at,
      verified: r.verified === 1,
      notes: r.notes,
    }));
  }

  public close() {
    this.db.close();
  }
}
