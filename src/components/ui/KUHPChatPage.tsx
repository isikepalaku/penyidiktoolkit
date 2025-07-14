import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, RefreshCw, Paperclip, File, XIcon, AlertCircle, Database, Trash2 } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import FileUploadModal from './FileUploadModal';

import { formatMessage } from '@/utils/markdownFormatter';
import { RunEvent } from '@/types/playground';
import { usePlaygroundStore } from '@/stores/PlaygroundStore';
import StreamingStatus from '@/hooks/streaming/StreamingStatus';
import CitationDisplay from './CitationDisplay';
import { 
  clearStreamingChatHistory,
  initializeStreamingSession,
  sendStreamingChatMessage
} from '@/services/ahliHukumPidanaService';
import { getStorageStats, forceCleanup } from '@/stores/PlaygroundStore';
import { UserFile } from '@/services/userFileManagementService';

// Imports untuk refactoring - removed legacy imports

// Constants for KUHP
const KUHP_EXAMPLE_QUESTIONS = [
  "Jelaskan tentang delik penggelapan dalam KUHP",
  "Apa hukuman untuk tindak pidana penipuan?",
  "Bagaimana unsur-unsur pidana pada pembunuhan berencana?",
  "Jelaskan perbedaan pencurian ringan dan pencurian biasa"
];

// Supported file types - limited to TXT, PDF, and Images only
const ACCEPTED_FILE_TYPES = ".pdf,.txt,.png,.jpg,.jpeg,.webp";

// File size limit (20MB for Gemini API)
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

