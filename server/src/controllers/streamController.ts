import { Request, Response } from 'express';
import db from '../db/database';
import {
  startStreamById,
  stopStreamById,
  getStreamDetails,
  getRunningStreams,
  createStream as createStreamService,
  updateStream as updateStreamService,
} from '../services/streamService';

// This local helper is for parsing the legacy `schedule` JSON object from the database.
// It ensures that existing data can still be displayed correctly on the frontend.
const parseLegacySchedule = (stream: any) => {
  if (stream) {
    // Parse schedule if it exists and is a string
    if (stream.schedule && typeof stream.schedule === 'string') {
      try {
        stream.schedule = JSON.parse(stream.schedule);
        // Ensure schedule has required fields
        if (!stream.schedule.type) {
          stream.schedule.type = 'manual';
        }
        if (!stream.schedule.schedules) {
          stream.schedule.schedules = [];
        }
        if (!stream.schedule.date && stream.scheduled_start_time) {
          stream.schedule.date = new Date(stream.scheduled_start_time).toISOString().split('T')[0];
        }
      } catch (e) {
        console.error(`Error parsing schedule for stream ${stream.id}:`, e);
        // Create default schedule with preserved schedule data
        stream.schedule = {
          type: stream.type === 'scheduled' ? 'daily' : 'manual',
          schedules: [],
          date: stream.scheduled_start_time ? new Date(stream.scheduled_start_time).toISOString().split('T')[0] : ''
        };
      }
    }
    // If there's scheduled_start_time but no schedule, create a default schedule
    else if (stream.scheduled_start_time && !stream.schedule) {
      stream.schedule = {
        type: 'once',
        schedules: [{
          startTime: new Date(stream.scheduled_start_time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
          duration: 60, // Default duration
          id: `default_${Date.now()}`
        }],
        date: new Date(stream.scheduled_start_time).toISOString().split('T')[0]
      };
    }

    // Convert boolean fields
    const booleanFields = ['loop', 'is_scheduled'];
    booleanFields.forEach(field => {
      if (stream[field] !== undefined) {
        stream[field] = Boolean(stream[field]);
      }
    });

    // Convert time fields
    const timeFields = ['scheduled_start_time', 'scheduled_end_time'];
    timeFields.forEach(field => {
      if (stream[field]) {
        const date = new Date(stream[field]);
        if (!isNaN(date.getTime())) {
          stream[field] = date.toISOString();
        }
      }
    });
  }
  return stream;
};

// --- CRUD (Create, Read, Update, Delete) --- //

export const createStream = async (req: Request, res: Response) => {
  try {
    // The userId should ideally come from an authenticated session.
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    const newStream = await createStreamService(req.body, userId);
    res.status(201).json({ success: true, data: newStream });
  } catch (error: any) {
    console.error('Error creating stream:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getStreamsByUser = (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const streams = db.prepare('SELECT * FROM streams WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    
    // Enrich each stream with full details and filter out any nulls from corrupted/deleted streams
    const detailedStreams = streams
      .map(s => getStreamDetails(s.id))
      .filter(Boolean); // 'Boolean' as a function filters out falsy values (null, undefined)

    res.json({ success: true, data: detailedStreams });
  } catch (error: any) {
    console.error('Error getting streams:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateStream = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedStream = await updateStreamService(id, req.body);
    res.json({ success: true, data: updatedStream });
  } catch (error: any) {
    console.error('Error updating stream:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteStream = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    stopStreamById(id); // Ensure the stream is stopped before deleting
    db.prepare('DELETE FROM stream_videos WHERE stream_id = ?').run(id); // Cascade delete
    db.prepare('DELETE FROM streams WHERE id = ?').run(id);
    res.json({ success: true, message: 'Stream deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// --- Stream Control --- //

export const startStream = async (req: Request, res: Response) => {
  const { streamId } = req.params;
  try {
    await startStreamById(streamId);
    res.status(200).json({ success: true, message: `Stream ${streamId} started successfully.` });
  } catch (error: any) {
    console.error(`Controller error starting stream ${streamId}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const stopStream = (req: Request, res: Response) => {
  const { streamId } = req.params;
  try {
    const stopped = stopStreamById(streamId);
    if (stopped) {
      res.status(200).json({ success: true, message: `Stop request for stream ${streamId} has been sent.` });
    } else {
      res.status(404).json({ success: false, error: 'Stream not found or is not running.' });
    }
  } catch (error: any) {
    console.error(`Controller error stopping stream ${streamId}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to stop stream.' });
  }
};

export const getStreamStatus = (req: Request, res: Response) => {
  try {
    const runningStreamIds = Object.keys(getRunningStreams());
    res.json({ success: true, data: runningStreamIds });
  } catch (error: any) {
    console.error('Error getting stream status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
