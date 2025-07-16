import { Router } from 'express';
import * as systemController from '../controllers/systemController';

const router = Router();

router.get('/stats', systemController.getStats);

export default router;
