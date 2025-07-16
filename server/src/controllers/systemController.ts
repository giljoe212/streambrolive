import { Request, Response } from 'express';
import * as systemService from '../services/systemService';

export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await systemService.getSystemStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get system stats' });
  }
};
