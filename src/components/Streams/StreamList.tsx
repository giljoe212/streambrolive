import React, { useState, useEffect } from 'react';
import { PageHeader } from '../Layout/PageHeader';
import { useStream } from '../../contexts/StreamContext';
import { 
  Play, 
  Pause, 
  Trash2,
  Youtube,
  Plus,
  Cpu,
  HardDrive,
  Wifi,
  Database,
  Radio,
  Edit as Edit3,
  Clock
} from 'lucide-react';
import { StreamForm } from './StreamForm';
import { VideoPlayer } from '../Videos/VideoPlayer';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const formatDuration = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
};

export const StreamList: React.FC = () => {
  const { 
    streams = [], 
    startStream = async (id: string | number) => {
      console.log('Starting stream:', id);
      return { success: true };
    }, 
    stopStream = async (id: string | number) => {
      console.log('Stopping stream:', id);
    }, 
    deleteStream = async (id: string | number) => {
      if (window.confirm('Apakah Anda yakin ingin menghapus stream ini?')) {
        console.log('Deleting stream:', id);
      }
    },
    systemStats = { cpu: 0, memory: 0, network: { upload: 0, download: 0 }, storage: 0, activeStreams: 0 }
  } = useStream();






  const getFirstVideo = (videos: any[]): any | null => {
    if (!videos || videos.length === 0) return null;
    return videos[0]; // The server now sends the full video object
  };



  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStreamId, setEditingStreamId] = useState<string | number | null>(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [isYouTubeConnected, setIsYouTubeConnected] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      setIsYouTubeConnected(true);
      alert('Akun YouTube berhasil terhubung!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('auth') === 'error') {
      alert('Gagal menghubungkan akun YouTube.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // TODO: Check connection status from API for persistence
  }, []);

  const handleConnectYouTube = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`http://localhost:3001/api/youtube/auth?userId=${user.id}`);
      if (res.data.success) window.location.href = res.data.url;
    } catch (error) {
      console.error('Gagal memulai otentikasi YouTube:', error);
      alert('Gagal menghubungkan ke YouTube.');
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      idle: { text: 'Siap', color: 'bg-blue-500/20 text-blue-400' },
      running: { text: 'Live', color: 'bg-green-500/20 text-green-400' },
      streaming: { text: 'Live', color: 'bg-green-500/20 text-green-400' },
      live: { text: 'Live', color: 'bg-green-500/20 text-green-400' },
      completed: { text: 'Selesai', color: 'bg-gray-500/20 text-gray-400' },
      ended: { text: 'Selesai', color: 'bg-gray-500/20 text-gray-400' },
      error: { text: 'Error', color: 'bg-red-500/20 text-red-400' }
    };
    
    const statusInfo = statusMap[status?.toLowerCase()] || { text: status, color: 'bg-gray-500/20 text-gray-400' };
    return {
      text: statusInfo.text,
      className: `capitalize text-sm font-bold px-3 py-1 rounded-full ${statusInfo.color}`,
    };
  };

  const calculateTotalDuration = (videos: any[]): number => {
    if (!videos || videos.length === 0) return 0;
    return videos.reduce((acc, video) => acc + (video?.duration || 0), 0);
  };

  const getPerformanceColor = (value: number) => {
    if (value < 50) return 'text-green-400';
    if (value < 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatNetworkSpeed = (kbps: number) => {
    if (kbps < 1000) return `${kbps.toFixed(1)} Kbps`;
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  };



  // Interface untuk props ScheduleSlots
  interface ScheduleSlotsProps {
    schedule: {
      type?: string;
      schedules?: Array<{
        id?: string;
        startTime: string;
        duration: number;
        weekdays?: number[];
      }>;
      date?: string;
    };
  }

  // Komponen untuk menampilkan slot jadwal
  const ScheduleSlots: React.FC<ScheduleSlotsProps> = ({ schedule }) => {
    if (!schedule || !schedule.schedules || schedule.schedules.length === 0) {
      return null;
    }

    const formatTime = (timeStr: string) => {
      // This function now only formats time strings like "HH:mm"
      // and does not depend on a full Date object, avoiding the 1970 bug.
      return timeStr;
    };

    const getWeekdayName = (day: number) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][day];

    const calculateEndTime = (startTime: string, duration: number): string => {
      if (!startTime) return '';
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const totalStartMinutes = (startHours * 60) + startMinutes;
      const totalEndMinutes = totalStartMinutes + (duration || 0);
      const endHours = Math.floor(totalEndMinutes / 60) % 24;
      const endMinutes = totalEndMinutes % 60;
      return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    };

    return (
      <div className="space-y-2 mt-2">
        {schedule.schedules.map((slot, index) => (
          <div key={index} className="flex items-center text-sm text-gray-400 bg-gray-800/50 p-2 rounded-md">
            <Clock className="w-4 h-4 mr-2 text-gray-500" />
            <span className="font-mono">
              {formatTime(slot.startTime)} - {calculateEndTime(slot.startTime, slot.duration)} ({slot.duration} min)
            </span>
            {schedule.type === 'weekly' && slot.weekdays && (
              <div className="flex items-center ml-auto space-x-1">
                {slot.weekdays.sort().map(day => (
                  <span key={day} className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">
                    {getWeekdayName(day)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const getScheduleSummary = (stream: any) => {
    if (!stream.is_scheduled || !stream.schedule || stream.schedule.type === 'manual') {
      return 'Manual Start';
    }

    const { type, schedules, date } = stream.schedule;

    if (!schedules || schedules.length === 0) {
      return <span className="capitalize">{type}: Jadwal Kosong</span>;
    }

    // Helper to convert HH:mm to minutes from midnight
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    };

    // Sort slots by start time
    const sortedSlots = [...schedules].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const firstSlot = sortedSlots[0];
    const lastSlot = sortedSlots[sortedSlots.length - 1];

    const totalDuration = sortedSlots.reduce((acc, slot) => acc + (Number(slot.duration) || 0), 0);

    const startTime = firstSlot.startTime;
    const endMinutes = timeToMinutes(lastSlot.startTime) + (Number(lastSlot.duration) || 0);
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

    let summary = `${startTime} - ${endTime} (${totalDuration} min)`;

    if (type === 'once') {
      const dateStr = date ? new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
      return <span>{typeLabel}: <span className="font-semibold">{dateStr}, {summary}</span></span>;
    } else if (type === 'weekly') {
        const days = firstSlot.weekdays?.map((d: number) => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d]).join(', ') || '';
        return <span>{typeLabel} ({days}): <span className="font-semibold">{summary}</span></span>;
    }

    return <span>{typeLabel}: <span className="font-semibold">{summary}</span></span>;
  };

  // Kategorikan stream berdasarkan status
  const liveStreams = streams.filter(s => s.status === 'live' || s.status === 'streaming' || s.status === 'running');

  const scheduledStreams = streams.filter(s => 
    s.is_scheduled && !liveStreams.some(ls => ls.id === s.id)
  );

  const otherStreams = streams.filter(s => 
    !liveStreams.some(ls => ls.id === s.id) && 
    !scheduledStreams.some(ss => ss.id === s.id)
  );

  const renderStreamList = (streamList: any[], title: string) => {
    if (streamList.length === 0) return null;

    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <div className="space-y-4">
          {streamList.map((stream: any) => {
            const firstVideo = getFirstVideo(stream.videos);

            const statusInfo = getStatusText(stream.status);
            const totalDuration = calculateTotalDuration(stream.videos);

            return (
              <div key={stream.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex flex-col md:flex-row md:items-center md:space-x-6 hover:border-indigo-500/50 transition-all duration-200">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-full md:w-auto mb-4 md:mb-0">
                  <button 
                    onClick={() => {
                      if (firstVideo && firstVideo.filepath) {
                        setPlayingVideoUrl(`http://localhost:3001/${firstVideo.filepath.replace(/\\/g, '/')}`)
                      }
                    }}
                    className="w-full h-full block group"
                    disabled={!firstVideo || !firstVideo.filepath}
                  >
                    {firstVideo && firstVideo.thumbnail ? (
                      <img 
                        src={`http://localhost:3001/${firstVideo.thumbnail}`}
                        alt={stream.title} 
                        className="w-full md:w-40 h-auto md:h-24 object-cover rounded-lg aspect-video bg-gray-700 group-hover:ring-2 ring-red-500 transition-all"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/160x90/2d3748/9ca3af?text=Thumb+Error'; }}
                      />
                    ) : (
                      <div className="w-full md:w-40 h-24 flex items-center justify-center bg-gray-800 rounded-lg aspect-video group-hover:ring-2 ring-red-500 transition-all">
                        <Radio className="w-10 h-10 text-gray-600" />
                      </div>
                    )}
                    {firstVideo && firstVideo.filepath && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40 rounded-lg">
                        <div className="bg-black bg-opacity-50 rounded-full p-2">
                          <Play className="w-5 h-5 text-white" fill="currentColor" />
                        </div>
                      </div>
                    )}
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    {formatDuration(totalDuration)}
                  </div>
                </div>

                {/* Details Wrapper */}
                <div className="flex-grow min-w-0 w-full flex flex-col md:flex-row md:items-center md:space-x-6"> 
                  {/* Info */}
                  <div className="flex-grow min-w-0">
                  <h3 className="font-bold text-white text-lg truncate">{stream.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{getScheduleSummary(stream)}</p>
                  {stream.schedule && <ScheduleSlots schedule={stream.schedule} />}
                  </div>

                  {/* Status & Actions Wrapper */}
                  <div className="w-full md:w-auto flex items-center justify-between mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-800 md:border-none md:space-x-6">
                    {/* Status */}
                    <div className="flex-shrink-0 md:w-28 text-left md:text-center">
                      <span className={statusInfo.className}>{statusInfo.text}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                  {stream.status === 'live' || stream.status === 'streaming' || stream.status === 'running' ? (
                    <button 
                      onClick={() => stopStream(stream.id)} 
                      className="bg-red-600/20 text-red-400 p-2 rounded-lg font-semibold hover:bg-red-600/40 transition-all flex items-center justify-center"
                      title="Stop Stream"
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => startStream(stream.id)} 
                      className="bg-green-600/20 text-green-400 p-2 rounded-lg font-semibold hover:bg-green-600/40 transition-all flex items-center justify-center"
                      title="Start Stream"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => { setEditingStreamId(stream.id); setIsFormOpen(true); }} 
                    className="bg-gray-700/50 text-gray-300 p-2 rounded-lg hover:bg-gray-700 transition-all"
                    title="Edit Stream"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                      <button 
                        onClick={() => deleteStream(stream.id)} 
                        className="bg-gray-700/50 text-gray-300 p-2 rounded-lg hover:bg-gray-700 transition-all"
                        title="Hapus Stream"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-4xl border border-gray-800 overflow-hidden">
             <StreamForm onClose={() => { setIsFormOpen(false); setEditingStreamId(null); }} streamId={editingStreamId} />
          </div>
        </div>
      )}

      <PageHeader title="Streams" description="Kelola stream terjadwal dan yang sedang berjalan">
        <div className="flex items-center space-x-4">
          <button onClick={handleConnectYouTube} className="bg-red-600 text-white p-3 md:px-6 md:py-3 rounded-lg font-semibold hover:bg-red-700 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isYouTubeConnected}>
            <Youtube className="w-5 h-5" />
            <span className="hidden md:inline">{isYouTubeConnected ? 'Terhubung' : 'Hubungkan YouTube'}</span>
          </button>
          <button onClick={() => { setEditingStreamId(null); setIsFormOpen(true); }} className="bg-gradient-to-r from-red-600 to-red-800 text-white p-3 md:px-4 md:py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-900 transition-all flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span className="md:hidden">Stream</span>
            <span className="hidden md:inline">Stream Baru</span>
          </button>
        </div>
      </PageHeader>

      <div className="w-full bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-700">
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center space-x-2"><Cpu className={`w-5 h-5 ${getPerformanceColor(systemStats.cpu)}`} /><div className="text-center"><p className="text-xs text-gray-400">CPU</p><p className="text-white font-medium">{systemStats.cpu.toFixed(1)}%</p></div></div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="flex items-center space-x-2"><HardDrive className={`w-5 h-5 ${getPerformanceColor(systemStats.memory)}`} /><div className="text-center"><p className="text-xs text-gray-400">Memory</p><p className="text-white font-medium">{systemStats.memory.toFixed(1)}%</p></div></div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="flex items-center space-x-2"><Wifi className={`w-5 h-5 text-green-400`} /><div className="text-center"><p className="text-xs text-gray-400">Upload</p><p className="text-white font-medium">↑{formatNetworkSpeed(systemStats.network.upload)}</p></div></div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="flex items-center space-x-2"><Database className={`w-5 h-5 ${getPerformanceColor(systemStats.disk?.usagePercent ?? 0)}`} /><div className="text-center"><p className="text-xs text-gray-400">Storage</p><p className="text-white font-medium">{systemStats.disk?.usagePercent ?? 0}%</p></div></div>
        </div>
      </div>

      {streams.length > 0 ? (
        <div className="space-y-8">
          {renderStreamList(liveStreams, 'Live & Sedang Berjalan')}
          {renderStreamList(scheduledStreams, 'Dijadwalkan')}
          {renderStreamList(otherStreams, 'Stream Manual & Selesai')}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"><Radio className="w-10 h-10 text-gray-600" /></div>
            <h3 className="text-xl font-semibold text-white">Belum Ada Stream Dibuat</h3>
            <p className="text-gray-400 mt-2 mb-6">Klik tombol di atas untuk membuat stream pertama Anda.</p>

          </div>
        </div>
      )}

      {playingVideoUrl && <VideoPlayer videoUrl={playingVideoUrl} onClose={() => setPlayingVideoUrl(null)} />}
    </div>
  );
};