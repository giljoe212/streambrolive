import Database from 'better-sqlite3';

const db = new Database('streamcraft.db');

// Cek tabel users
console.log('Tabel yang ada di database:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log(tables);

// Cek isi tabel users jika ada
if (tables.some(t => t.name === 'users')) {
  console.log('\nIsi tabel users:');
  try {
    const users = db.prepare('SELECT * FROM users').all();
    console.log(users);
  } catch (err) {
    console.error('Error saat membaca tabel users:', err.message);
  }
} else {
  console.log('\nTabel users tidak ditemukan');
}

db.close();
