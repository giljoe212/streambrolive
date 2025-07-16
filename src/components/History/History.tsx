import React, { useState } from 'react';
import { PageHeader } from '../Layout/PageHeader';
import { useStream } from '../../contexts/StreamContext';
import { 
  CheckCircle, 
  XCircle,
  Clock,
  Play,
  Download,
  Eye,
  Filter,
  Activity
} from 'lucide-react';
import { StreamHistory } from '../../types';

export const History: React.FC = () => {
  const { history: streamHistory } = useStream();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7days');

  const filteredHistory = streamHistory.filter((history: StreamHistory) => {
    const statusMatch = filterStatus === 'all' || history.status === filterStatus;
    const platformMatch = filterPlatform === 'all' || history.platform.toLowerCase().includes(filterPlatform.toLowerCase());
    
    // Date filtering
    const historyDate = new Date(history.startTime);
    const now = new Date();
    let dateMatch = true;
    
    if (dateRange === '7days') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateMatch = historyDate >= weekAgo;
    } else if (dateRange === '30days') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateMatch = historyDate >= monthAgo;
    }
    
    return statusMatch && platformMatch && dateMatch;
  });



  const getStatusIcon = (status: StreamHistory['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'stopped': return <Clock className="w-5 h-5 text-yellow-400" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: StreamHistory['status']) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'failed': return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'stopped': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };


  // Calculate statistics
  const totalStreams = filteredHistory.length;
  const completedStreams = filteredHistory.filter((h: StreamHistory) => h.status === 'completed').length;
  const failedStreamsCount = filteredHistory.filter((h: StreamHistory) => h.status === 'failed').length;
  const totalDuration = filteredHistory.reduce((sum: number, h: StreamHistory) => sum + (h.duration || 0), 0);

  const stats = [
    {
      title: 'Total Streams',
      value: totalStreams,
      icon: Play,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      title: 'Failed Streams',
      value: failedStreamsCount,
      icon: XCircle,
      color: 'from-red-500 to-pink-600'
    },
    {
      title: 'Completed',
      value: completedStreams,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-600'
    },
{
      title: 'Total Duration',
      value: formatDuration(totalDuration),
      icon: Clock,
      color: 'from-orange-500 to-red-600'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Riwayat Streaming" 
        description="Analisis dan lihat kembali stream Anda sebelumnya."
      >
        <button className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-900 transition-all duration-200 flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>Export Report</span>
        </button>
      </PageHeader>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-gray-900 rounded-xl p-4 border border-gray-800 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs">{stat.title}</p>
                  <p className="text-xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
            >
              <option value="all">All Platforms</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
              <option value="twitch">Twitch</option>
              <option value="custom">Custom RTMP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Recent Streams</h3>
        </div>
        
        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No stream history found</h3>
            <p className="text-gray-400">Start streaming to see your history here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredHistory.map((history) => (
              <div key={history.id} className="p-6 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(history.status)}
                    <div>
                      <h4 className="text-white font-semibold">{history.streamTitle}</h4>
                      <p className="text-gray-400 text-sm">{history.platform}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(history.status)}`}>
                    {history.status.charAt(0).toUpperCase() + history.status.slice(1)}
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Start Time:</span>
                    <p className="text-white">{formatDateTime(history.startTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Duration:</span>
                    <p className="text-white">{formatDuration(history.duration)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Videos Played:</span>
                    <p className="text-white">{history.videosPlayed.length} videos</p>
                  </div>
                  {history.viewerCount && (
                    <div>
                      <span className="text-gray-400">Peak Viewers:</span>
                      <p className="text-white flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {history.viewerCount}
                      </p>
                    </div>
                  )}
                </div>
                
                {history.errorMessage && (
                  <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{history.errorMessage}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};