import { create } from 'zustand';
import { 
  PlaygroundChatMessage, 
  SessionEntry, 
  StreamingStatus,
  PlaygroundStore as PlaygroundStoreInterface 
} from '@/types/playground';

// History management constants
const MAX_MESSAGES_PER_SESSION = 100; // Maksimal 100 pesan per session
const MAX_STORED_SESSIONS = 10; // Maksimal 10 session tersimpan
const MESSAGE_CLEANUP_THRESHOLD = 80; // Mulai cleanup saat mencapai 80 pesan
const SESSION_EXPIRY_DAYS = 7; // Session kadaluarsa setelah 7 hari
const STORAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB limit untuk localStorage

export const usePlaygroundStore = create<PlaygroundStoreInterface>()((set, get) => ({
  messages: [],
  isStreaming: false,
  streamingErrorMessage: null,
  sessionId: null,
  sessionsData: null,
  hasStorage: typeof window !== 'undefined' && !!window.localStorage,
  selectedEndpoint: '',
  currentChunk: '',
  streamingStatus: {
    isThinking: false,
    isCallingTool: false,
    isAccessingKnowledge: false,
    isMemoryUpdateStarted: false,
    hasCompleted: false,
    isPaused: false,
    isCancelled: false,
    currentModel: undefined,
    modelProvider: undefined,
    reasoningSteps: undefined,
    isReasoningActive: false,
    currentReasoningStep: undefined,
    citationsCount: undefined,
    hasImages: false,
    hasVideos: false,
    hasAudio: false,
    contentType: undefined,
    errorMessage: undefined,
    cancelReason: undefined,
    processingMetrics: undefined,
  },

  setMessages: (messages) => {
    if (typeof messages === 'function') {
      set((state) => ({ messages: messages(state.messages) }));
    } else {
      set({ messages });
    }
    
    // Auto-cleanup when messages exceed threshold
    const currentMessages = get().messages;
    if (currentMessages.length > MESSAGE_CLEANUP_THRESHOLD) {
      cleanupOldMessages();
    }
  },

  addMessage: (message) => {
    set((state) => {
      const newMessages = [...state.messages, message];
      
      // Auto-limit messages per session
      if (newMessages.length > MAX_MESSAGES_PER_SESSION) {
        const messagesToRemove = newMessages.length - MAX_MESSAGES_PER_SESSION;
        return {
          messages: newMessages.slice(messagesToRemove)
        };
      }
      
      return {
        messages: newMessages
      };
    });
    
    // Save to localStorage with optimization
    optimizedSaveToStorage();
  },

  setIsStreaming: (isStreaming) => {
    set({ isStreaming });
  },

  setStreamingErrorMessage: (message) => {
    set({ streamingErrorMessage: message });
  },

  setSessionId: (sessionId) => {
    set({ sessionId });
    // Save to localStorage if available
    const { hasStorage } = get();
    if (hasStorage && sessionId) {
      try {
        localStorage.setItem('wassidik_session_id', sessionId);
        localStorage.setItem('wassidik_session_created', Date.now().toString());
      } catch (error) {
        console.warn('Failed to save session ID to localStorage:', error);
      }
    }
  },

  setSessionsData: (data) => {
    if (typeof data === 'function') {
      set((state) => ({ sessionsData: data(state.sessionsData) }));
    } else {
      set({ sessionsData: data });
    }
    
    // Save to localStorage with session management
    const { hasStorage } = get();
    if (hasStorage) {
      try {
        const currentData = get().sessionsData;
        if (currentData) {
          const optimizedData = manageStoredSessions(currentData);
          localStorage.setItem('wassidik_sessions', JSON.stringify(optimizedData));
        }
      } catch (error) {
        console.warn('Failed to save sessions to localStorage:', error);
        // If storage is full, try cleanup and retry
        cleanupExpiredSessions();
        try {
          const currentData = get().sessionsData;
          if (currentData) {
            localStorage.setItem('wassidik_sessions', JSON.stringify(currentData));
          }
        } catch (retryError) {
          console.error('Failed to save sessions after cleanup:', retryError);
        }
      }
    }
  },

  setSelectedEndpoint: (endpoint) => {
    set({ selectedEndpoint: endpoint });
  },

  setStreamingStatus: (status) => {
    set((state) => ({
      streamingStatus: { ...state.streamingStatus, ...status }
    }));
  },

  resetStreamingStatus: () => {
    set({
      streamingStatus: {
        isThinking: false,
        isCallingTool: false,
        isAccessingKnowledge: false,
        isMemoryUpdateStarted: false,
        hasCompleted: false,
        isPaused: false,
        isCancelled: false,
        toolName: undefined,
        currentModel: undefined,
        modelProvider: undefined,
        reasoningSteps: undefined,
        isReasoningActive: false,
        currentReasoningStep: undefined,
        citationsCount: undefined,
        hasImages: false,
        hasVideos: false,
        hasAudio: false,
        contentType: undefined,
        errorMessage: undefined,
        cancelReason: undefined,
        processingMetrics: undefined,
        // Reset extra_data fields
        references: undefined,
        addMessages: undefined,
        historyEntries: undefined,
        reasoningMessages: undefined,
        metadata: undefined,
        // Reset citations field
        citations: undefined
      }
    });
  },

  setCurrentChunk: (chunk) => {
    set({ currentChunk: chunk });
  },
}));

// History Management Functions

/**
 * Cleanup old messages when threshold is reached
 */
