import React, { useState } from 'react';
import { useStream } from '../../contexts/StreamContext';
import { 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  Plus,
  Radio,
  Clock,
  Calendar,
  Video,
  Cpu,
  HardDrive,
  Wifi,
  Activity
} from 'lucide-react';
import { StreamForm } from '../Streams/StreamForm';

export const StreamList: React.FC = () => {
  const { streams, startStream, stopStream, deleteStream, systemStats } = useStream();
  const [showForm, setShowForm] = useState(false);
  const [editingStream, setEditingStream] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-500';
      case 'waiting': return 'bg-yellow-500';
      case 'running': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return 'Live';
      case 'waiting': return 'Scheduled';
      case 'running': return 'Running';
      case 'error': return 'Error';
      default: return 'Ended';
    }
  };

  const formatSchedule = (schedule: any) => {
    if (!schedule.schedules || schedule.schedules.length === 0) {
      return 'No schedules';
    }

    const firstSchedule = schedule.schedules[0];
    const scheduleCount = schedule.schedules.length;
    
    if (schedule.type === 'once') {
      return scheduleCount > 1 
        ? `${schedule.date} - ${scheduleCount} time slots`
        : `${schedule.date} at ${firstSchedule.startTime}`;
    } else if (schedule.type === 'daily') {
      return scheduleCount > 1
        ? `Daily - ${scheduleCount} time slots`
        : `Daily at ${firstSchedule.startTime}`;
    } else {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return scheduleCount > 1
        ? `Weekly - ${scheduleCount} time slots`
        : `Weekly at ${firstSchedule.startTime}`;
    }
  };

  const getPerformanceColor = (value: number, type: 'cpu' | 'memory' | 'network') => {
    if (type === 'network') {
      // Network: Green if > 1 Mbps, Yellow if > 0.5 Mbps, Red if < 0.5 Mbps
      if (value > 1000) return 'text-green-400';
      if (value > 500) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      // CPU/Memory: Green if < 50%, Yellow if < 80%, Red if >= 80%
      if (value < 50) return 'text-green-400';
      if (value < 80) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  const formatNetworkSpeed = (kbps: number) => {
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${kbps.toFixed(0)} Kbps`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Streams</h1>
          <p className="text-gray-400 mt-1">Manage your streaming schedules</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* System Performance Indicators */}
          <div className="flex items-center space-x-4 bg-gray-900 px-4 py-2 rounded-lg border border-gray-800">
            <div className="flex items-center space-x-2">
              <Cpu className={`w-4 h-4 ${getPerformanceColor(systemStats.cpu, 'cpu')}`} />
              <span className="text-white text-sm font-medium">
                {systemStats.cpu.toFixed(1)}%
              </span>
            </div>
            <div className="w-px h-4 bg-gray-700" />
            <div className="flex items-center space-x-2">
              <HardDrive className={`w-4 h-4 ${getPerformanceColor(systemStats.memory, 'memory')}`} />
              <span className="text-white text-sm font-medium">
                {systemStats.memory.toFixed(1)}%
              </span>
            </div>
            <div className="w-px h-4 bg-gray-700" />
            <div className="flex items-center space-x-2">
              <Wifi className={`w-4 h-4 ${getPerformanceColor(systemStats.network.upload, 'network')}`} />
              <span className="text-white text-sm font-medium">
                ↑{formatNetworkSpeed(systemStats.network.upload)}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-900 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Stream</span>
          </button>
        </div>
      </div>

      {/* Detailed Performance Panel for Active Streams */}
      {streams.some(s => s.status === 'live') && (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Live Streaming Performance</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU Usage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className={`w-4 h-4 ${getPerformanceColor(systemStats.cpu, 'cpu')}`} />
                  <span className="text-gray-300 text-sm">CPU Usage</span>
                </div>
                <span className={`text-sm font-medium ${getPerformanceColor(systemStats.cpu, 'cpu')}`}>
                  {systemStats.cpu.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {streams.length === 0 ? (
        <div className="bg-gray-900 rounded-xl p-12 border border-gray-800 text-center">
          <Radio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No streams created yet</h3>
          <p className="text-gray-400 mb-6">Create your first stream to start broadcasting</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-900 transition-all duration-200"
          >
            Create Stream
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {streams.map((stream) => (
            <div key={stream.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-indigo-500/50 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(stream.status)}`} />
                  <div>
                    <h3 className="text-white font-semibold">{stream.title}</h3>
                    <p className="text-gray-400 text-sm">{getStatusText(stream.status)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingStream(stream.id)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteStream(stream.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-4">{stream.description}</p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Videos:</span>
                  <div className="flex items-center space-x-1">
                    <Video className="w-4 h-4 text-gray-400" />
                    <span className="text-white text-sm">{stream.videos.length}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Schedule:</span>
                  <span className="text-white text-sm">{formatSchedule(stream.schedule)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Loop:</span>
                  <span className="text-white text-sm">{stream.loop ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {stream.status === 'live' ? (
                  <button
                    onClick={() => stopStream(stream.id)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startStream(stream.id)}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stream Form Modal */}
      {showForm && (
        <StreamForm
          onClose={() => setShowForm(false)}
          streamId={editingStream}
        />
      )}
    </div>
  );
};