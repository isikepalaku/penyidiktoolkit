import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Copy, Check, Loader2, Info, RefreshCw, Paperclip, File, XIcon, AlertCircle, Database, Trash2 } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from './button';
import { Textarea } from './textarea';

import { formatMessage } from '@/utils/markdownFormatter';
import { RunEvent } from '@/types/playground';
import { usePlaygroundStore } from '@/stores/PlaygroundStore';
import StreamingStatus from '@/hooks/streaming/StreamingStatus';
import CitationDisplay from './CitationDisplay';
import { 
  clearStreamingChatHistory,
  initializeStreamingSession,
  sendStreamingChatMessage
} from '@/services/kuhapService';
import { getStorageStats, forceCleanup } from '@/stores/PlaygroundStore';

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

interface HukumPerdataChatPageProps {
  onBack?: () => void;
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

const HukumPerdataChatPage: React.FC<HukumPerdataChatPageProps> = ({ onBack }) => {
  // Use streaming hooks and store
  const { messages, isStreaming: isLoading, streamingStatus, addMessage, setIsStreaming, setStreamingStatus } = usePlaygroundStore();
  
  const [inputMessage, setInputMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [storageStats, setStorageStats] = useState<any>(null);
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
      console.log('Hukum Perdata session already initialized, skipping');
      return;
    }

    try {
      // Clear any existing messages from other agents untuk proper isolation
      // setMessages([]); // This line was removed from the new_code, so it's removed here.
      // resetStreamingStatus(); // This line was removed from the new_code, so it's removed here.
      console.log('🧹 HUKUM PERDATA: Cleared existing messages from store');
      
      // Initialize Hukum Perdata session
      initializeStreamingSession();
      isSessionInitialized.current = true;
      console.log('Hukum Perdata session initialized successfully');
    } catch (error) {
      console.error('Error initializing Hukum Perdata session:', error);
    }
  }, []); // Removed setMessages, resetStreamingStatus from dependency array

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
      
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
        console.log(`✅ File ${index + 1} valid: ${file.name}`);
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
              <button onClick={handleStorageCleanup} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-500 focus:outline-none">
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
      console.log('📤 Sending message from HUKUM PERDATA UI:', {
        message: userMessageContent.substring(0, 100) + (userMessageContent.length > 100 ? '...' : ''),
        message_length: userMessageContent.length,
        files_count: selectedFiles.length,
        is_mobile: isMobile,
        timeout: uploadTimeout
      });

      // Log file sizes jika ada
      if (selectedFiles.length > 0) {
        console.log('📁 HUKUM PERDATA: Uploading files:');
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
          console.error('❌ HUKUM PERDATA: Request timeout on mobile device');
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
      
      // Use HUKUM PERDATA streaming service
      console.log('🚀 HUKUM PERDATA: About to call sendStreamingChatMessage');
      
      await sendStreamingChatMessage(
        userMessageContent,
        selectedFiles.length > 0 ? selectedFiles : undefined,
        (event) => {
          // Handle streaming events
          console.log('🎯 HUKUM PERDATA streaming event received:', {
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
              console.log('🚀 HUKUM PERDATA: Run started');
              setStreamingStatus({ 
                isThinking: true,
                isCallingTool: false,
                isAccessingKnowledge: false,
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
                      console.log('🔗 HUKUM PERDATA: Citations found in response:', {
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
              console.log('🔧 HUKUM PERDATA: Tool call started:', {
                eventType: event.event,
                hasContent: !!event.content,
                toolInfo: event.tool_calls || event.tools
              });
              
              // Extract tool name from event
              let toolName = 'knowledge base';
              if (event.tool_calls && event.tool_calls.length > 0) {
                toolName = event.tool_calls[0].function?.name || 'unknown tool';
              } else if (event.tools && event.tools.length > 0) {
                toolName = event.tools[0].function?.name || 'unknown tool';
              }
              
              setStreamingStatus({ 
                isThinking: false, 
                isCallingTool: true,
                toolName: toolName,
                isAccessingKnowledge: false,
                isMemoryUpdateStarted: false
              });
              break;
              
            case RunEvent.ToolCallCompleted:
              console.log('✅ HUKUM PERDATA: Tool call completed:', {
                eventType: event.event,
                hasContent: !!event.content
              });
              setStreamingStatus({ 
                isCallingTool: false,
                toolName: undefined 
              });
              break;
              
            case RunEvent.AccessingKnowledge:
              console.log('📚 HUKUM PERDATA: Accessing knowledge started');
              setStreamingStatus({ 
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: true,
                isMemoryUpdateStarted: false
              });
              break;
              
            case RunEvent.UpdatingMemory:
            case RunEvent.MemoryUpdateStarted:
              console.log('💾 HUKUM PERDATA: Memory update started');
              setStreamingStatus({ 
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: false,
                isMemoryUpdateStarted: true 
              });
              break;
              
            case RunEvent.MemoryUpdateCompleted:
              console.log('✅ HUKUM PERDATA: Memory update completed');
              setStreamingStatus({ 
                isMemoryUpdateStarted: false
              });
              break;
              
            case RunEvent.RunCompleted:
              console.log('🏁 HUKUM PERDATA: Run completed with content:', {
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
              
              // Update final content and ensure citations are preserved
              if (event.content && typeof event.content === 'string' && event.content.trim()) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastAgentMessage = newMessages[newMessages.length - 1];
                  if (lastAgentMessage && lastAgentMessage.role === 'agent') {
                    // Set final content or update if final content is longer/better
                    if (!lastAgentMessage.content || lastAgentMessage.content.length < event.content.length) {
                      lastAgentMessage.content = event.content as string;
                      console.log('🏁 HUKUM PERDATA: Updated with final content from RunCompleted');
                    }
                    
                    // Ensure final citations are stored
                    if (event.extra_data?.references && event.extra_data.references.length > 0) {
                      if (!lastAgentMessage.extra_data) {
                        lastAgentMessage.extra_data = {};
                      }
                      lastAgentMessage.extra_data.references = event.extra_data.references;
                      
                      console.log('🏁 HUKUM PERDATA: Final citations stored:', {
                        referencesCount: event.extra_data.references.length,
                        messageHasContent: !!lastAgentMessage.content
                      });
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
                    console.warn('HUKUM PERDATA: No content found after completion, showing fallback message');
                  }
                }
                return newMessages;
              });
              
              setStreamingStatus({ 
                hasCompleted: true,
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: false,
                isMemoryUpdateStarted: false
              });
              setIsStreaming(false);
              
              // Reset status after a delay for better UX
              setTimeout(() => {
                setStreamingStatus({ 
                  hasCompleted: false,
                  isThinking: false,
                  isCallingTool: false,
                  isAccessingKnowledge: false,
                  isMemoryUpdateStarted: false
                });
              }, 1000);
              break;
              
            case RunEvent.RunError:
              console.error('❌ HUKUM PERDATA: Run error:', {
                eventType: event.event,
                content: event.content,
                error: event.error
              });
              
              isRequestCompleted = true;
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              
              setMessages(prev => {
                const newMessages = [...prev];
                const lastAgentMessage = newMessages[newMessages.length - 1];
                if (lastAgentMessage && lastAgentMessage.role === 'agent') {
                  lastAgentMessage.content = `❌ Error: ${event.content || event.error || 'Unknown error occurred'}`;
                }
                return newMessages;
              });
              setIsStreaming(false);
              setStreamingStatus({ 
                hasCompleted: true, 
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: false,
                isMemoryUpdateStarted: false
              });
              break;
              
            default:
              console.log('🔍 HUKUM PERDATA: Unhandled event type:', event.event);
              break;
          }
        }
      );

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
      setStreamingStatus({ hasCompleted: true, isThinking: false });
      
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
      console.log('Resetting HUKUM PERDATA chat history but maintaining user identity');
      clearStreamingChatHistory(); // Ini hanya akan menghapus session_id, tapi mempertahankan user_id
      
      // Inisialisasi ulang session dengan user_id yang sama
      initializeStreamingSession();
      console.log('HUKUM PERDATA session reinitialized with fresh session_id but same user_id');
      
      // Reset UI state
      const { setMessages, resetStreamingStatus } = usePlaygroundStore.getState();
      setMessages([]);
      resetStreamingStatus();
      setSelectedFiles([]);
      setFileValidationErrors([]);
    } catch (error) {
      console.error('Error resetting HUKUM PERDATA chat:', error);
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">HP</span>
            </div>
            <div>
              <h1 className="font-semibold">Ahli Hukum Perdata AI</h1>
              <p className="text-sm text-gray-600 hidden sm:block">Konsultasi dan analisis hukum perdata Indonesia</p>
            </div>
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

      {/* Info Panel */}
      {showInfo && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 m-4 shadow-sm rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-orange-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">Tentang Ahli Hukum Perdata AI</h3>
              <div className="mt-2 text-sm text-orange-700">
                <p>Asisten AI yang dirancang khusus untuk membantu penegak hukum dalam konsultasi dan analisis hukum perdata Indonesia, termasuk kontrak, properti, dan perselisihan sipil.</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Analisis mendalam dokumen legal dan kontrak</li>
                  <li>Interpretasi KUH Perdata dan undang-undang terkait</li>
                  <li>Panduan prosedur hukum perdata</li>
                  <li>Konsultasi kasus dan sengketa perdata</li>
                  <li>Analisis yuridis berdasarkan hukum positif Indonesia</li>
                </ul>
                <p className="mt-2 text-xs">
                  💡 Tip: Gunakan tombol database untuk melihat penggunaan storage dan membersihkan data lama.
                </p>
              </div>
              <button 
                className="mt-2 text-sm font-medium text-orange-600 hover:text-orange-500 focus:outline-none"
                onClick={() => setShowInfo(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Container - Fixed the layout structure */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 pb-6"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {/* File Validation Errors */}
          {fileValidationErrors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md mb-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error Validasi File</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc list-inside space-y-1">
                      {fileValidationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3 text-xs text-red-600">
                    <p><strong>Format yang didukung:</strong> PDF, TXT, PNG, JPG, JPEG, WEBP</p>
                    <p><strong>Ukuran maksimal:</strong> 20MB per file</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Welcome Message and Example Questions - Only show if no messages */}
          {messages.length === 0 && (
            <div className="space-y-6 mb-8">
              {/* Welcome Message */}
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-white text-2xl font-bold">HP</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Selamat Datang di Ahli Hukum Perdata AI</h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Saya adalah asisten AI yang akan membantu Anda dalam konsultasi hukum perdata Indonesia. 
                    Saya dapat membantu analisis kontrak, perjanjian, sengketa perdata, dan permasalahan hukum perdata lainnya.
                  </p>
                </div>
              </div>
              
              {/* Example Questions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700 text-center">Contoh pertanyaan yang bisa Anda ajukan:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Bagaimana cara membuat kontrak jual beli yang sah?",
                    "Apa saja syarat sahnya perjanjian menurut KUH Perdata?",
                    "Bagaimana prosedur gugatan wanprestasi?",
                    "Apa yang dimaksud dengan force majeure dalam kontrak?",
                    "Bagaimana cara mengajukan gugatan perdata?",
                    "Apa yang harus dilakukan jika kontrak dilanggar?"
                  ].map((question, idx) => (
                    <button
                      key={idx}
                      className="text-left p-4 border border-gray-200 rounded-lg text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      onClick={() => handleSelectQuestion(question)}
                    >
                      <span className="text-sm font-medium">{question}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Tips */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                <p className="text-sm text-orange-800">
                  💡 <strong>Tips:</strong> Anda dapat mengunggah dokumen (PDF, TXT, gambar) untuk analisis lebih mendalam
                </p>
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
                className={cn("flex w-full mb-6", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div className={cn("flex gap-3 w-full max-w-full", message.role === "user" ? "flex-row-reverse max-w-[85%] sm:max-w-[80%]" : "flex-row")}>
                  {message.role === 'agent' && (
                    <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-xs font-medium">HP</span>
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
                        <div className="relative group space-y-3">
                          {/* Streaming Status for this specific message */}
                          {isStreamingMessage && (
                            <div 
                              ref={streamingStatusRef} 
                              className="bg-orange-50 border border-orange-200 rounded-lg p-3 scroll-mt-4 transition-all duration-300"
                            >
                              <StreamingStatus 
                                isStreaming={true} 
                                streamingStatus={streamingStatus}
                                compact={true}
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
                            <div className="text-gray-400 text-sm italic py-2">
                              Sedang memproses...
                            </div>
                          )}
                          
                          {/* Citations Display */}
                          {message.extra_data?.references && message.extra_data.references.length > 0 && (
                            <div className="mt-4 -mx-2 sm:mx-0">
                              <CitationDisplay 
                                references={message.extra_data.references as any}
                                compact={false}
                                className="max-w-full overflow-hidden"
                              />
                            </div>
                          )}
                          
                          {message.content && (
                            <div className="flex justify-start mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <div className="space-y-3">
                          <div className="whitespace-pre-wrap word-wrap-break-word leading-relaxed">{message.content}</div>
                          
                          {/* File attachments for user messages */}
                          {message.role === 'user' && message.attachments && message.attachments.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-gray-300">
                              <div className="text-xs text-gray-600 font-medium">
                                File terlampir ({message.attachments.length}):
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {message.attachments.map((attachment, index) => (
                                  <div 
                                    key={index}
                                    className="bg-white/80 border border-gray-400 rounded-md px-2 py-1 flex items-center gap-2 text-xs shadow-sm"
                                  >
                                    <File className="w-3 h-3 flex-shrink-0 text-gray-600" />
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <span className="truncate font-medium text-gray-800">{attachment.name}</span>
                                      <span className="text-xs text-gray-600">
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
        <div className="max-w-3xl mx-auto">
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
                    className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex items-center gap-2"
                  >
                    <File className="w-4 h-4 flex-shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-medium text-sm">{file.name}</span>
                      <span className="text-xs text-orange-500">
                        {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleRemoveFile(index)}
                      className="text-orange-500 hover:text-orange-700 flex-shrink-0 ml-2"
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
              placeholder="Konsultasikan masalah hukum perdata Anda..."
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
            
            {/* Hidden file input */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept={ACCEPTED_FILE_TYPES}
            />
            
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
            Ahli Hukum Perdata AI dapat membuat kesalahan. Selalu verifikasi informasi hukum dengan peraturan terbaru dan konsultasi ahli.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HukumPerdataChatPage; 