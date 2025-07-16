import { Router } from 'express';
import {
  createStream,
  getStreamsByUser,
  updateStream,
  deleteStream,
  startStream,
  stopStream,
  getStreamStatus
} from '../controllers/streamController';

const router = Router();

// Stream CRUD operations
router.post('/', createStream);
router.get('/user/:userId', getStreamsByUser);
router.put('/:id', updateStream);
router.delete('/:id', deleteStream);

// Stream control endpoints
router.post('/:streamId/start', startStream);
router.post('/:streamId/stop', stopStream);
router.get('/status', getStreamStatus);

export default router;
