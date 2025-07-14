import { useState, useEffect } from 'react';
import { UserFile, UserFileManagementService } from '@/services/userFileManagementService';

// ================================
// TYPES & INTERFACES
// ================================

export interface CloudFileFilter {
  category?: string;
  folder_path?: string;
  tags?: string[];
  query?: string;
  file_type?: string;
}

export interface CloudFileManagerOptions {
  autoLoad?: boolean;
  pageSize?: number;
  filter?: CloudFileFilter;
}

export interface CloudFileManagerState {
  files: UserFile[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  totalFiles: number;
}

// ================================
// HOOK IMPLEMENTATION
// ================================

export const useCloudFileManager = (
  userId: string | null,
  options: CloudFileManagerOptions = {}
) => {
  const {
    autoLoad = true,
    pageSize = 20,
    filter = {}
  } = options;

  const [state, setState] = useState<CloudFileManagerState>({
    files: [],
    isLoading: false,
    error: null,
    hasMore: true,
    currentPage: 0,
    totalFiles: 0
  });

  const fileManagementService = new UserFileManagementService();

  // Load files from cloud storage
  const loadFiles = async (reset = false) => {
    if (!userId) {
      setState(prev => ({
        ...prev,
        error: 'User ID is required',
        isLoading: false
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      const searchOptions = {
        limit: pageSize,
        offset: reset ? 0 : state.currentPage * pageSize,
        ...filter
      };

      const result = await fileManagementService.getUserFiles(userId, searchOptions);

      if (result.success && result.files) {
        setState(prev => ({
          ...prev,
          files: reset ? result.files! : [...prev.files, ...result.files!],
          isLoading: false,
          hasMore: result.files!.length === pageSize,
          currentPage: reset ? 1 : prev.currentPage + 1,
          totalFiles: result.total || result.files!.length,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to load files',
          hasMore: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        hasMore: false
      }));
    }
  };

  // Refresh files (reset and reload)
  const refreshFiles = () => {
    setState(prev => ({
      ...prev,
      files: [],
      currentPage: 0,
      hasMore: true,
      totalFiles: 0
    }));
    loadFiles(true);
  };

  // Load more files (pagination)
  const loadMoreFiles = () => {
    if (!state.isLoading && state.hasMore) {
      loadFiles(false);
    }
  };

  // Search files
  const searchFiles = async (query: string) => {
    const searchFilter = {
      ...filter,
      query: query.trim()
    };

    setState(prev => ({
      ...prev,
      files: [],
      currentPage: 0,
      hasMore: true,
      totalFiles: 0
    }));

    try {
      const searchOptions = {
        limit: pageSize,
        offset: 0,
        ...searchFilter
      };

      const result = await fileManagementService.getUserFiles(userId!, searchOptions);

      if (result.success && result.files) {
        setState(prev => ({
          ...prev,
          files: result.files!,
          isLoading: false,
          hasMore: result.files!.length === pageSize,
          currentPage: 1,
          totalFiles: result.total || result.files!.length,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Search failed',
          hasMore: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search error occurred',
        hasMore: false
      }));
    }
  };

  // Filter files by category
  const filterByCategory = (category: string) => {
    const newFilter = { ...filter, category };
    setState(prev => ({
      ...prev,
      files: [],
      currentPage: 0,
      hasMore: true,
      totalFiles: 0
    }));
    
    // Update filter and reload
    loadFiles(true);
  };

  // Delete file
  const deleteFile = async (fileId: string) => {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const result = await fileManagementService.deleteFile(fileId, userId);
      
      if (result.success) {
        // Remove file from local state
        setState(prev => ({
          ...prev,
          files: prev.files.filter(file => file.id !== fileId),
          totalFiles: prev.totalFiles - 1
        }));
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  };

  // Download file
  const downloadFile = async (fileId: string, filename: string) => {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
      const result = await fileManagementService.generateDownloadUrl(fileId, userId);
      
      if (result.success && result.downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return { success: true };
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  };

  // Get file categories
  const getFileCategories = () => {
    const categories = new Set(state.files.map(file => file.category));
    return Array.from(categories);
  };

  // Get file statistics
  const getFileStats = () => {
    const stats = {
      totalFiles: state.totalFiles,
      totalSize: state.files.reduce((sum, file) => sum + file.file_size, 0),
      categories: getFileCategories(),
      recentFiles: state.files
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    };
    
    return stats;
  };

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && userId) {
      loadFiles(true);
    }
  }, [userId, autoLoad]);

  // Return hook interface
  return {
    // State
    ...state,
    
    // Actions
    loadFiles: () => loadFiles(true),
    refreshFiles,
    loadMoreFiles,
    searchFiles,
    filterByCategory,
    deleteFile,
    downloadFile,
    
    // Utilities
    getFileCategories,
    getFileStats
  };
};

export default useCloudFileManager; 