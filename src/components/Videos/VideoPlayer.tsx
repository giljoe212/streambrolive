import React from 'react';
import { X } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative bg-gray-900 rounded-lg overflow-hidden w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 text-white bg-gray-800 rounded-full p-1 hover:bg-gray-700 transition-colors z-10"
          aria-label="Close player"
        >
          <X size={24} />
        </button>
        <video 
          src={videoUrl}
          controls
          autoPlay
          className="w-full h-full aspect-video"
        />
      </div>
    </div>
  );
};
