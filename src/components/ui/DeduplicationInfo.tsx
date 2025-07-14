// ================================
// DEDUPLICATION INFO COMPONENT
// ================================
// Component untuk menampilkan informasi deduplication dan statistics

import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  FileX, 
  Copy, 
  HardDrive, 
  Users, 
  TrendingDown,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/utils/utils';

// ================================
// TYPES & INTERFACES
// ================================

export interface DeduplicationStats {
  totalFiles: number;
  uniqueFiles: number;
  referencedFiles: number;
  totalSize: number;
  actualSize: number;
  spaceSaved: number;
  spaceSavedPercent: number;
}

export interface DuplicateDetection {
  isDuplicate: boolean;
  originalFilename?: string;
  originalOwner?: string;
  spaceSaved?: number;
  referenceCreated?: boolean;
}

export interface DeduplicationInfoProps {
  // Statistics display
  stats?: DeduplicationStats;
  showStats?: boolean;
  
  // Duplicate detection display
  duplicateDetection?: DuplicateDetection;
  showDuplicateInfo?: boolean;
  
  // Progress indicators
  isProcessing?: boolean;
  currentStep?: 'hashing' | 'checking' | 'creating_reference' | 'completed';
  
  // Configuration
  className?: string;
  compact?: boolean;
}

// ================================
// UTILITY FUNCTIONS
// ================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ================================
// MAIN COMPONENT
// ================================

export const DeduplicationInfo: React.FC<DeduplicationInfoProps> = ({
  stats,
  showStats = false,
  duplicateDetection,
  showDuplicateInfo = false,
  isProcessing = false,
  currentStep,
  className = '',
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show component if any relevant data is available
  const shouldShow = showStats || showDuplicateInfo || isProcessing;

  if (!shouldShow) {
    return null;
  }

  // ================================
  // RENDER PROCESSING STATUS
  // ================================

  const renderProcessingStatus = () => {
    if (!isProcessing || !currentStep) return null;

    const stepConfig = {
      hashing: {
        icon: <FileCheck className="w-4 h-4 animate-pulse" />,
        label: 'Computing file hash...',
        color: 'text-blue-600'
      },
      checking: {
        icon: <Copy className="w-4 h-4 animate-spin" />,
        label: 'Checking for duplicates...',
        color: 'text-blue-600'
      },
      creating_reference: {
        icon: <Users className="w-4 h-4 animate-pulse" />,
        label: 'Creating file reference...',
        color: 'text-green-600'
      },
      completed: {
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Deduplication completed',
        color: 'text-green-600'
      }
    };

    const config = stepConfig[currentStep];

    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className={config.color}>
          {config.icon}
        </div>
        <div className="flex-1">
          <p className={cn("text-sm font-medium", config.color)}>
            {config.label}
          </p>
          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
            <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-1/3"></div>
          </div>
        </div>
      </div>
    );
  };

  // ================================
  // RENDER DUPLICATE DETECTION
  // ================================

  const renderDuplicateDetection = () => {
    if (!showDuplicateInfo || !duplicateDetection) return null;

    const { isDuplicate, originalFilename, spaceSaved, referenceCreated } = duplicateDetection;

    if (!isDuplicate) {
      return (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <FileCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-green-800">File Unique</h4>
            <p className="text-xs text-green-600 mt-1">
              File ini belum pernah diunggah sebelumnya dan akan disimpan di storage.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <Copy className="w-5 h-5 text-orange-600 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-orange-800">
            Duplicate Detected {referenceCreated && <span className="text-green-600">✓</span>}
          </h4>
          <div className="text-xs text-orange-600 space-y-1 mt-1">
            {originalFilename && (
              <p>Original: <span className="font-medium">{originalFilename}</span></p>
            )}
            {spaceSaved && (
              <p>Storage saved: <span className="font-medium text-green-600">{formatFileSize(spaceSaved)}</span></p>
            )}
            {referenceCreated ? (
              <p className="text-green-600 font-medium">✓ File reference created successfully</p>
            ) : (
              <p>Creating file reference to avoid duplicate storage...</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ================================
  // RENDER STATISTICS
  // ================================

  const renderStatistics = () => {
    if (!showStats || !stats) return null;

    const { totalFiles, uniqueFiles, referencedFiles, spaceSaved, spaceSavedPercent } = stats;

    if (compact) {
      return (
        <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-gray-500" />
            <span className="text-gray-600">
              {formatFileSize(spaceSaved)} saved ({formatPercent(spaceSavedPercent)})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <FileCheck className="w-3 h-3 text-green-500" />
            <span className="text-gray-600">{uniqueFiles} unique</span>
          </div>
          <div className="flex items-center gap-1">
            <Copy className="w-3 h-3 text-orange-500" />
            <span className="text-gray-600">{referencedFiles} refs</span>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-600" />
            Deduplication Statistics
          </h4>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            {isExpanded ? 'Less' : 'More'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Files:</span>
            <span className="font-medium text-gray-800">{totalFiles}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Space Saved:</span>
            <span className="font-medium text-green-600">{formatFileSize(spaceSaved)}</span>
          </div>
          
          {isExpanded && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Unique Files:</span>
                <span className="font-medium text-gray-800">{uniqueFiles}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">References:</span>
                <span className="font-medium text-orange-600">{referencedFiles}</span>
              </div>
              <div className="flex items-center justify-between col-span-2">
                <span className="text-gray-600">Storage Efficiency:</span>
                <span className="font-medium text-green-600">{formatPercent(spaceSavedPercent)}</span>
              </div>
            </>
          )}
        </div>

        {spaceSavedPercent > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Storage Efficiency</span>
              <span>{formatPercent(spaceSavedPercent)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(spaceSavedPercent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // ================================
  // MAIN RENDER
  // ================================

  return (
    <div className={cn("space-y-3", className)}>
      {renderProcessingStatus()}
      {renderDuplicateDetection()}
      {renderStatistics()}
    </div>
  );
};

// ================================
// EXPORTS
// ================================

export default DeduplicationInfo; 