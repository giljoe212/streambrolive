const db = require('./src/db/database').default;

function getAllUsers() {
  try {
    console.log('Fetching all users from the database...');
    const users = db.prepare('SELECT id, username, email, password_hash, created_at FROM users').all();
    console.log('--- Users in Database ---');
    console.table(users);
    console.log('-------------------------');
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    db.close();
  }
}

getAllUsers();
