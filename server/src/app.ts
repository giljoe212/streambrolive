import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/database';
import { startScheduler } from './services/scheduler';
import videoRoutes from './routes/videoRoutes';
import streamRoutes from './routes/streamRoutes';
import systemRoutes from './routes/systemRoutes';
import youtubeRoutes from './routes/youtubeRoutes';
import authRoutes from './routes/authRoutes';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/auth', authRoutes);

// Rute diagnostik
app.get('/test', (req, res) => {
  res.send('Server test route is working!');
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Initialize database and start server
try {
  console.log('Initializing database...');
  initializeDatabase();
  
  // Start the automated stream scheduler
  console.log('Starting scheduler...');
  startScheduler();

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });

} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

export default app;
