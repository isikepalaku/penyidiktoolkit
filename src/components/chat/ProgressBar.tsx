import React from 'react';
import { ProgressInfo } from '@/types/chat';

interface ProgressBarProps {
  percent?: number;
  status?: ProgressInfo['status'];
}

/**
 * Progress bar component untuk file processing
 * Menampilkan progress upload dan processing file dengan status yang berbeda
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  percent = 0, 
  status = 'uploading' 
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'preparing':
        return 'Mempersiapkan...';
      case 'uploading':
        return 'Mengunggah file...';
      case 'processing':
        return 'Memproses dokumen...';
      case 'completed':
        return 'Selesai!';
      default:
        return 'Memproses...';
    }
  };

  const getColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'uploading':
        return 'bg-amber-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="w-full mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
        <span className="text-sm font-medium text-gray-700">{percent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${getColor()} transition-all duration-500 ease-in-out`} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}; 