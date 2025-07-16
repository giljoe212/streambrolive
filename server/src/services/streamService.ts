import db from '../db/database';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

// Object to store running ffmpeg processes
const runningStreams: { [key: string]: ChildProcess } = {};

// Function to get the number of active streams
export const getActiveStreamsCount = () => {
  return Object.keys(runningStreams).length;
};

// Helper function to get full stream details from the database
export const getStreamDetails = (streamId: number | string) => {
  const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(streamId);

  if (!stream) {
    console.warn(`Stream with ID ${streamId} not found.`);
    return null; // Return null if stream doesn't exist
  }

  // Proceed with enriching the stream object only if it exists
  if (stream) {
    // Get videos
    const videoRows = db.prepare(`
      SELECT v.id, v.filepath, v.filename, v.title, v.duration, v.thumbnail_path
      FROM videos v
      JOIN stream_videos sv ON v.id = sv.video_id
      WHERE sv.stream_id = ?
      ORDER BY sv.sort_order ASC
    `).all(streamId);

    // Make file paths relative and URL-friendly, similar to videoController
    stream.videos = videoRows.map((video: any) => {
      return {
        ...video,
        // Construct path directly from filename, which is more reliable
        path: video.filename ? `uploads/videos/${video.filename}` : null,
        filepath: video.filename ? `uploads/videos/${video.filename}` : null,
        // thumbnail_path is already in the correct format 'uploads/thumbnails/thumb.jpg'
        thumbnail: video.thumbnail_path,
      };
    });

    // Calculate total duration
    stream.total_duration = stream.videos.reduce((acc: number, video: any) => acc + (video.duration || 0), 0);

    // Get schedule data and ensure it's parsed properly
    if (stream.schedule) {
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
        console.error(`Error parsing schedule for stream ${streamId}:`, e);
        // Create default schedule with preserved schedule data
        stream.schedule = {
          type: stream.type === 'scheduled' ? 'daily' : 'manual',
          schedules: [],
          date: stream.scheduled_start_time ? new Date(stream.scheduled_start_time).toISOString().split('T')[0] : ''
        };
      }
    } else if (stream.scheduled_start_time) {
      // If there's scheduled_start_time but no schedule, create a default schedule
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

// Function to start a stream by its ID
export const startStreamById = async (streamId: number | string) => {
  if (runningStreams[streamId]) {
    console.log(`Stream ${streamId} is already running.`);
    throw new Error('Stream is already running.');
  }

  const stream = getStreamDetails(streamId);
  if (!stream) {
    throw new Error('Stream not found.');
  }

  if (!stream.videos || stream.videos.length === 0) {
    throw new Error('There are no videos in this stream.');
  }

  if (!stream.rtmp_url || !stream.stream_key) {
    throw new Error('RTMP URL or Stream Key is missing for this stream.');
  }
  const rtmpUrl = `${stream.rtmp_url}/${stream.stream_key}`;

  const fileList = stream.videos.map((v: any) => `file '${path.resolve(process.cwd(), v.filepath)}'`).join('\n');
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  const listFilePath = path.join(tempDir, `${streamId}_playlist.txt`);
  fs.writeFileSync(listFilePath, fileList);

  const ffmpegArgs = ['-re'];
  if (stream.loop) {
    ffmpegArgs.push('-stream_loop', '-1');
  }

  ffmpegArgs.push(
    '-f', 'concat',
    '-safe', '0',
    '-i', listFilePath,
    '-c', 'copy',
    '-f', 'flv',
    rtmpUrl
  );

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
  runningStreams[streamId] = ffmpegProcess;

  // Add a flag to track if the stream was manually stopped
  let manuallyStopped = false;
  (ffmpegProcess as any).manuallyStopped = () => {
    manuallyStopped = true;
  };

  db.prepare(`UPDATE streams SET status = 'live', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(streamId);
  console.log(`Starting stream ${streamId}...`);

  ffmpegProcess.stderr.on('data', (data) => {
    console.log(`[FFMPEG Stream ${streamId}]: ${data}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`Stream ${streamId} process exited with code ${code}`);
    if (manuallyStopped) {
      // If stopped by user, set to idle and unschedule it to prevent scheduler restart.
      db.prepare(`UPDATE streams SET status = 'idle', is_scheduled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(streamId);
      console.log(`Stream ${streamId} was manually stopped and has been unscheduled.`);
    } else {
      // If it ended on its own (e.g., end of playlist).
      // For non-looping streams, we should also unschedule them so they don't run again.
      const shouldUnschedule = !stream.loop;
      if (shouldUnschedule) {
        db.prepare(`UPDATE streams SET status = 'ended', is_scheduled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(streamId);
        console.log(`Non-looping stream ${streamId} ended and has been unscheduled.`);
      } else {
        db.prepare(`UPDATE streams SET status = 'ended', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(streamId);
        console.log(`Looping stream ${streamId} ended. It remains scheduled.`);
      }
    }
    delete runningStreams[streamId];
    if (fs.existsSync(listFilePath)) {
        fs.unlinkSync(listFilePath); // Clean up playlist file
    }
  });

  ffmpegProcess.on('error', (err) => {
    console.error(`Error starting stream ${streamId}:`, err);
    db.prepare(`UPDATE streams SET status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(streamId);
    delete runningStreams[streamId];
  });

  return ffmpegProcess;
};

// Function to stop a stream by its ID
export const stopStreamById = (streamId: number | string) => {
  const process = runningStreams[streamId];
  if (process) {
    console.log(`Stopping stream ${streamId}...`);
    // Set the flag before killing the process
    if ((process as any).manuallyStopped) {
      (process as any).manuallyStopped();
    }
    process.kill('SIGINT'); // Gracefully stop ffmpeg
    return true;
  } else {
    console.log(`Stream ${streamId} is not running, ensuring status is correct.`);
    // If a stream is not in the running list, ensure its status is not 'live' or 'streaming'
    const stream = db.prepare('SELECT status FROM streams WHERE id = ?').get(streamId);
    if (stream && (stream.status === 'live' || stream.status === 'streaming')) {
        db.prepare(`UPDATE streams SET status = 'idle', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(streamId);
    }
    return false;
  }
};

// Function to get the list of running streams
export const getRunningStreams = () => {
  return runningStreams;
};

// Helper function to get video details and calculate total duration
const getVideoData = (videoIds: string[]) => {
  if (!videoIds || videoIds.length === 0) {
    return { totalDuration: 0, thumbnail: null };
  }

  const videoDetails = db.prepare(`SELECT id, duration, thumbnail_path as thumbnail FROM videos WHERE id IN (${videoIds.map(() => '?').join(',')})`).all(...videoIds);
  
  const videoMap = new Map(videoDetails.map(v => [v.id, v]));

  let totalDuration = 0;
  for (const id of videoIds) {
    totalDuration += videoMap.get(id)?.duration || 0;
  }

  const firstVideoId = videoIds[0];
  const thumbnail = videoMap.get(firstVideoId)?.thumbnail || null;

  return { totalDuration, thumbnail };
};


export const createStream = (streamData: any, userId: string) => {
  const {
    title, description, platform, videos, loop, schedule, 
    is_scheduled, type, status, scheduled_start_time, scheduled_end_time
  } = streamData;

  let rtmpUrl = streamData.rtmpUrl || '';
  let streamKey = streamData.streamKey || '';

  // If platform is provided, fetch credentials from the database
  if (platform) {
    const creds = db.prepare('SELECT rtmp_url, stream_key FROM youtube_credentials WHERE user_id = ?').get(userId);
    if (creds) {
      rtmpUrl = creds.rtmp_url;
      streamKey = creds.stream_key;
    }
  }

  const { thumbnail } = getVideoData(videos || []);

  const result = db.prepare(`
    INSERT INTO streams (user_id, title, description, rtmp_url, stream_key, loop, schedule, is_scheduled, type, status, scheduled_start_time, scheduled_end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId, title, description, rtmpUrl, streamKey, 
    loop ? 1 : 0, 
    JSON.stringify(schedule), 
    is_scheduled ? 1 : 0, 
    type, status, 
    scheduled_start_time, scheduled_end_time
  );

  const streamId = result.lastInsertRowid;

  if (videos && videos.length > 0) {
    const stmt = db.prepare('INSERT INTO stream_videos (stream_id, video_id, sort_order) VALUES (?, ?, ?)');
    videos.forEach((videoId: string, index: number) => {
      stmt.run(streamId, videoId, index);
    });
  }

  return getStreamDetails(Number(streamId));
};

export const updateStream = (streamId: string, streamData: any) => {
  const { title, description, rtmpUrl, streamKey, videos, loop, schedule, is_scheduled, type, status, scheduled_start_time, scheduled_end_time } = streamData;

  const { thumbnail } = getVideoData(videos);

  const updateStmt = db.prepare(`
    UPDATE streams 
    SET title = ?, description = ?, rtmp_url = ?, loop = ?, schedule = ?, is_scheduled = ?, type = ?, status = ?, scheduled_start_time = ?, scheduled_end_time = ? 
    WHERE id = ?
  `);
  updateStmt.run(title, description, rtmpUrl, loop ? 1 : 0, JSON.stringify(schedule), is_scheduled ? 1 : 0, type, status, scheduled_start_time, scheduled_end_time, streamId);

  if (streamKey) {
    db.prepare('UPDATE streams SET stream_key = ? WHERE id = ?').run(streamKey, streamId);
  }

  // Clear existing video associations
  db.prepare('DELETE FROM stream_videos WHERE stream_id = ?').run(streamId);

  // Add new video associations
  if (videos && videos.length > 0) {
    const stmt = db.prepare('INSERT INTO stream_videos (stream_id, video_id, sort_order) VALUES (?, ?, ?)');
    videos.forEach((videoId: string, index: number) => {
      stmt.run(streamId, videoId, index);
    });
  }

  return getStreamDetails(streamId);
};
