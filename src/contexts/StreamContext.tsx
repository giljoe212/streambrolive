import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { API_URL } from '../apiConfig';
import { Video, Stream, StreamHistory, SystemStats } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface StreamContextType {
  isLoading: boolean;
  // State
  streams: Stream[];
  videos: Video[];
  history: StreamHistory[];
  systemStats: SystemStats;
  
  // Stream operations
  createStream: (stream: Omit<Stream, 'id' | 'createdAt' | 'lastRun' | 'nextRun' | 'status' | 'userId'>) => Promise<void>;
  updateStream: (id: string | number, updates: Partial<Stream>) => Promise<void>;
  deleteStream: (id: string | number) => Promise<void>;
  startStream: (id: string | number) => Promise<{ success: boolean; data?: any; error?: string }>;
  stopStream: (id: string | number) => Promise<void>;
  
  // Video operations
  deleteVideo: (id: string) => Promise<void>;
  
  // Utility
  refreshData: () => void;
  fetchVideos: () => Promise<void>;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

interface StreamProviderProps {
  children: ReactNode;
}

export const StreamProvider = ({ children }: StreamProviderProps) => {
  const { user } = useAuth();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [history] = useState<StreamHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    cpu: 0,
    memory: 0,
    network: { upload: 0, download: 0 },
    disk: { total: '0 GB', used: '0 GB', free: '0 GB', usagePercent: 0, drive: 'N/A' },
    activeStreams: 0
  });

  const fetchStreams = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get<ApiResponse<Stream[]>>(`${API_URL}/api/streams/user/${user.id}`);
      if (response.data.success) {
        setStreams(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
      setStreams([]);
    }
  }, [user]);

  const fetchVideos = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get<ApiResponse<Video[]>>(`${API_URL}/api/videos/user/${user.id}`);
      if (response.data.success) {
        setVideos(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideos([]);
    }
  }, [user]);

  const fetchHistory = useCallback(async () => {
    // Placeholder for history fetching
  }, []);

  const refreshData = useCallback(() => {
    fetchStreams();
    fetchVideos();
    fetchHistory();
  }, [fetchStreams, fetchVideos, fetchHistory]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      refreshData();
      // A small delay to allow data to be fetched before turning off loading
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    } else {
      // Clear data on logout to prevent stale data flashing
      setStreams([]);
      setVideos([]);
      setIsLoading(false);
    }
  }, [user, refreshData]);

  const fetchSystemStats = useCallback(async () => {
    try {
      const response = await axios.get<ApiResponse<SystemStats>>(`${API_URL}/api/system/stats`);
      if (response.data.success) {
        setSystemStats((prevStats: SystemStats) => ({
          ...prevStats,
          ...response.data.data,
        }));
      }
    } catch (error) {
      // console.error('Error fetching system stats:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        fetchStreams();
        fetchSystemStats();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [user, fetchStreams, fetchSystemStats]);

  const createStream = useCallback(async (streamData: Omit<Stream, 'id' | 'createdAt' | 'lastRun' | 'nextRun' | 'status' | 'userId'>) => {
    if (!user?.id) return;
    try {
      await axios.post<ApiResponse<Stream>>(`${API_URL}/api/streams`, { ...streamData, userId: user.id });
      refreshData();
    } catch (error) {
      console.error('Error creating stream:', error);
    }
  }, [user, refreshData]);

  const updateStream = useCallback(async (id: string | number, updates: Partial<Stream>) => {
    try {
      await axios.put<ApiResponse<Stream>>(`${API_URL}/api/streams/${id}`, updates);
      refreshData();
    } catch (error) {
      console.error(`Error updating stream ${id}:`, error);
    }
  }, [refreshData]);

  const deleteStream = useCallback(async (id: string | number) => {
    try {
      await axios.delete<ApiResponse<{}>>(`${API_URL}/api/streams/${id}`);
      refreshData();
    } catch (error) {
      console.error(`Error deleting stream ${id}:`, error);
    }
  }, [refreshData]);

  const startStream = useCallback(async (id: string | number): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const response = await axios.post<ApiResponse<any>>(`${API_URL}/api/streams/${id}/start`);
      console.log('Start stream response:', response.data);
      await refreshData();
      return response.data;
    } catch (err: any) {
      console.error('Error starting stream:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to start stream';
      return { success: false, error: errorMessage };
    }
  }, [refreshData]);

  const stopStream = useCallback(async (id: string | number) => {
    try {
      await axios.post<ApiResponse<{}>>(`${API_URL}/api/streams/${id}/stop`);
      refreshData();
    } catch (err: any) {
      console.error('Error stopping stream:', err);
    }
  }, [refreshData]);

  const deleteVideo = useCallback(async (id: string) => {
    try {
      await axios.delete<ApiResponse<{}>>(`${API_URL}/api/videos/${id}`);
      refreshData();
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  }, [refreshData]);

  const value: StreamContextType = {
    isLoading,
    streams,
    videos,
    history,
    systemStats,
    createStream,
    updateStream,
    deleteStream,
    startStream,
    stopStream,
    deleteVideo,
    refreshData,
    fetchVideos
  };

  return (
    <StreamContext.Provider value={value}>
      {children}
    </StreamContext.Provider>
  );
};

export const useStream = () => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error('useStream must be used within a StreamProvider');
  }
  return context;
};