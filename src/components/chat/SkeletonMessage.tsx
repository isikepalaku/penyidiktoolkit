import React from 'react';
import { AnimatedBotIcon } from '@/components/ui/animated-bot-icon';

/**
 * Skeleton component for loading state chat message
 * Menampilkan animasi loading saat AI sedang memproses respons
 */
export const SkeletonMessage: React.FC = () => (
  <div className="flex items-start space-x-3">
    <AnimatedBotIcon className="w-5 h-5 flex-shrink-0 mt-1" />
    <div className="flex-1 space-y-2 py-1">
      <p className="text-xs text-gray-500 italic mb-1">Sedang menyusun hasil...</p>
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        <div className="h-4 bg-gray-300 rounded w-5/6"></div>
      </div>
    </div>
  </div>
); 