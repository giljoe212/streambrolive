import { Router } from 'express';
import { uploadVideo, getVideos, deleteVideo } from '../controllers/videoController';
import { uploadVideo as uploadMiddleware } from '../middleware/upload';

const router = Router();

// Upload video baru
router.post('/', uploadMiddleware, uploadVideo);

// Dapatkan daftar video berdasarkan user ID
router.get('/user/:userId', getVideos);

// Hapus video berdasarkan ID
router.delete('/:id', deleteVideo);

export default router;
