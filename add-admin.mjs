import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('streamcraft.db');

async function createAdminUser() {
  try {
    // Periksa apakah tabel users ada
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).get();

    if (!tableExists) {
      console.log('Membuat tabel users...');
      db.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Buat user admin
    const username = 'admin';
    const email = 'admin@example.com';
    const password = 'admin123';
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    // Cek apakah user sudah ada
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (existingUser) {
      console.log(`User '${username}' sudah ada.`);
      console.log('Silakan login dengan:');
      console.log(`Username: ${username}`);
      console.log(`Password: ${password}`);
    } else {
      // Tambahkan user admin
      db.prepare(
        'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)'
      ).run(id, username, email, passwordHash);

      console.log('User admin berhasil dibuat!');
      console.log('Gunakan kredensial berikut untuk login:');
      console.log(`Username: ${username}`);
      console.log(`Password: ${password}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

createAdminUser();
