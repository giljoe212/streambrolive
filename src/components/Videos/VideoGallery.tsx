import React, { useRef, useState } from 'react';
import { PageHeader } from '../Layout/PageHeader';
import { VideoPlayer } from './VideoPlayer';
import { useAuth } from '../../contexts/AuthContext';
import { useStream } from '../../contexts/StreamContext';
import { 
  Play, 
  Trash2, 
  Edit3, 
  Video,
  Upload,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';



export const VideoGallery: React.FC = () => {
  const { user } = useAuth();
  const { videos, deleteVideo, isLoading, refreshData } = useStream();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  
  // Ambil daftar video dari API
  

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async (videoId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus video ini?')) {
      try {
        await deleteVideo(videoId);
      } catch (error) {
        console.error('Gagal menghapus video:', error);
        alert('Gagal menghapus video. Silakan coba lagi.');
      }
    }
  };

  

  

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingFile(file);
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('description', '');
    formData.append('userId', user.id);

    const toastId = toast.loading('Mengupload video...');
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Upload video
      const response = await axios.post('http://localhost:3001/api/videos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
          
          // Update toast progress
          if (percentCompleted < 100) {
            toast.loading(`Mengupload video... ${percentCompleted}%`, { id: toastId });
          }
        },
      });

      if (response.data.success) {
        // Tampilkan notifikasi sukses
        toast.success('Video berhasil diupload!', { id: toastId });
        
        // Refresh data
        await refreshData();
        
        // Tunggu sebentar untuk memastikan data sudah terupdate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh data sekali lagi untuk memastikan thumbnail sudah digenerate
        await refreshData();
      }
    } catch (error) {
      console.error('Gagal mengupload video:', error);
      toast.error('Gagal mengupload video. Silakan coba lagi.', { id: toastId });
    } finally {
      setIsUploading(false);
      setUploadingFile(null);
      setUploadProgress(0);
      
      // Reset input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    return [h, m, s]
      .map(v => v < 10 ? '0' + v : v)
      .filter((v, i) => v !== '00' || i > 0) // Hapus leading zeros
      .join(':');
  };

  const formatDate = (dateString: string | Date): string => {
    try {
      // Jika dateString adalah string, coba parse ke Date
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Jika tanggal tidak valid, kembalikan string kosong
      if (isNaN(date.getTime())) return '';
      
      // Format: DD/MM/YYYY HH:MM
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/\./g, '/');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return '';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Galeri Video Anda"
        description="Kelola, unggah, dan putar rekaman video Anda."
      >

        <button
          onClick={handleUploadClick}
          disabled={isUploading}
          className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-900 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          <span>{isUploading ? 'Mengupload...' : 'Upload Video'}</span>
        </button>
      </PageHeader>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/*"
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Progress Bar */}
      {isUploading && uploadingFile && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-white truncate">Mengupload: {uploadingFile.name}</p>
            <p className="text-sm text-gray-400">{formatFileSize(uploadingFile.size)}</p>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-red-500 to-red-700 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-right text-sm text-gray-400 mt-1">{uploadProgress}%</p>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-400" />
            <p className="mt-2 text-sm text-gray-400">Memuat video...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Belum ada video</h3>
            <p className="text-gray-400 mb-6">Gunakan tombol "Unggah Video" di atas untuk menambahkan video baru.</p>
          </div>
        ) : (
          videos.filter(v => v && v.id).map((video) => (
            <div key={video.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-indigo-500 transition-all duration-200 group">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-900">
                {video.thumbnail ? (
                  <img 
                    src={`http://localhost:3001/${video.thumbnail}`} 
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/160x90/2d3748/9ca3af?text=No+Thumb'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <Video className="w-12 h-12 text-gray-600 group-hover:text-indigo-500 transition-colors" />
                  </div>
                )}
                
                {/* Duration Badge */}
                {video.duration > 0 && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                )}
                
                {/* Play Button */}
                <button 
                  onClick={() => {
                    if (video.filepath) {
                      setPlayingVideoUrl(`http://localhost:3001/${video.filepath.replace(/\\/g, '/')}`)
                    }
                  }}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40"
                >
                  <div className="bg-black bg-opacity-50 rounded-full p-3">
                    <Play className="w-6 h-6 text-white" fill="currentColor" />
                  </div>
                </button>
              </div>
              
              {/* Video Info */}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{video.title}</h3>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(video.filesize)}
                      {video.uploadedAt && (
                        <span className="ml-1">• {formatDate(video.uploadedAt)}</span>
                      )}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {}}
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(video.id)}
                      className="text-gray-500 hover:text-red-600 transition-colors"
                      title="Hapus"
                      disabled={isUploading}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="mt-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    video.status === 'processed' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                    video.status === 'processing' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' :
                    'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}>
                    {video.status === 'processed' ? 'Siap Diputar' :
                    video.status === 'processing' ? 'Sedang Diproses' :
                    'Menunggu Diproses'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {playingVideoUrl && (
        <VideoPlayer 
          videoUrl={playingVideoUrl} 
          onClose={() => setPlayingVideoUrl(null)} 
        />
      )}
    </div>
  );
};

export default VideoGallery;
