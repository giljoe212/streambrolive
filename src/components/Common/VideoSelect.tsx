import React, { useState, useRef, useEffect } from 'react';
import { Video } from '../../types';
import { ChevronDown, Check } from 'lucide-react';
import { API_URL } from '../../apiConfig';

interface VideoSelectProps {
  videos: Video[];
  selectedVideos: string[];
  onSelect: (videoIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const VideoSelect: React.FC<VideoSelectProps> = ({
  videos,
  selectedVideos,
  onSelect,
  placeholder = 'Select videos...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleVideo = (videoId: string | number) => {
    const videoIdStr = String(videoId);
    const newSelection = selectedVideos.includes(videoIdStr)
      ? selectedVideos.filter(id => id !== videoIdStr)
      : [...selectedVideos, videoIdStr];
    onSelect(newSelection);
  };

  const getSelectedVideoNames = () => {
    if (selectedVideos.length === 0) return placeholder;
    if (selectedVideos.length === 1) {
      const video = videos.find(v => String(v.id) === selectedVideos[0]);
      return video ? video.title : '1 video selected';
    }
    return `${selectedVideos.length} videos selected`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`flex items-center justify-between w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-colors ${isOpen ? 'ring-2 ring-indigo-500 border-transparent' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`truncate ${selectedVideos.length === 0 ? 'text-gray-400' : 'text-white'}`}>
          {getSelectedVideoNames()}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-80 overflow-auto">
          {videos.length === 0 ? (
            <div className="px-4 py-3 text-gray-400 text-sm">No videos available</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center p-3 hover:bg-gray-700/50 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVideo(String(video.id));
                  }}
                >
                  <div className="relative flex-shrink-0 w-12 h-12 bg-gray-700 rounded overflow-hidden">
                    <img
                      src={video.thumbnail ? `${API_URL}/${video.thumbnail}` : 'https://placehold.co/80x45/2d3748/9ca3af?text=No+Thumb'}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/80x45/2d3748/9ca3af?text=No+Thumb';
                      }}
                    />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{video.title}</p>
                    <p className="text-xs text-gray-400">
                      {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')} • {video.format ? video.format.toUpperCase() : 'N/A'}
                    </p>
                  </div>
                  {selectedVideos.includes(String(video.id)) && (
                    <div className="ml-2 text-indigo-400">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
