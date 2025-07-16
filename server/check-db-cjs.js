const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const db = new Database('streamcraft.db');

async function checkAndCreateAdmin() {
  try {
    // Cek apakah tabel users ada
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).get();

    if (!tableExists) {
      console.log('Tabel users tidak ditemukan. Membuat tabel...');
      db.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Tabel users berhasil dibuat.');
    }

    // Cek apakah user admin sudah ada
    const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    
    if (adminUser) {
      console.log('\nUser admin sudah ada:');
      console.log(`Username: ${adminUser.username}`);
      console.log(`Email: ${adminUser.email}`);
      console.log('Silakan login dengan username: admin dan password yang telah Anda buat sebelumnya.');
      return;
    }

    // Buat user admin baru
    const username = 'admin';
    const email = 'admin@example.com';
    const password = 'admin123';
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(
      'INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)'
    ).run(id, username, email, passwordHash);

    console.log('\nUser admin berhasil dibuat!');
    console.log('Gunakan kredensial berikut untuk login:');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('\nHarap ganti password default ini setelah login pertama kali!');

  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  } finally {
    db.close();
  }
}

checkAndCreateAdmin();
