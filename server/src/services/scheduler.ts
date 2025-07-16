import db from '../db/database';
import { startStreamById, stopStreamById, getRunningStreams } from './streamService';

const CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

/**
 * Fetches all scheduled streams from the database.
 */
const getScheduledStreams = () => {
  try {
    const streams = db.prepare(`
      SELECT * FROM streams WHERE is_scheduled = 1
    `).all();
    return streams;
  } catch (error: any) {
    console.error('[Scheduler] Error fetching scheduled streams:', error.message);
    return [];
  }
};

/**
 * Checks all scheduled streams and starts or stops them if necessary.
 */
const checkSchedules = async () => {
  console.log('[Scheduler] Checking for scheduled streams...');
  const scheduledStreams = getScheduledStreams();
  const runningStreams = getRunningStreams();
  const now = new Date();

  for (const stream of scheduledStreams) {
    const isRunning = !!runningStreams[stream.id];

    // --- Check for start time ---
    if (stream.scheduled_start_time) {
      const startTime = new Date(stream.scheduled_start_time);
      // Start if it's time and it's not already running
      if (now >= startTime && !isRunning) {
        console.log(`[Scheduler] Starting stream ${stream.id} as per schedule.`);
        try {
          await startStreamById(stream.id);
        } catch (error: any) {
          console.error(`[Scheduler] Failed to auto-start stream ${stream.id}:`, error.message);
        }
      }
    }

    // --- Check for end time ---
    if (stream.scheduled_end_time) {
      const endTime = new Date(stream.scheduled_end_time);
      // Stop if it's past the end time and it is running
      if (now >= endTime && isRunning) {
        console.log(`[Scheduler] Stopping stream ${stream.id} as per schedule.`);
        try {
          stopStreamById(stream.id);
        } catch (error: any) {
          console.error(`[Scheduler] Failed to auto-stop stream ${stream.id}:`, error.message);
        }
      }
    }
  }
};

/**
 * Initializes the scheduler to run at a set interval.
 */
export const startScheduler = () => {
  console.log('[Scheduler] Automated stream scheduler has been initialized.');
  console.log(`[Scheduler] Checking schedules every ${CHECK_INTERVAL_MS / 1000} seconds.`);
  
  // Run the check immediately on start, then set the interval
  checkSchedules();
  setInterval(checkSchedules, CHECK_INTERVAL_MS);
};
