import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, RefreshCw, Paperclip, File, XIcon, AlertCircle, Database, Trash2 } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { DotBackground } from './DotBackground';
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
import { 
  chatStyles, 
  getProseClasses, 
  getUserMessageClasses, 
  getAgentMessageClasses, 
  getSendButtonClasses 
} from '@/styles/chatStyles';

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingStatusRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
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



  // Enhanced file change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const errors: string[] = [];
    const validFiles: File[] = [];

    console.log(`📁 File upload attempt: ${files.length} file(s)`);

    files.forEach((file, index) => {
      console.log(`📄 File ${index + 1}: ${file.name} (${formatFileSize(file.size)}, MIME: "${file.type}")`);
      
      // Check MIME type dan provide additional info untuk backend debugging
      const extension = file.name.toLowerCase().split('.').pop();
      
      // Log detailed MIME type information untuk backend debugging
      if (!file.type || file.type === 'application/octet-stream') {
        const extensionMimeMap: { [key: string]: string } = {
          'pdf': 'application/pdf',
          'txt': 'text/plain',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'webp': 'image/webp'
        };

        if (extension && extensionMimeMap[extension]) {
          const expectedMimeType = extensionMimeMap[extension];
          console.log(`⚠️ MIME type issue for ${file.name}:`);
          console.log(`   Browser detected: "${file.type}"`);
          console.log(`   Expected for .${extension}: "${expectedMimeType}"`);
          console.log(`   Backend should use: "${expectedMimeType}" for Google GenAI`);
        }
      }
      
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
        console.log(`✅ File ${index + 1} valid: ${file.name} (MIME: "${file.type}")`);
        
        // Additional info untuk backend debugging
        if (extension === 'docx' && (!file.type || file.type === 'application/octet-stream')) {
          console.log(`📋 Backend Note: ${file.name} should use MIME type "application/vnd.openxmlformats-officedocument.wordprocessingml.document" for Google GenAI`);
        }
      } else {
        errors.push(validation.error!);
        console.log(`❌ File ${index + 1} invalid: ${validation.error}`);
      }
    });

    // Update error state
    setFileValidationErrors(errors);

    // Only add valid files
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      console.log(`📋 Successfully processed ${validFiles.length} valid file(s)`);
    }

    // Clear the input to allow re-selection of the same file
    e.target.value = '';

    // Clear errors after 5 seconds
    if (errors.length > 0) {
      setTimeout(() => {
        setFileValidationErrors([]);
      }, 5000);
    }
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
        className="flex-1 overflow-y-auto overscroll-contain pb-32 pt-4"
        data-chat-container="true"
      >
        <DotBackground>
          <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-6">
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
                  className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div className={cn("flex gap-4", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    {message.role === 'agent' && (
                      <div className={chatStyles.agentAvatar.shape + ' ' + chatStyles.agentAvatar.background}>
                        <span className={chatStyles.agentAvatar.text + ' text-sm font-bold'}>AH</span>
                      </div>
                    )}
                    <div className={cn("max-w-[80%]", message.role === 'user' ? "order-first" : "")}>
                  <div
                    className={cn(
                          message.role === 'user'
                            ? getUserMessageClasses()
                            : getAgentMessageClasses()
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
                              <div 
                                className={getProseClasses()}
                                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                              />
                            ) : (
                              // Placeholder for empty streaming message
                              <div className="text-gray-400 text-sm italic">
                                Sedang memproses...
                              </div>
                            )}
                            
                            {/* Citations Display */}
                            {message.extra_data?.references && message.extra_data.references.length > 0 && (
                              <div className="mt-4">
                                <CitationDisplay 
                                  references={message.extra_data.references as any}
                                  compact={false}
                                />
                              </div>
                            )}
                            
                            {message.content && (
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3"
                                  onClick={() => handleCopy(message.content, message.id || '')}
                          >
                                  {copied === message.id ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                                  <span className="ml-2 text-xs">{copied === message.id ? "Disalin" : "Salin"}</span>
                          </Button>
                        </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            
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
                      <div className="text-xs text-gray-500 mt-2 px-1">
                        {message.created_at ? new Date(message.created_at * 1000).toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : ''}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className={chatStyles.userAvatar.shape + ' ' + chatStyles.userAvatar.background}>
                        <span className={chatStyles.userAvatar.text + ' text-sm font-medium'}>U</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div ref={messagesEndRef} />
          </div>
        </DotBackground>
      </div>

      {/* Input area fixed at bottom */}
      <div className="border-t border-gray-200 bg-white p-4 md:px-8 pb-safe">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
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
              placeholder="Ketik pesan Anda atau upload file (PDF, DOC, TXT, gambar, dll. maks 20MB)..."
              className={`resize-none pr-14 py-3 pl-10 max-h-[200px] rounded-xl ${chatStyles.input.border} ${chatStyles.input.focus} shadow-sm overflow-y-auto`}
              disabled={isLoading}
              data-chat-input="true"
            />

            {/* File Upload Button */}
            <button
              type="button"
              onClick={handleOpenFileDialog}
              disabled={isLoading}
              className="absolute left-2 bottom-3 p-2 rounded-lg text-gray-500 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              aria-label="Upload file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            {/* Hidden file input */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept={ACCEPTED_FILE_TYPES}
            />
            
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputMessage.trim() && selectedFiles.length === 0)}
              className={getSendButtonClasses(isLoading || (!inputMessage.trim() && selectedFiles.length === 0))}
              aria-label="Kirim pesan"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Ahli Pidana memberikan informasi umum tentang hukum pidana Indonesia. Untuk masalah hukum yang kompleks, disarankan berkonsultasi dengan pengacara.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KUHPChatPage; 