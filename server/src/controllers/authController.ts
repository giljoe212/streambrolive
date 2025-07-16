import { Request, Response } from 'express';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const saltRounds = 10;

export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
  }

  try {
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username or email already exists' });
    }

    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = uuidv4();

    db.prepare('INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)')
      .run(id, username, email, passwordHash);

    const newUser = {
      id,
      username,
      email,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({ success: true, message: 'User registered successfully', data: newUser });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = db.prepare(`
      SELECT id, username, email, password_hash, created_at as createdAt 
      FROM users 
      ORDER BY created_at DESC
    `).all();
    
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, newPassword } = req.body;

    // Cek apakah user ada
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    // Update data user
    const updateData: any = { username, email };
    const params: any = [username, email, id];
    
    let query = 'UPDATE users SET username = ?, email = ?';
    
    // Update password jika disediakan
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password_hash = hashedPassword;
      query += ', password_hash = ?';
      params.splice(2, 0, hashedPassword);
    }
    
    query += ' WHERE id = ?';
    
    db.prepare(query).run(...params);
    
    res.status(200).json({ 
      success: true, 
      message: 'Data pengguna berhasil diperbarui',
      data: { id, username, email }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui data pengguna' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Cek apakah user ada
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    // Hapus user
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    
    res.status(200).json({ 
      success: true, 
      message: 'Pengguna berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus pengguna' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, (user as any).password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, id);

    res.status(200).json({ success: true, message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

export const updateUserSettings = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { settings } = req.body;

  if (!settings) {
    return res.status(400).json({ success: false, message: 'Settings data is required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Serialize settings object to JSON string for storage
    const settingsJson = JSON.stringify(settings);

    db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(settingsJson, id);

    // Fetch the updated user to return the latest state
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const { password_hash, ...userWithoutPassword } = updatedUser as any;


    res.status(200).json({ 
      success: true, 
      message: 'Settings updated successfully',
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};

export const login = async (req: Request, res: Response) => {
  console.log('Login attempt received.');
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('Missing username or password');
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  console.log(`Attempting to log in with username: ${username}`);

  try {
    // Validate database connection
    if (!db) {
      console.error('Database connection not available');
      return res.status(500).json({ success: false, message: 'Database connection error' });
    }

    // Get user from database
    let user;
    try {
      user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return res.status(500).json({ success: false, message: 'Error accessing user data' });
    }

    if (!user) {
      console.log(`User not found for username: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    console.log(`User found: ${user.username}`);

    // Compare passwords
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.password_hash);
      console.log(`Password match result for ${username}: ${passwordMatch}`);
    } catch (bcryptError) {
      console.error('Password comparison error:', bcryptError);
      return res.status(500).json({ success: false, message: 'Authentication error' });
    }

    if (!passwordMatch) {
      console.log(`Password mismatch for user: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Exclude password hash from the response
    const { password_hash, ...userWithoutPassword } = user;
    console.log(`Login successful for user: ${username}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Login successful', 
      data: userWithoutPassword 
    });
    
  } catch (error) {
    console.error('Unexpected login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred during login' 
    });
  }
};