const cleanupOldMessages = () => {
  const { messages, setMessages } = usePlaygroundStore.getState();
  
  if (messages.length > MESSAGE_CLEANUP_THRESHOLD) {
    // Keep only the most recent messages, maintaining conversation context
    const messagesToKeep = Math.floor(MESSAGE_CLEANUP_THRESHOLD * 0.7); // Keep 70% of threshold
    const recentMessages = messages.slice(-messagesToKeep);
    
    console.log(`🧹 Auto-cleanup: Removed ${messages.length - messagesToKeep} old messages, kept ${messagesToKeep} recent messages`);
    setMessages(recentMessages);
  }
};

/**
 * Manage stored sessions to prevent storage bloat
 */
const manageStoredSessions = (sessions: SessionEntry[]): SessionEntry[] => {
  if (!sessions || sessions.length <= MAX_STORED_SESSIONS) {
    return sessions;
  }
  
  // Sort by last activity and keep only recent sessions
  const sortedSessions = sessions
    .sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
    .slice(0, MAX_STORED_SESSIONS);
  
  console.log(`📝 Session management: Kept ${sortedSessions.length} recent sessions, removed ${sessions.length - sortedSessions.length} old sessions`);
  return sortedSessions;
};

/**
 * Check and cleanup expired sessions
 */
const cleanupExpiredSessions = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  try {
    // Check session creation time
    const sessionCreated = localStorage.getItem('wassidik_session_created');
    if (sessionCreated) {
      const createdTime = parseInt(sessionCreated);
      const now = Date.now();
      const daysSinceCreation = (now - createdTime) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation > SESSION_EXPIRY_DAYS) {
        console.log(`🗑️ Session expired after ${daysSinceCreation.toFixed(1)} days, clearing storage`);
        clearSessionStorage();
        return;
      }
    }
    
    // Cleanup stored sessions
    const stored = localStorage.getItem('wassidik_sessions');
    if (stored) {
      const sessions: SessionEntry[] = JSON.parse(stored);
      const now = Date.now();
      const validSessions = sessions.filter(session => {
        if (!session.lastActivity) return true; // Keep sessions without timestamp
        const daysSinceActivity = (now - session.lastActivity) / (1000 * 60 * 60 * 24);
        return daysSinceActivity <= SESSION_EXPIRY_DAYS;
      });
      
      if (validSessions.length < sessions.length) {
        localStorage.setItem('wassidik_sessions', JSON.stringify(validSessions));
        console.log(`🗑️ Cleaned up ${sessions.length - validSessions.length} expired sessions`);
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup expired sessions:', error);
  }
};

/**
 * Optimized storage save with size monitoring
 */
const optimizedSaveToStorage = () => {
  const { hasStorage, messages, sessionId } = usePlaygroundStore.getState();
  if (!hasStorage || !sessionId) return;
  
  try {
    // Check current storage usage
    const currentUsage = getStorageUsage();
    if (currentUsage > STORAGE_SIZE_LIMIT) {
      console.warn(`⚠️ Storage usage (${formatBytes(currentUsage)}) exceeds limit, performing cleanup`);
      cleanupExpiredSessions();
      cleanupOldMessages();
    }
    
    // Save current session messages (only recent ones for performance)
    const recentMessages = messages.slice(-50); // Save only last 50 messages
    const sessionData = {
      sessionId,
      messages: recentMessages,
      lastActivity: Date.now(),
      messageCount: messages.length
    };
    
    localStorage.setItem(`wassidik_session_${sessionId}`, JSON.stringify(sessionData));
  } catch (error) {
    console.warn('Failed optimized save to storage:', error);
  }
};

/**
 * Get current localStorage usage in bytes
 */
const getStorageUsage = (): number => {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
};

/**
 * Format bytes to human readable format
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper functions for localStorage operations
export const loadSessionFromStorage = (): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  
  try {
    // Check if session is expired first
    cleanupExpiredSessions();
    return localStorage.getItem('wassidik_session_id');
  } catch (error) {
    console.warn('Failed to load session ID from localStorage:', error);
    return null;
  }
};

export const loadSessionsFromStorage = (): SessionEntry[] | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  
  try {
    // Cleanup expired sessions first
    cleanupExpiredSessions();
    
    const stored = localStorage.getItem('wassidik_sessions');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load sessions from localStorage:', error);
    return null;
  }
};

export const clearSessionStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  try {
    // Clear main session data
    localStorage.removeItem('wassidik_session_id');
    localStorage.removeItem('wassidik_sessions');
    localStorage.removeItem('wassidik_session_created');
    
    // Clear individual session data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('wassidik_session_')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('🧹 Cleared all session storage data');
  } catch (error) {
    console.warn('Failed to clear session storage:', error);
  }
};

/**
 * Get storage statistics for monitoring
 */
export const getStorageStats = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { usage: 0, limit: 0, percentage: 0, sessionCount: 0 };
  }
  
  const usage = getStorageUsage();
  const limit = STORAGE_SIZE_LIMIT;
  const percentage = (usage / limit) * 100;
  
  // Count sessions
  const keys = Object.keys(localStorage);
  const sessionCount = keys.filter(key => key.startsWith('wassidik_session_')).length;
  
  return {
    usage: formatBytes(usage),
    limit: formatBytes(limit),
    percentage: Math.round(percentage),
    sessionCount,
    isNearLimit: percentage > 80
  };
};

/**
 * Force cleanup for manual optimization
 */
export const forceCleanup = () => {
  console.log('🧹 Starting manual storage cleanup...');
  // Panggil fungsi pembersihan utama untuk menghapus semua data sesi
  clearSessionStorage();
  
  const stats = getStorageStats();
  console.log('📊 Storage stats after cleanup:', stats);
  return stats;
}; 