import React from 'react';
import { AnimatedBotIcon } from '@/components/ui/animated-bot-icon';
import { cn } from '@/utils/utils';

interface SkeletonMessageProps {
  /** Optional className to customize the container */
  className?: string;
  /** Whether to use full width for the animation bars */
  fullWidth?: boolean;
}

/**
 * Skeleton component for loading state chat message
 * Menampilkan animasi loading saat AI sedang memproses respons
 */
export const SkeletonMessage: React.FC<SkeletonMessageProps> = ({ 
  className, 
  fullWidth = false 
}) => (
  <div className={cn("flex items-start space-x-3", className)}>
    <AnimatedBotIcon className="w-5 h-5 flex-shrink-0 mt-1" />
    <div className="flex-1 space-y-2 py-1 w-full">
      <p className="text-xs text-gray-500 italic mb-1">Sedang menyusun hasil...</p>
      <div className="space-y-2 animate-pulse w-full">
        <div className={`h-4 bg-gray-300 rounded ${fullWidth ? 'w-full' : 'w-3/4'}`}></div>
        <div className={`h-4 bg-gray-300 rounded ${fullWidth ? 'w-11/12' : 'w-1/2'}`}></div>
        <div className={`h-4 bg-gray-300 rounded ${fullWidth ? 'w-full' : 'w-5/6'}`}></div>
      </div>
    </div>
  </div>
);