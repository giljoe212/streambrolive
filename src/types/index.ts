export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  settings: UserSettings;
}

export interface UserSettings {
  defaultRtmpUrl: string;
  defaultStreamKey: string;
  timezone: string;
  autoLoop: boolean;
  theme: 'dark' | 'light';
  notifications: boolean;
  autoStart: boolean;
  maxConcurrentStreams: number;
}

export interface Video {
  id: string;
  userId: string;
  title: string;
  filename: string;
  filepath: string;
  filesize: number;
  originalName: string;
  duration: number;
  size: number;
  format: string;
  thumbnail: string;
  uploadedAt: string;
  path: string;
  views: number;
  description?: string;
  channel: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
}

export interface ScheduleSlot {
  id: string;
  startTime: string;
  duration: number;
  weekdays?: number[];
}

export interface Stream {
  id: string;
  userId: string;
  title: string;
  description: string;
  rtmpUrl: string;
  streamKey: string;
  videos: string[];
  loop: boolean;
  status: 'idle' | 'streaming' | 'error' | 'scheduled' | 'waiting' | 'live' | 'running' | 'ended' | 'completed';
  createdAt: string;
  lastRun?: string;
  nextRun?: string;

  // Kolom baru untuk penjadwalan UTC sederhana
  is_scheduled: boolean;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;

  // Struktur lama untuk mendukung UI yang ada
  schedule: {
    type: 'manual' | 'once' | 'daily' | 'weekly';
    schedules: ScheduleSlot[];
    date: string;
  };
  type: 'manual' | 'scheduled'; // Tipe lama, bisa jadi usang
}

export interface StreamSchedule {
  type: 'manual' | 'once' | 'daily' | 'weekly';
  schedules: ScheduleSlot[]; // Multiple time slots
  date?: string; // YYYY-MM-DD for 'once' type
}

export interface ScheduleSlot {
  id: string;
  startTime: string; // HH:MM format
  duration: number; // minutes
  weekdays?: number[]; // 0-6 for 'weekly' type, undefined for daily/once
  endTime?: string; // Calculated field HH:MM
}

export interface SystemStats {
  cpu: number;
  memory: number;
  network: {
    upload: number;
    download: number;
  };
  disk: {
    total: string;
    used: string;
    free: string;
    usagePercent: number;
    drive: string;
  };
  activeStreams: number;
}

export interface StreamHistory {
  id: string;
  streamId: string;
  streamTitle: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  status: 'completed' | 'failed' | 'stopped';
  platform: string; // YouTube, Facebook, etc
  videosPlayed: string[];
  errorMessage?: string;
  viewerCount?: number;
  bitrate?: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'stream' | 'system' | 'ffmpeg' | 'upload' | 'schedule';
  message: string;
  details?: string;
  streamId?: string;
}