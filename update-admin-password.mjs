#!/usr/bin/env node
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';

// Mendapatkan path ke database
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'streamcraft.db');

// Membuat interface untuk readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi untuk meminta input password secara aman
function promptPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.openStdin();
    process.stdin.on('data', (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.pause();
          break;
        default:
          process.stdout.clearLine();
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(question + Array(rl.line.length + 1).join('*'));
          break;
      }
    });
    
    rl.question(question, (value) => {
      resolve(value);
    });
  });
}

async function main() {
  console.log('=== Admin Password Updater ===');
  console.log(`Database: ${dbPath}`);
  console.log('');

  try {
    // Buka koneksi ke database
    const db = new Database(dbPath);
    
    // Dapatkan daftar admin
    const admins = db.prepare('SELECT id, username, email FROM users').all();
    
    if (admins.length === 0) {
      console.log('Tidak ada user admin yang ditemukan.');
      process.exit(1);
    }
    
    console.log('Daftar Admin:');
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.username} (${admin.email})`);
    });
    
    // Pilih admin yang akan diupdate
    const selectedIndex = await new Promise((resolve) => {
      rl.question('\nPilih nomor admin yang ingin diubah password-nya: ', (answer) => {
        const num = parseInt(answer) - 1;
        if (isNaN(num) || num < 0 || num >= admins.length) {
          console.log('Pilihan tidak valid. Menggunakan admin pertama.');
          resolve(0);
        } else {
          resolve(num);
        }
      });
    });
    
    const selectedAdmin = admins[selectedIndex];
    
    // Minta password baru
    const newPassword = await promptPassword(`\nMasukkan password baru untuk ${selectedAdmin.username}: `);
    
    if (!newPassword) {
      console.log('\nError: Password tidak boleh kosong');
      process.exit(1);
    }
    
    // Konfirmasi password
    const confirmPassword = await promptPassword('Konfirmasi password baru: ');
    
    if (newPassword !== confirmPassword) {
      console.log('\nError: Password tidak cocok');
      process.exit(1);
    }
    
    // Hash password baru
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password di database
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    const result = stmt.run(newPasswordHash, selectedAdmin.id);
    
    if (result.changes > 0) {
      console.log('\n\x1b[32m%s\x1b[0m', 'Password berhasil diubah!');
      console.log(`Username: ${selectedAdmin.username}`);
      console.log(`Email: ${selectedAdmin.email}`);
    } else {
      console.log('\n\x1b[31m%s\x1b[0m', 'Gagal mengubah password. User tidak ditemukan.');
    }
    
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', 'Terjadi kesalahan:');
    console.error(error);
    console.log('\nPastikan file database ada di lokasi yang benar dan bisa diakses.');
    console.log(`Lokasi database yang dicari: ${dbPath}`);
  } finally {
    rl.close();
  }
}

// Jalankan program
main().catch(console.error);
