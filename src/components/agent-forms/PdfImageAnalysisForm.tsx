import React, { useState, useRef, useEffect } from 'react';
import type { BaseAgentFormProps } from './BaseAgentForm';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";
import { 
  FileText, 
  X, 
  Upload, 
  MessageSquare, 
  Loader2, 
  Copy, 
  Check, 
  Send, 
  ArrowLeft, 
  FileType,
  File as FileIconGeneric
} from "lucide-react";
import { isSupportedFormat } from '@/services/pdfImageService';
import { formatFileSize } from '@/services/audioTranscriptService';
import type { PdfImageFormData } from '@/types/pdfImage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatMessage } from '@/types/pdfImage';
import { getDefaultPromptTitle } from '@/data/prompts/pdfImagePrompts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB

type PdfImageAnalysisFormProps = Omit<BaseAgentFormProps, 'agent' | 'formData'> & {
  formData: PdfImageFormData;
  chatMessages?: ChatMessage[];
  onSendChatMessage?: (message: string) => void;
  isChatMode?: boolean;
  onToggleChatMode?: () => void;
};

// Komponen untuk pesan chat dengan fitur copy
const ChatMessageItem = ({ message }: { message: ChatMessage }) => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div 
      className={cn(
        "flex max-w-[85%] rounded-lg",
        message.role === 'user' 
          ? "ml-auto bg-blue-100 text-blue-900" 
          : "bg-gray-100 text-gray-800"
      )}
    >
      <div className="flex flex-col w-full">
        {/* Header pesan dengan tombol copy untuk pesan asisten */}
        {message.role === 'assistant' && (
          <div className="flex justify-between items-center px-3 pt-2 pb-1 border-b border-gray-200 text-xs text-gray-500">
            <span>AI Assistant</span>
            <button 
              onClick={copyToClipboard}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors"
              aria-label="Copy message"
              title="Copy message"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}
        
        {/* Konten pesan dengan rendering Markdown */}
        <div className="p-3">
          {message.role === 'assistant' ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Fungsi untuk mendapatkan ikon berdasarkan tipe file
const getFileIcon = (file: File, size: 'sm' | 'lg' = 'sm') => {
  const isPdf = file.type === 'application/pdf';
  
  const iconSize = size === 'sm' ? "w-4 h-4" : "w-12 h-12";
  
  if (isPdf) {
    return <FileType className={`${iconSize} text-red-${size === 'sm' ? '500' : '400'}`} />;
  } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
    return <FileText className={`${iconSize} text-blue-${size === 'sm' ? '600' : '400'}`} />;
  } else if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
    return <FileText className={`${iconSize} text-green-${size === 'sm' ? '600' : '400'}`} />;
  } else if (file.type.includes('powerpoint') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
    return <FileText className={`${iconSize} text-orange-${size === 'sm' ? '600' : '400'}`} />;
  } else {
    return <FileIconGeneric className={`${iconSize} text-gray-${size === 'sm' ? '500' : '400'}`} />;
  }
};

