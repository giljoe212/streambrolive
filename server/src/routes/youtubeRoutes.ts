import { Router } from 'express';
import {
  getAuthUrl,
  handleAuthCallback,
  createLiveStream
} from '../controllers/youtubeController';

const router = Router();

// Rute untuk mendapatkan URL otentikasi Google
router.get('/auth', getAuthUrl);

// Rute untuk menangani callback setelah otentikasi
router.get('/callback', handleAuthCallback);

// Rute untuk membuat siaran langsung baru
router.post('/stream', createLiveStream);

export default router;
