import { initializeDatabase } from './database';

console.log('Menjalankan migrasi database...');
try {
  initializeDatabase();
  console.log('Migrasi database berhasil!');
  process.exit(0);
} catch (error) {
  console.error('Gagal menjalankan migrasi:', error);
  process.exit(1);
}