// Komponen untuk menampilkan file yang diupload dalam mode chat
const FilePreviewItem = ({ file, onRemove, disabled }: { file: File; onRemove: () => void; disabled: boolean }) => {
  const isImage = file.type.startsWith('image/');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);
  
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded">
        {isImage && previewUrl ? (
          <img src={previewUrl} alt={file.name} className="w-full h-full object-cover rounded" />
        ) : (
          getFileIcon(file, 'sm')
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)}
        </p>
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded-full hover:bg-gray-200 text-gray-500"
          aria-label="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const PdfImageAnalysisForm: React.FC<PdfImageAnalysisFormProps> = ({
  formData,
  onInputChange,
  error,
  isProcessing,
  isDisabled,
  chatMessages = [],
  onSendChatMessage,
  isChatMode = false,
  onToggleChatMode
}) => {
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [promptTitle, setPromptTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDocumentProcessed, setIsDocumentProcessed] = useState(false);

  // Update prompt title when task type changes
  useEffect(() => {
    if (formData.task_type) {
      const title = getDefaultPromptTitle(formData.task_type as any);
      setPromptTitle(title);
    }
  }, [formData.task_type]);

  // Scroll to bottom of chat container when messages change
  useEffect(() => {
    if (chatContainerRef.current && isChatMode) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [chatMessages, isChatMode]);

  // Set document as processed when switching to chat mode
  useEffect(() => {
    if (isChatMode && formData.files && formData.files.length > 0) {
      setIsDocumentProcessed(true);
    }
  }, [isChatMode, formData.files]);

  // Cleanup file preview URLs when component unmounts
  useEffect(() => {
    return () => {
      // Revoke all object URLs to prevent memory leaks
      filePreviewUrls.forEach(url => {
        if (url !== 'pdf') { // Skip placeholder strings
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [filePreviewUrls]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File terlalu besar. Maksimal ukuran file adalah ${formatFileSize(MAX_FILE_SIZE)}`;
    }

    if (!isSupportedFormat(file)) {
      return `Format file tidak didukung. Gunakan PDF atau gambar (JPG, PNG, etc.)`;
    }

    return null;
  };

  const validateTotalSize = (files: File[]): string | null => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return `Total ukuran file terlalu besar. Maksimal total ukuran adalah ${formatFileSize(MAX_TOTAL_SIZE)}`;
    }
    return null;
  };

  const validateMaxDocuments = (newFiles: FileList | null): string | null => {
    if (!newFiles) return null;
    
    const currentCount = formData.files ? formData.files.length : 0;
    const newCount = newFiles.length;
    const totalCount = currentCount + newCount;
    
    const MAX_DOCUMENTS = 5; // Maksimal 5 dokumen
    
    if (totalCount > MAX_DOCUMENTS) {
      return `Maksimal ${MAX_DOCUMENTS} dokumen yang dapat diupload. Anda sudah memiliki ${currentCount} dokumen dan mencoba menambahkan ${newCount} dokumen baru.`;
    }
    
    return null;
  };

  const handleFilesChange = async (files: FileList | null) => {
    try {
      // Clean up previous previews
      filePreviewUrls.forEach(url => {
        if (url !== 'pdf') { // Skip placeholder strings
          URL.revokeObjectURL(url);
        }
      });
      setFilePreviewUrls([]);
      setIsUploading(false);
      setUploadProgress(0);

      if (!files || files.length === 0) {
        onInputChange('files', null);
        return;
      }

      // Validasi jumlah maksimum dokumen
      const maxDocumentsError = validateMaxDocuments(files);
      if (maxDocumentsError) {
        onInputChange('error', maxDocumentsError);
        return;
      }

      const fileArray = Array.from(files);
      
      console.log('Selected files:', fileArray.map(file => ({
        name: file.name,
        type: file.type,
        size: formatFileSize(file.size)
      })));

      // Validate each file
      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          onInputChange('error', error);
          onInputChange('files', null);
          return;
        }
      }

      // Validate total size
      const totalSizeError = validateTotalSize(fileArray);
      if (totalSizeError) {
        onInputChange('error', totalSizeError);
        onInputChange('files', null);
        return;
      }

      // Mulai proses upload
      setIsUploading(true);

      // Create previews for image files
      const previewUrls: string[] = [];
      for (const file of fileArray) {
        if (file.type.startsWith('image/')) {
          const previewUrl = URL.createObjectURL(file);
          previewUrls.push(previewUrl);
        } else if (file.type === 'application/pdf') {
          // For PDFs, we just add a placeholder
          previewUrls.push('pdf');
        }
        
        // Simulasi progress upload (dalam aplikasi nyata, ini akan menggunakan progress event dari fetch/axios)
        await new Promise(resolve => setTimeout(resolve, 500));
        setUploadProgress(prev => Math.min(prev + (100 / fileArray.length), 99));
      }

      setFilePreviewUrls(previewUrls);
      
      // Simulasi finalisasi upload
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadProgress(100);
      
      // Selesai upload
      setIsUploading(false);
      
      // Update form data dengan menggabungkan file yang sudah ada dengan file baru
      const existingFiles = formData.files || [];
      const combinedFiles = [...existingFiles, ...fileArray];
      onInputChange('files', combinedFiles);
      
    } catch (error) {
      console.error('Error handling files:', error);
      onInputChange('error', error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses file');
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = (index: number) => {
    if (!formData.files) return;
    
    // Create a new array without the removed file
    const newFiles = Array.from(formData.files);
    newFiles.splice(index, 1);
    
    // Revoke the URL for the removed file preview
    if (filePreviewUrls[index] && filePreviewUrls[index] !== 'pdf') {
      URL.revokeObjectURL(filePreviewUrls[index]);
    }
    
    // Update preview URLs
    const newPreviewUrls = [...filePreviewUrls];
    newPreviewUrls.splice(index, 1);
    setFilePreviewUrls(newPreviewUrls);
    
    // Update form data
    onInputChange('files', newFiles.length > 0 ? newFiles : null);
  };

  const handleSendChatMessage = (e: React.MouseEvent | React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Mencegah event bubbling ke form parent
    if (!chatInput.trim() || !onSendChatMessage || isProcessing) return;
    
    onSendChatMessage(chatInput);
    setChatInput('');
    
    // Scroll ke bawah setelah mengirim pesan
    if (chatContainerRef.current) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const renderFilePreview = () => {
    if (!formData.files || formData.files.length === 0) return null;
    
    return (
      <div className="mt-4 space-y-2">
        <div className="text-sm font-medium text-gray-700">File yang diupload:</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from(formData.files).map((file, index) => (
            <div key={index} className="relative group">
              <div className="border rounded-lg p-2 bg-gray-50 flex flex-col items-center">
                {file.type.startsWith('image/') ? (
                  <div className="w-full h-24 relative">
                    <img 
                      src={filePreviewUrls[index]} 
                      alt={file.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 flex items-center justify-center bg-gray-100 rounded">
                    {getFileIcon(file, 'lg')}
                  </div>
                )}
                <div className="mt-2 text-xs text-center truncate w-full" title={file.name}>
                  {file.name}
                </div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isProcessing || isDisabled}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render form untuk mode analisis
  const renderAnalysisForm = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="pdf_image_files" className="text-base font-medium">
              Upload File PDF atau Gambar
            </Label>
            <div className="mt-1">
              <div
                onClick={handleUploadClick}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors",
                  isDisabled || isProcessing || isUploading
                    ? "bg-gray-50 border-gray-200 cursor-not-allowed"
                    : "hover:bg-blue-50 hover:border-blue-200 border-gray-300"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="pdf_image_files"
                  name="files"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.tiff,.bmp,application/pdf,image/jpeg,image/png,image/gif,image/webp,image/tiff,image/bmp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesChange(e.target.files)}
                  disabled={isDisabled || isProcessing || isUploading}
                />
                {isUploading ? (
                  <>
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
                    <div className="text-sm text-center text-gray-600">
                      Mengupload file... {uploadProgress.toFixed(0)}%
                    </div>
                    <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mt-2">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <div className="text-sm text-center text-gray-600">
                      <span className="font-medium text-blue-600">Klik untuk upload</span> atau drag and drop
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, JPG, PNG, GIF (max. 25MB per file)
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {renderFilePreview()}

          <div>
            <Label htmlFor="pdf_image_task_type" className="text-base font-medium">
              Jenis Tugas
            </Label>
            <Select
              value={formData.task_type}
              onValueChange={(value) => onInputChange('task_type', value)}
              disabled={isDisabled || isProcessing || isUploading}
            >
              <SelectTrigger id="pdf_image_task_type" className="w-full mt-1">
                <SelectValue placeholder="Pilih jenis tugas" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="summarize">Ringkasan Dokumen</SelectItem>
                  <SelectItem value="extract">Ekstraksi Informasi</SelectItem>
                  <SelectItem value="compare">Perbandingan Dokumen</SelectItem>
                  <SelectItem value="analyze">Analisis Mendalam</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {promptTitle && (
              <p className="text-sm text-gray-500 mt-1">
                Melakukan tugas: <span className="font-medium">{promptTitle}</span>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="pdf_image_instruction" className="text-base font-medium flex items-center">
              Instruksi <span className="text-xs text-gray-500 ml-2">(Opsional)</span>
            </Label>
            <Textarea
              id="pdf_image_instruction"
              name="instruction"
              value={formData.instruction as string || ''}
              onChange={(e) => onInputChange('instruction', e.target.value)}
              placeholder="Berikan instruksi spesifik untuk analisis dokumen (opsional)..."
              className="mt-1 min-h-[100px]"
              disabled={isDisabled || isProcessing || isUploading}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={
              isProcessing || 
              isDisabled || 
              isUploading ||
              !formData.files || 
              formData.files.length === 0
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              'Analisis Dokumen'
            )}
          </Button>
          
          {onToggleChatMode && formData.files && formData.files.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={onToggleChatMode}
              disabled={isProcessing || isUploading}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Mode Tanya Jawab
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Render interface untuk mode chat
  const renderChatInterface = () => {
    if (!isChatMode) return null;
    
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)]">
        {/* Header - Lebih compact di mobile */}
        <div className="flex justify-between items-center p-2 md:p-4 border-b bg-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleChatMode}
              className="p-1 md:p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Kembali ke mode analisis"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
            </button>
            <h2 className="text-base md:text-lg font-medium">Tanya Jawab Dokumen</h2>
          </div>
          <div className="text-xs md:text-sm text-gray-500">
            {formData.files && (
              <span>{formData.files.length} dari 5 dokumen</span>
            )}
          </div>
        </div>
        
        {/* Chat Container - Memperbesar area chat */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4 bg-gray-50"
        >
          {!isDocumentProcessed ? (
            <div className="text-center text-gray-500 py-8">
              <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin opacity-20" />
              <p>Memproses dokumen untuk tanya jawab...</p>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Mulai percakapan tentang dokumen yang diupload</p>
              <div className="mt-4 text-sm">
                <p>Contoh pertanyaan:</p>
                <ul className="mt-2 space-y-1 text-left max-w-md mx-auto">
                  <li className="hover:bg-gray-100 p-1 rounded cursor-pointer" onClick={() => setChatInput("Apa isi utama dari dokumen ini?")}>👮🏼‍♂️ Apa isi utama dari dokumen ini?</li>
                  <li className="hover:bg-gray-100 p-1 rounded cursor-pointer" onClick={() => setChatInput("Ringkas dokumen ini dalam 3 poin penting")}>👌🏼 Ringkas dokumen ini dalam 3 poin penting</li>
                  <li className="hover:bg-gray-100 p-1 rounded cursor-pointer" onClick={() => setChatInput("Jelaskan bagian [X] dari dokumen")}>🕵🏼 Jelaskan bagian [X] dari dokumen</li>
                </ul>
              </div>
            </div>
          ) : (
            chatMessages.map((msg, index) => (
              <ChatMessageItem key={index} message={msg} />
            ))
          )}
        </div>
        
        {/* File Preview Sidebar - Collapsible di mobile */}
        <div className="border-t border-gray-200 bg-white">
          <div className="p-2 md:p-3 flex items-center justify-between">
            <button 
              type="button"
              onClick={() => {
                const filePreview = document.getElementById('file-preview-container');
                if (filePreview) {
                  filePreview.classList.toggle('hidden');
                }
              }}
              className="text-sm font-medium text-gray-700 flex items-center gap-1"
            >
              <span>File yang Diupload ({formData.files ? formData.files.length : 0}/5)</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down w-4 h-4">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={handleUploadClick}
              className="text-xs text-blue-600 hover:text-blue-800"
              disabled={!!(isProcessing || isUploading || (formData.files && formData.files.length >= 5))}
              title={formData.files && formData.files.length >= 5 ? "Maksimal 5 dokumen" : "Tambah file"}
            >
              {formData.files && formData.files.length >= 5 ? (
                "Maksimal 5 dokumen"
              ) : (
                "+ Tambah File"
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              id="pdf_image_files_chat"
              name="files"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.tiff,.bmp,application/pdf,image/jpeg,image/png,image/gif,image/webp,image/tiff,image/bmp"
              multiple
              className="hidden"
              onChange={(e) => handleFilesChange(e.target.files)}
              disabled={!!(isDisabled || isProcessing || isUploading || (formData.files && formData.files.length >= 5))}
            />
          </div>
          <div id="file-preview-container" className="px-2 md:px-3 pb-2 md:pb-3 gap-2 overflow-x-auto hidden md:flex">
            {formData.files && Array.from(formData.files).map((file, index) => (
              <FilePreviewItem 
                key={index} 
                file={file} 
                onRemove={() => handleRemoveFile(index)} 
                disabled={isProcessing || isUploading}
              />
            ))}
            {isUploading && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border min-w-[200px]">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <div className="text-xs text-gray-600">
                  Mengupload... {uploadProgress.toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Input Area - Lebih compact di mobile */}
        <div className="border-t p-2 md:p-3 bg-white">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs md:text-sm mb-2 md:mb-3">
              {error}
            </div>
          )}
          <form 
            onSubmit={handleSendChatMessage} 
            className="flex gap-2 items-center"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <label htmlFor="pdf_image_chat_input" className="sr-only">
              Pesan chat
            </label>
            <input
              type="text"
              id="pdf_image_chat_input"
              name="chat_input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Tanyakan tentang dokumen..."
              className="flex-1 px-3 py-2 md:px-4 md:py-3 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing || !formData.files || formData.files.length === 0 || !isDocumentProcessed}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isProcessing && chatInput.trim() && isDocumentProcessed) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSendChatMessage(e);
                }
              }}
              aria-label="Pesan chat"
            />
            <Button 
              type="button"
              onClick={handleSendChatMessage}
              disabled={isProcessing || !chatInput.trim() || !formData.files || formData.files.length === 0 || !isDocumentProcessed}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center p-0"
              aria-label="Kirim pesan"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  };

  return isChatMode ? renderChatInterface() : renderAnalysisForm();
}; 