// Supported MIME types for validation - limited to TXT, PDF, and Images only
const SUPPORTED_MIME_TYPES = [
  // Document formats
  'application/pdf',
  'text/plain',
  // Image formats
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

interface KUHPChatPageProps {
  onBack?: () => void;
}

interface StorageStats {
  usage: string | number;
  limit: string | number;
  percentage: number;
  sessionCount: number;
  isNearLimit?: boolean;
}

// File validation utilities
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File "${file.name}" terlalu besar (${sizeMB}MB). Maksimal ukuran file adalah 20MB.`
    };
  }

  // Check MIME type
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    // Check by file extension as fallback for mobile compatibility
    const extension = file.name.toLowerCase().split('.').pop();
    const extensionMimeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp'
    };

    if (!extension || !extensionMimeMap[extension]) {
      return {
        isValid: false,
        error: `Format file "${file.name}" tidak didukung. Format yang didukung: PDF, TXT, PNG, JPG, JPEG, WEBP.`
      };
    }
  }

  return { isValid: true };
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const KUHPChatPage: React.FC<KUHPChatPageProps> = ({ onBack }) => {
  // Use streaming hooks and store
  const { messages, isStreaming: isLoading, streamingStatus, currentChunk, addMessage, setIsStreaming, setStreamingStatus } = usePlaygroundStore();
  
  const [inputMessage, setInputMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileValidationErrors, setFileValidationErrors] = useState<string[]>([]);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingStatusRef = useRef<HTMLDivElement>(null);
  const isSessionInitialized = useRef<boolean>(false);

  // Effect untuk inisialisasi session sekali saat komponen di-mount
  useEffect(() => {
    if (isSessionInitialized.current) {
      console.log('KUHP session already initialized, skipping');
      return;
    }

    try {
      // Clear any existing messages from other agents
      const { setMessages, resetStreamingStatus } = usePlaygroundStore.getState();
      setMessages([]);
      resetStreamingStatus();
      console.log('🧹 KUHP: Cleared existing messages from store');
      
      // Initialize KUHP session
      initializeStreamingSession();
      isSessionInitialized.current = true;
      console.log('KUHP session initialized successfully');
    } catch (error) {
      console.error('Error initializing KUHP session:', error);
    }
  }, []);

  // Auto-focus management for better UX
  useEffect(() => {
    const isAnyStreamingActive = streamingStatus.isThinking || 
                                streamingStatus.isCallingTool || 
                                streamingStatus.isAccessingKnowledge || 
                                streamingStatus.isMemoryUpdateStarted;

    if (isLoading && isAnyStreamingActive) {
      // Focus on streaming status area when streaming is active
      const timer = setTimeout(() => {
        if (streamingStatusRef.current) {
          streamingStatusRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          console.log('🎯 Auto-focus: Scrolled to streaming status area -', {
            thinking: streamingStatus.isThinking,
            callingTool: streamingStatus.isCallingTool,
            accessingKnowledge: streamingStatus.isAccessingKnowledge,
            updatingMemory: streamingStatus.isMemoryUpdateStarted
          });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    } else if (!isLoading && streamingStatus.hasCompleted) {
      // Return focus to input area when completed
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          });
          setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
          }, 300);
          console.log('🎯 Auto-focus: Returned focus to input area after completion');
        }
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, [
    isLoading, 
    streamingStatus.isThinking, 
    streamingStatus.isCallingTool, 
    streamingStatus.isAccessingKnowledge, 
    streamingStatus.isMemoryUpdateStarted, 
    streamingStatus.hasCompleted
  ]);

  // Load storage stats when showing storage info
  useEffect(() => {
    if (showStorageInfo) {
      const stats = getStorageStats();
      setStorageStats(stats);
    }
  }, [showStorageInfo]);

  // Auto-scroll to latest message (but don't interfere with streaming focus)
  useEffect(() => {
    const isAnyStreamingActive = streamingStatus.isThinking || 
                                streamingStatus.isCallingTool || 
                                streamingStatus.isAccessingKnowledge || 
                                streamingStatus.isMemoryUpdateStarted;
    
    // Only auto-scroll if not actively streaming (to avoid interfering with focus management)
    if (!isLoading || !isAnyStreamingActive) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [messages, isLoading, streamingStatus.isThinking, streamingStatus.isCallingTool, 
      streamingStatus.isAccessingKnowledge, streamingStatus.isMemoryUpdateStarted]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // Adjust height dynamically
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // File handling functions
  const handleOpenFileDialog = () => {
    setShowFileUploadModal(true);
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleFilesSelected = (files: File[] | UserFile[]) => {
    console.log('📁 Files selected from modal:', files);
    
    // Separate File objects from UserFile objects
    const fileObjects: File[] = [];
    const cloudFiles: UserFile[] = [];
    
    files.forEach(file => {
      // Check if it's a File object by looking for File-specific properties
      if ('lastModified' in file && 'webkitRelativePath' in file) {
        fileObjects.push(file as File);
      } else {
        // It's a UserFile from cloud storage
        cloudFiles.push(file as UserFile);
      }
    });
    
    // For now, handle File objects directly
    // Cloud files (UserFile) will need different handling in streaming service
    if (fileObjects.length > 0) {
      setSelectedFiles(fileObjects);
      console.log(`📋 Added ${fileObjects.length} file(s) from computer`);
    }
    
    if (cloudFiles.length > 0) {
      console.log(`☁️ Selected ${cloudFiles.length} cloud file(s):`, cloudFiles.map(f => f.original_filename));
      // TODO: Implement cloud file handling in streaming service
      // For now, we'll need to download or reference cloud files differently
      alert('Cloud file support akan segera ditambahkan. Untuk saat ini, silakan gunakan file dari komputer.');
    }
    
    setShowFileUploadModal(false);
  };

  // Storage management
  const handleStorageCleanup = () => {
    if (window.confirm('Apakah Anda yakin ingin membersihkan data lama? Data yang sudah dihapus tidak bisa dikembalikan.')) {
      const newStats = forceCleanup();
      setStorageStats(newStats);
      alert(`Cleanup selesai! Storage yang dibebaskan: ${newStats.usage}`);
    }
  };

  // Copy function
  const handleCopy = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(messageId);
        setTimeout(() => {
          setCopied(null);
        }, 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };





  // Storage Stats Component
  const StorageStatsDisplay = () => {
    if (!storageStats) return null;
    
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-4 shadow-sm rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <Database className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">Statistik Penyimpanan</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-2">
              <div className="flex justify-between">
                <span>Penggunaan Storage:</span>
                <span className="font-medium">{storageStats.usage} / {storageStats.limit}</span>
              </div>
              <div className="flex justify-between">
                <span>Persentase:</span>
                <span className={cn("font-medium", 
                  storageStats.percentage > 80 ? "text-red-600" : "text-blue-600"
                )}>
                  {storageStats.percentage}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Session Tersimpan:</span>
                <span className="font-medium">{storageStats.sessionCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Pesan Saat Ini:</span>
                <span className="font-medium">{messages.length}</span>
              </div>
              
              {/* Progress bar for storage usage */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div 
                  className={cn("h-2 rounded-full transition-all duration-300",
                    storageStats.percentage > 80 ? "bg-red-500" : 
                    storageStats.percentage > 60 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                ></div>
              </div>
              
              {storageStats.isNearLimit && (
                <div className="text-red-600 text-xs mt-2 font-medium">
                  ⚠️ Storage hampir penuh! Pertimbangkan untuk membersihkan data lama.
                </div>
              )}
            </div>
            
            <div className="mt-3 flex gap-2">
              <button 
                onClick={handleStorageCleanup}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
              >
                <Trash2 className="w-3 h-3" />
                Bersihkan Data Lama
              </button>
              <button 
                className="text-xs font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
                onClick={() => setShowStorageInfo(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleKeyDown = () => {
    // Remove Enter key submission for mobile compatibility
    // Submission is handled by the Send button
  };

  const handleSelectQuestion = (question: string) => {
    setInputMessage(question);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSendMessage = async () => {
    // Simple validation with files or text
    const trimmedMessage = inputMessage.trim();
    
    if ((selectedFiles.length === 0 && !trimmedMessage) || isLoading) return;
    
    // Validate message length if message provided
    if (trimmedMessage && trimmedMessage.length < 3) {
      alert('Pesan terlalu pendek. Minimal 3 karakter.');
      return;
    }

    const userMessageContent = trimmedMessage || (selectedFiles.length > 0 ? "Analisis file berikut" : "");

    // Clear input and reset height immediately
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.blur();
    }

    // Mobile-specific timeout handling
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const uploadTimeout = isMobile ? 60000 : 120000; // 1 min for mobile, 2 min for desktop
    
    let timeoutId: NodeJS.Timeout | null = null;
    let isRequestCompleted = false;

    try {
      // Debug message sebelum send
      console.log('📤 Sending message from KUHP UI:', {
        message: userMessageContent.substring(0, 100) + (userMessageContent.length > 100 ? '...' : ''),
        message_length: userMessageContent.length,
        files_count: selectedFiles.length,
        is_mobile: isMobile,
        timeout: uploadTimeout
      });

      // Log file sizes jika ada
      if (selectedFiles.length > 0) {
        console.log('📁 KUHP: Uploading files:');
        selectedFiles.forEach((file, index) => {
          console.log(`File ${index + 1}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        });
      }

      // Add user message to store
      const userMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user' as const,
        content: userMessageContent,
        created_at: Math.floor(Date.now() / 1000),
        // Add file attachments info if any
        ...(selectedFiles.length > 0 && {
          attachments: selectedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
          }))
        })
      };
      addMessage(userMessage);
      
      // Add initial agent message
      const agentMessage = {
        id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'agent' as const,
        content: '',
        created_at: Math.floor(Date.now() / 1000)
      };
      addMessage(agentMessage);
      
      // Set streaming state
      setIsStreaming(true);
      setStreamingStatus({ isThinking: true });

      // Set timeout for mobile compatibility
      timeoutId = setTimeout(() => {
        if (!isRequestCompleted) {
          console.error('❌ KUHP: Request timeout on mobile device');
          setIsStreaming(false);
          setStreamingStatus({ 
            hasCompleted: true,
            isThinking: false,
            isCallingTool: false,
            isMemoryUpdateStarted: false
          });
          
          // Update message with timeout error
          const { setMessages } = usePlaygroundStore.getState();
          setMessages(prev => {
            const newMessages = [...prev];
            const lastAgentMessage = newMessages[newMessages.length - 1];
            if (lastAgentMessage && lastAgentMessage.role === 'agent') {
              lastAgentMessage.content = '⏰ Timeout: Proses terlalu lama. Silakan coba lagi dengan file yang lebih kecil atau koneksi yang lebih stabil.';
            }
            return newMessages;
          });
          
          // Reset files
          setSelectedFiles([]);
          setFileValidationErrors([]);
        }
      }, uploadTimeout);
      
      // Use KUHP streaming service
      console.log('🚀 KUHP: About to call sendStreamingChatMessage with:', {
        message: userMessageContent.substring(0, 50) + '...',
        hasFiles: selectedFiles.length > 0,
        filesCount: selectedFiles.length
      });
      
      const result = await sendStreamingChatMessage(
        userMessageContent, 
        selectedFiles.length > 0 ? selectedFiles : undefined,
        (event) => {
          // Handle streaming events
          console.log('🎯 KUHP streaming event received:', {
            event: event.event,
            contentType: typeof event.content,
            contentLength: typeof event.content === 'string' ? event.content.length : 'non-string',
            contentPreview: typeof event.content === 'string' ? event.content.substring(0, 100) + '...' : event.content,
            sessionId: event.session_id
          });
          
          const { setMessages } = usePlaygroundStore.getState();
          
          // Handle different event types
          switch (event.event) {
            case RunEvent.RunStarted:
              console.log('🚀 KUHP: Run started');
              setStreamingStatus({ 
                isThinking: true,
                isCallingTool: false,
                isMemoryUpdateStarted: false,
                hasCompleted: false
              });
              break;
              
            case RunEvent.RunResponse:
              // Accumulate content incrementally
              if (event.content && typeof event.content === 'string') {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastAgentMessage = newMessages[newMessages.length - 1];
                  if (lastAgentMessage && lastAgentMessage.role === 'agent') {
                    // Append new content to existing content
                    lastAgentMessage.content = (lastAgentMessage.content || '') + event.content;
                    
                    // Parse and store citations from extra_data.references
                    if (event.extra_data?.references && event.extra_data.references.length > 0) {
                      console.log('🔗 KUHP: Citations found in response:', {
                        referencesCount: event.extra_data.references.length,
                        eventDataType: typeof event.extra_data.references[0],
                        firstRefKeys: Object.keys(event.extra_data.references[0] || {})
                      });
                      
                      // Store references in message extra_data
                      if (!lastAgentMessage.extra_data) {
                        lastAgentMessage.extra_data = {};
                      }
                      lastAgentMessage.extra_data.references = event.extra_data.references;
                    }
                  }
                  return newMessages;
                });
              }
              break;
              
            case RunEvent.ToolCallStarted:
              console.log('🔧 KUHP: Tool call started:', {
                eventType: event.event,
                hasContent: !!event.content
              });
              setStreamingStatus({ 
                isThinking: false, 
                isCallingTool: true,
                toolName: 'knowledge base',
                isMemoryUpdateStarted: false
              });
              break;
              
            case RunEvent.ToolCallCompleted:
              console.log('✅ KUHP: Tool call completed:', {
                eventType: event.event,
                hasContent: !!event.content
              });
              setStreamingStatus({ 
                isCallingTool: false,
                toolName: undefined 
              });
              break;
              
            case RunEvent.AccessingKnowledge:
              console.log('📚 KUHP: Accessing knowledge started');
              setStreamingStatus({ 
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: true,
                isMemoryUpdateStarted: false
              });
              break;
              
            case RunEvent.UpdatingMemory:
            case RunEvent.MemoryUpdateStarted:
              console.log('💾 KUHP: Memory update started');
              setStreamingStatus({ 
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: false,
                isMemoryUpdateStarted: true 
              });
              break;
              
            case RunEvent.MemoryUpdateCompleted:
              console.log('✅ KUHP: Memory update completed');
              setStreamingStatus({ 
                isMemoryUpdateStarted: false
              });
              break;
              
            case RunEvent.RunCompleted:
              console.log('🏁 KUHP: Run completed with content:', {
                hasContent: !!event.content,
                contentType: typeof event.content,
                contentLength: typeof event.content === 'string' ? event.content.length : 0,
                contentPreview: typeof event.content === 'string' ? event.content.substring(0, 100) + '...' : event.content
              });
              
              // Mark request as completed
              isRequestCompleted = true;
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              
              // Update final content if provided
              if (event.content && typeof event.content === 'string' && event.content.trim()) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastAgentMessage = newMessages[newMessages.length - 1];
                  if (lastAgentMessage && lastAgentMessage.role === 'agent') {
                    // Set final content or update if final content is longer/better
                    if (!lastAgentMessage.content || lastAgentMessage.content.length < event.content.length) {
                      lastAgentMessage.content = event.content as string;
                      console.log('🏁 KUHP: Updated with final content from RunCompleted');
                    }
                    
                    // Update final citations if provided
                    if (event.extra_data?.references && event.extra_data.references.length > 0) {
                      console.log('🔗 KUHP: Final citations from RunCompleted:', {
                        referencesCount: event.extra_data.references.length
                      });
                      
                      if (!lastAgentMessage.extra_data) {
                        lastAgentMessage.extra_data = {};
                      }
                      lastAgentMessage.extra_data.references = event.extra_data.references;
                    }
                  }
                  return newMessages;
                });
              }
              
              // Final check: ensure we have some content after completion
              setMessages(prev => {
                const newMessages = [...prev];
                const lastAgentMessage = newMessages[newMessages.length - 1];
                if (lastAgentMessage && lastAgentMessage.role === 'agent') {
                  if (!lastAgentMessage.content || lastAgentMessage.content.trim() === '') {
                    lastAgentMessage.content = 'Tidak ada konten yang diterima. Silakan coba lagi.';
                    console.warn('KUHP: No content found after completion, showing fallback message');
                  }
                }
                return newMessages;
              });
              
              setStreamingStatus({ 
                hasCompleted: true,
                isThinking: false,
                isCallingTool: false,
                isMemoryUpdateStarted: false
              });
              setIsStreaming(false);
              break;
              
            case RunEvent.RunError:
              console.error('❌ KUHP: Run error:', event.content);
              
              // Mark request as completed even on error
              isRequestCompleted = true;
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              
              setMessages(prev => {
                const newMessages = [...prev];
                const lastAgentMessage = newMessages[newMessages.length - 1];
                if (lastAgentMessage && lastAgentMessage.role === 'agent') {
                  lastAgentMessage.content = `❌ Error: ${event.content || 'Unknown error occurred'}`;
                }
                return newMessages;
              });
              setIsStreaming(false);
              setStreamingStatus({ 
                hasCompleted: true,
                isThinking: false,
                isCallingTool: false,
                isMemoryUpdateStarted: false
              });
              break;
              
            default:
              console.log('KUHP: Unknown event type:', event.event);
              break;
          }
        }
      );
      
      console.log('📊 KUHP: sendStreamingChatMessage completed with result:', result);

      // Mark as completed and clear timeout if still active
      isRequestCompleted = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Reset selected files setelah berhasil mengirim
      setSelectedFiles([]);
      setFileValidationErrors([]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark as completed and clear timeout
      isRequestCompleted = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Ensure loading state is cleared on error
      setIsStreaming(false);
      setStreamingStatus({ 
        hasCompleted: true,
        isThinking: false,
        isCallingTool: false,
        isMemoryUpdateStarted: false
      });
      
      // Show error message
      const { setMessages } = usePlaygroundStore.getState();
      setMessages(prev => {
        const newMessages = [...prev];
        const lastAgentMessage = newMessages[newMessages.length - 1];
        if (lastAgentMessage && lastAgentMessage.role === 'agent') {
          lastAgentMessage.content = `❌ Error: ${error instanceof Error ? error.message : 'Terjadi kesalahan saat mengirim pesan'}`;
        }
        return newMessages;
      });
      
      // Reset files on error
      setSelectedFiles([]);
      setFileValidationErrors([]);
    }
  };

  const handleChatReset = () => {
    try {
      console.log('Resetting KUHP chat history but maintaining user identity');
      clearStreamingChatHistory(); // Ini hanya akan menghapus session_id, tapi mempertahankan user_id
      
      // Inisialisasi ulang session dengan user_id yang sama
      initializeStreamingSession();
      console.log('KUHP session reinitialized with fresh session_id but same user_id');
      
      // Reset UI state
      const { setMessages, resetStreamingStatus } = usePlaygroundStore.getState();
      setMessages([]);
      resetStreamingStatus();
      setSelectedFiles([]);
      setFileValidationErrors([]);
    } catch (error) {
      console.error('Error resetting KUHP chat:', error);
    }
  };

  // Render error states
  return (
    <div className="fixed inset-0 z-20 bg-white lg:pl-64 flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Ahli Pidana</h1>
            <p className="text-sm text-gray-600 hidden sm:block">Asisten AI spesialisasi hukum pidana</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowStorageInfo(!showStorageInfo)}
            className="text-gray-500"
            title="Storage Info"
          >
            <Database className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowInfo(!showInfo)}
            className="text-gray-500"
          >
            <Info className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleChatReset}
            className="text-gray-500"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      {showStorageInfo && <StorageStatsDisplay />}
      
      {showInfo && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 m-4 shadow-sm rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-rose-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-rose-800">Informasi Ahli Pidana</h3>
              <div className="mt-2 text-sm text-rose-700">
                <p>Ahli Pidana adalah asisten berbasis kecerdasan buatan untuk membantu memahami Kitab Undang-Undang Hukum Pidana (KUHP) dan regulasi pidana terkait.</p>
                <p className="mt-2 text-xs">
                  💡 Tip: Gunakan tombol database untuk melihat penggunaan storage dan membersihkan data lama.
                </p>
              </div>
              <button 
                className="mt-2 text-sm font-medium text-rose-600 hover:text-rose-500 focus:outline-none"
                onClick={() => setShowInfo(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain pb-32 pt-4 bg-white"
        data-chat-container="true"
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-6">
            {/* Welcome Message - Bold Ahli Pidana in center */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-rose-600 text-2xl font-bold">AH</span>
                </div>
                <h2 className="text-4xl font-bold text-rose-600 mb-4">Ahli Pidana</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Saya siap membantu Anda dalam bidang hukum pidana Indonesia, termasuk KUHP dan regulasi terkait.
                </p>
              </div>
            )}

            {/* Example Questions - only show at the beginning */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500">Contoh pertanyaan:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {KUHP_EXAMPLE_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      className="text-left p-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-rose-50 transition-colors shadow-sm"
                      onClick={() => handleSelectQuestion(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* File Validation Errors */}
            {fileValidationErrors.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error Validasi File</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc list-inside space-y-1">
                        {fileValidationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                      <div className="mt-3 text-xs text-red-600">
                        <p><strong>Format yang didukung:</strong> PDF, TXT, PNG, JPG, JPEG, WEBP</p>
                        <p><strong>Ukuran maksimal:</strong> 20MB per file</p>
                  </div>
                </div>
              </div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message, index) => {
              // Check if this is an agent message that is currently streaming
              const isLastMessage = index === messages.length - 1;
              const hasMinimalContent = !message.content || message.content.trim().length < 50;
              const isStreamingMessage = message.role === 'agent' && 
                                       isLastMessage && 
                                       isLoading &&
                                       (hasMinimalContent || 
                                        streamingStatus.isThinking || 
                                        streamingStatus.isCallingTool || 
                                        streamingStatus.isAccessingKnowledge ||
                                        streamingStatus.isMemoryUpdateStarted);
              
              return (message.content || isStreamingMessage) && (
                <div
                  key={message.id}
                  className={cn("flex w-full", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div className={cn("flex gap-3 w-full max-w-full", message.role === "user" ? "flex-row-reverse max-w-[85%] sm:max-w-[80%]" : "flex-row")}>
                    {message.role === 'agent' && (
                      <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-xs font-medium">AH</span>
                      </div>
                    )}
                    <div className={cn("min-w-0 flex-1", message.role === 'user' ? "order-first max-w-full" : "max-w-full")}>
                                        <div
                        className={cn(
                          "max-w-full min-w-0 break-words overflow-wrap-anywhere",
                          message.role === 'user'
                            ? "bg-gray-200 text-gray-800 rounded-3xl px-4 py-2.5 ml-auto"
                            : "bg-transparent"
                        )}
                      >
                        {message.role === 'agent' ? (
                          <div className="relative group">
                            {/* Streaming Status for this specific message */}
                            {isStreamingMessage && (
                              <div 
                                ref={streamingStatusRef} 
                                className="mb-3 scroll-mt-4 transition-all duration-300"
                              >
                                <StreamingStatus 
                                  isStreaming={true} 
                                  streamingStatus={streamingStatus}
                                  compact={true}
                                  currentChunk={currentChunk}
                                  containerWidth="message"
                                />
                              </div>
                            )}
                            
                                                        {message.content ? (
                              <div className="overflow-x-auto">
                                <div 
                                  className="prose prose-gray prose-sm max-w-none
                                           [&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-gray-800 [&_p]:word-wrap-break-word
                                           [&_a]:text-blue-600 [&_a]:no-underline hover:[&_a]:underline [&_a]:word-wrap-break-word
                                           [&_ul]:mb-4 [&_ul]:space-y-1 [&_li]:text-gray-800 [&_li]:word-wrap-break-word
                                           [&_ol]:mb-4 [&_ol]:space-y-1 [&_ol_li]:text-gray-800 [&_ol_li]:word-wrap-break-word
                                           [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-gray-600
                                           [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:border
                                           [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                                           [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mb-4 [&_h1]:text-gray-900
                                           [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:text-gray-900
                                           [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:text-gray-900
                                           [&_table]:border-collapse [&_table]:my-4 [&_table]:w-full [&_table]:min-w-[600px] [&_table]:text-sm [&_table]:border [&_table]:border-gray-200
                                           [&_th]:bg-gray-50 [&_th]:p-3 [&_th]:border [&_th]:border-gray-200 [&_th]:font-semibold [&_th]:text-left [&_th]:text-gray-900 [&_th]:whitespace-nowrap
                                           [&_td]:p-3 [&_td]:border [&_td]:border-gray-200 [&_td]:align-top [&_td]:leading-relaxed [&_td]:text-gray-800 [&_td]:word-wrap-break-word
                                           [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2
                                           text-gray-800 leading-relaxed word-wrap-break-word overflow-wrap-break-word"
                                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                                />
                              </div>
                            ) : (
                              // Placeholder for empty streaming message
                              <div className="text-gray-400 text-sm italic">
                                Sedang memproses...
                              </div>
                            )}
                            
                            {/* Citations Display */}
                            {message.extra_data?.references && message.extra_data.references.length > 0 && (
                              <div className="mt-4 -mx-2 sm:mx-0">
                                <CitationDisplay 
                                  references={message.extra_data.references as any}
                                  compact={false} // Let component auto-detect mobile
                                  className="max-w-full overflow-hidden"
                                />
                              </div>
                            )}
                            
                            {message.content && (
                              <div className="flex justify-start mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                  onClick={() => handleCopy(message.content, message.id || '')}
                                >
                                  {copied === message.id ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="whitespace-pre-wrap word-wrap-break-word leading-relaxed">{message.content}</div>
                            
                            {/* File attachments for user messages */}
                            {message.role === 'user' && message.attachments && message.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <div className="text-xs text-gray-600 font-medium">
                                  File terlampir ({message.attachments.length}):
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {message.attachments.map((attachment, index) => (
                                    <div 
                                      key={index}
                                      className="bg-gray-200 border border-gray-300 rounded-md px-2 py-1 flex items-center gap-2 text-xs"
                                    >
                                      <File className="w-3 h-3 flex-shrink-0 text-gray-500" />
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="truncate font-medium text-gray-700">{attachment.name}</span>
                                        <span className="text-xs text-gray-500">
                                          {formatFileSize(attachment.size)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                    {message.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-xs font-medium">U</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div ref={messagesEndRef} />
          </div>
      </div>

      {/* Input area fixed at bottom */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          {/* File Preview Area */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="text-xs text-gray-600 font-medium">
                File terpilih ({selectedFiles.length}):
              </div>
              <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div 
                  key={index}
                    className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2"
                  >
                    <File className="w-4 h-4 flex-shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-medium text-sm">{file.name}</span>
                      <span className="text-xs text-rose-500">
                        {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                      </span>
                    </div>
                  <button 
                    onClick={() => handleRemoveFile(index)}
                      className="text-rose-500 hover:text-rose-700 flex-shrink-0 ml-2"
                    aria-label="Hapus file"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              </div>
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message Ahli Pidana..."
              className="resize-none pr-14 py-3 pl-10 max-h-[200px] rounded-2xl border border-gray-300 shadow-sm focus:border-gray-400 focus:ring-0 focus:outline-none overflow-y-auto bg-white"
              disabled={isLoading}
              data-chat-input="true"
            />

            {/* File Upload Button */}
            <button
              type="button"
              onClick={handleOpenFileDialog}
              disabled={isLoading}
              className="absolute left-2 bottom-2.5 w-8 h-8 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center"
              aria-label="Upload file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            

            
            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputMessage.trim() && selectedFiles.length === 0)}
              className="absolute right-2 bottom-2.5 w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:opacity-50 flex items-center justify-center transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label="Kirim pesan"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Ahli Pidana dapat membuat kesalahan. Pertimbangkan untuk memverifikasi informasi penting.
          </p>
        </div>
      </div>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        onFilesSelected={handleFilesSelected}
        acceptedTypes={ACCEPTED_FILE_TYPES}
        maxFileSize={MAX_FILE_SIZE}
        supportedMimeTypes={SUPPORTED_MIME_TYPES}
        title="Upload File untuk Analisis"
        description="Pilih file dari komputer atau cloud storage untuk dianalisis oleh Ahli Pidana"
        allowMultiple={true}
      />
    </div>
  );
};

export default KUHPChatPage; 