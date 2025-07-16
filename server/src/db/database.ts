// @ts-ignore - Better-sqlite3 memiliki type definitions yang bermasalah
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Type definitions untuk better-sqlite3
type BetterSQLite3Database = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: any[]) => { lastInsertRowid: number | bigint; changes: number };
    get: (...params: any[]) => any;
    all: (...params: any[]) => any[];
  };
  transaction: (fn: (...args: any[]) => any) => (...args: any[]) => any;
};

// Path ke database
// Path ke database, relatif terhadap root folder project
export const dbPath = path.resolve(__dirname, '..', '..', '..', 'streamcraft.db');

// Inisialisasi database dengan type assertion
let db: BetterSQLite3Database;

try {
  db = new Database(dbPath) as unknown as BetterSQLite3Database;
  console.log(`Connected to database at: ${dbPath}`);
} catch (error) {
  console.error('Failed to connect to database:', error);
  console.error('Database path:', dbPath);
  process.exit(1);
}

export function initializeDatabase() {
  if (!db) {
    console.error('Database connection not established');
    return;
  }
  
  try {
  // Skema Migrasi: Tambahkan kolom yang mungkin hilang
  try {
    const columns = db.prepare(`PRAGMA table_info(streams)`).all();
    const columnNames = columns.map((col: any) => col.name);

    if (!columnNames.includes('rtmp_url')) {
      db.exec(`ALTER TABLE streams ADD COLUMN rtmp_url TEXT`);
      console.log('Migrated streams table: added rtmp_url column.');
    }

    if (!columnNames.includes('stream_key')) {
      db.exec(`ALTER TABLE streams ADD COLUMN stream_key TEXT`);
      console.log('Migrated streams table: added stream_key column.');
    }
  } catch (error) {
    // Abaikan error jika tabel streams belum ada, akan dibuat di bawah
    if (!String(error).includes('no such table: streams')) {
      console.error('Database migration error:', error);
    }
  }

  // Skema Migrasi Lanjutan untuk Penjadwalan
  try {
    const columns = db.prepare(`PRAGMA table_info(streams)`).all();
    const columnNames = columns.map((col: any) => col.name);

    if (!columnNames.includes('is_scheduled')) {
      db.exec(`ALTER TABLE streams ADD COLUMN is_scheduled BOOLEAN DEFAULT FALSE`);
      console.log('Migrated streams table: added is_scheduled column.');
    }

    if (!columnNames.includes('scheduled_start_time')) {
      db.exec(`ALTER TABLE streams ADD COLUMN scheduled_start_time TEXT`);
      console.log('Migrated streams table: added scheduled_start_time column.');
    }

    if (!columnNames.includes('scheduled_end_time')) {
      db.exec(`ALTER TABLE streams ADD COLUMN scheduled_end_time TEXT`);
      console.log('Migrated streams table: added scheduled_end_time column.');
    }

  } catch (error) {
    // Abaikan jika tabel belum ada
    if (!String(error).includes('no such table: streams')) {
      console.error('Database migration error:', error);
    }
  }

  // Skema Migrasi untuk kolom Type
  try {
    const columns = db.prepare(`PRAGMA table_info(streams)`).all();
    const columnNames = columns.map((col: any) => col.name);

    if (!columnNames.includes('type')) {
      db.exec(`ALTER TABLE streams ADD COLUMN type TEXT DEFAULT 'manual'`);
      console.log('Migrated streams table: added type column.');
    }
  } catch (error) {
    // Abaikan jika tabel belum ada
    if (!String(error).includes('no such table: streams')) {
      console.error('Database migration error:', error);
    }
  }

  // Buat tabel jika belum ada
  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      filesize INTEGER NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      format TEXT NOT NULL,
      thumbnail_path TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS thumbnails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      filepath TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_metadata (
      video_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (video_id, key),
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        defaultRtmpUrl TEXT,
        defaultStreamKey TEXT,
        timezone TEXT DEFAULT 'UTC',
        autoLoop BOOLEAN DEFAULT TRUE,
        theme TEXT DEFAULT 'dark',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      rtmp_url TEXT,
      stream_key TEXT,
      status TEXT NOT NULL DEFAULT 'idle', -- idle, live, error, ended
      type TEXT DEFAULT 'manual', -- manual, scheduled
      loop BOOLEAN DEFAULT FALSE,
      schedule TEXT, -- Legacy JSON object for schedule
      is_scheduled BOOLEAN DEFAULT FALSE,
      scheduled_start_time TEXT, -- UTC ISO 8601 Format
      scheduled_end_time TEXT, -- UTC ISO 8601 Format
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stream_videos (
        stream_id INTEGER NOT NULL,
        video_id INTEGER NOT NULL,
        sort_order INTEGER NOT NULL,
        PRIMARY KEY (stream_id, video_id),
        FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_tokens (
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL, -- e.g., 'youtube', 'twitch'
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expiry_date INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, provider),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  
  // Buat direktori uploads jika belum ada
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, 'videos'), { recursive: true });
    fs.mkdirSync(path.join(uploadsDir, 'thumbnails'), { recursive: true });
  }
  
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error; // Re-throw to be caught by the server
  }
}

export default db;
