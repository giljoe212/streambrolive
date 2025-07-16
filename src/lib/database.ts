// Browser-compatible database implementation using localStorage
// This replaces better-sqlite3 which is Node.js only

import { Video, Stream, StreamHistory, SystemLog } from '../types';

class StreamCraftDB {
  private storagePrefix = 'streamcraft_';

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage() {
    // Initialize empty arrays if they don't exist
    if (!localStorage.getItem(this.storagePrefix + 'videos')) {
      localStorage.setItem(this.storagePrefix + 'videos', JSON.stringify([]));
    }
    if (!localStorage.getItem(this.storagePrefix + 'streams')) {
      localStorage.setItem(this.storagePrefix + 'streams', JSON.stringify([]));
    }
    if (!localStorage.getItem(this.storagePrefix + 'stream_history')) {
      localStorage.setItem(this.storagePrefix + 'stream_history', JSON.stringify([]));
    }
    if (!localStorage.getItem(this.storagePrefix + 'system_logs')) {
      localStorage.setItem(this.storagePrefix + 'system_logs', JSON.stringify([]));
    }
  }

  private getFromStorage<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(this.storagePrefix + key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading ${key} from storage:`, error);
      return [];
    }
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(this.storagePrefix + key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving ${key} to storage:`, error);
    }
  }

  // Video operations
  insertVideo(video: Omit<Video, 'id' | 'uploadedAt'>): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newVideo: Video = {
      ...video,
      id,
      uploadedAt: new Date().toISOString()
    };

    const videos = this.getFromStorage<Video>('videos');
    videos.push(newVideo);
    this.saveToStorage('videos', videos);
    
    return id;
  }

  getVideosByUserId(userId: string): Video[] {
    const videos = this.getFromStorage<Video>('videos');
    return videos
      .filter(video => video.userId === userId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  deleteVideo(id: string): void {
    const videos = this.getFromStorage<Video>('videos');
    const filteredVideos = videos.filter(video => video.id !== id);
    this.saveToStorage('videos', filteredVideos);
  }

  // Stream operations
  insertStream(stream: Omit<Stream, 'id' | 'createdAt'>): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newStream: Stream = {
      ...stream,
      id,
      createdAt: new Date().toISOString()
    };

    const streams = this.getFromStorage<Stream>('streams');
    streams.push(newStream);
    this.saveToStorage('streams', streams);
    
    return id;
  }

  getStreamsByUserId(userId: string): Stream[] {
    const streams = this.getFromStorage<Stream>('streams');
    return streams
      .filter(stream => stream.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateStream(id: string, updates: Partial<Stream>): void {
    const streams = this.getFromStorage<Stream>('streams');
    const streamIndex = streams.findIndex(stream => stream.id === id);
    
    if (streamIndex !== -1) {
      streams[streamIndex] = { ...streams[streamIndex], ...updates };
      this.saveToStorage('streams', streams);
    }
  }

  deleteStream(id: string): void {
    const streams = this.getFromStorage<Stream>('streams');
    const filteredStreams = streams.filter(stream => stream.id !== id);
    this.saveToStorage('streams', filteredStreams);
  }

  // Stream history operations
  insertStreamHistory(history: Omit<StreamHistory, 'id'>): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newHistory: StreamHistory = {
      ...history,
      id
    };

    const historyData = this.getFromStorage<StreamHistory>('stream_history');
    historyData.push(newHistory);
    this.saveToStorage('stream_history', historyData);
    
    return id;
  }

  getStreamHistory(limit: number = 100): StreamHistory[] {
    const history = this.getFromStorage<StreamHistory>('stream_history');
    return history
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }

  // System logs operations
  insertLog(log: Omit<SystemLog, 'id' | 'timestamp'>): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newLog: SystemLog = {
      ...log,
      id,
      timestamp: new Date().toISOString()
    };

    const logs = this.getFromStorage<SystemLog>('system_logs');
    logs.push(newLog);
    
    // Keep only last 1000 logs to prevent storage bloat
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    this.saveToStorage('system_logs', logs);
    
    return id;
  }

  getSystemLogs(limit: number = 1000): SystemLog[] {
    const logs = this.getFromStorage<SystemLog>('system_logs');
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  clearLogs(): void {
    this.saveToStorage('system_logs', []);
  }

  // Utility methods
  close(): void {
    // No-op for localStorage implementation
  }

  // Get database statistics
  getStats() {
    const videos = this.getFromStorage<Video>('videos');
    const streams = this.getFromStorage<Stream>('streams');
    const history = this.getFromStorage<StreamHistory>('stream_history');
    const logs = this.getFromStorage<SystemLog>('system_logs');
    
    return {
      videos: videos.length,
      streams: streams.length,
      history: history.length,
      logs: logs.length
    };
  }

  // Clear all data (for testing/reset purposes)
  clearAllData(): void {
    localStorage.removeItem(this.storagePrefix + 'videos');
    localStorage.removeItem(this.storagePrefix + 'streams');
    localStorage.removeItem(this.storagePrefix + 'stream_history');
    localStorage.removeItem(this.storagePrefix + 'system_logs');
    this.initializeStorage();
  }
}

// Create singleton instance
export const db = new StreamCraftDB();
export default db;