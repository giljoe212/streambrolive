const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simpan data user di memory (untuk development saja)
const users = [];

// Register endpoint
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validasi input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email, dan password harus diisi' 
      });
    }

    // Cek apakah email sudah terdaftar
    if (users.some(user => user.email === email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email sudah terdaftar' 
      });
    }

    // Buat user baru
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password, // Dalam produksi, password harus di-hash
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    
    // Hapus password sebelum mengirim response
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat registrasi'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
