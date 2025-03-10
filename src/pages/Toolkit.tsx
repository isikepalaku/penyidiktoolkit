import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { processAudioTranscript } from '../services/audioTranscriptService';
import { submitMapsGeocoding } from '../services/mapsGeocodingService';
import { processPdfImage, sendChatMessage as sendPdfImageChatMessage, clearChatHistory, initializeSession } from '../services/pdfImageService';
import { mapsGeocodingAgent } from '../data/agents/mapsGeocodingAgent';
import { pdfImageAgent } from '../data/agents/pdfImageAgent';
import { AudioAgentForm } from '@/components/agent-forms/AudioAgentForm';
import { GeminiImageForm } from '@/components/agent-forms/GeminiImageForm';
import { PdfImageAnalysisForm } from '@/components/agent-forms/PdfImageAnalysisForm';
import ResultArtifact, { Citation } from '@/components/ResultArtifact';
import type { FormDataValue, FormData } from '@/types';
import type { AudioFormData } from '@/types/audio';
import type { PdfImageFormData, ChatMessage } from '@/types/pdfImage';
import type { AudioPromptType } from '@/data/agents/audioAgent';
import type { PdfImagePromptType } from '@/data/agents/pdfImageAgent';
import { geminiImageAgent } from '../data/agents/geminiImageAgent';
import { BaseAgentForm } from '@/components/agent-forms/BaseAgentForm';
import { DotBackground } from '@/components/ui/DotBackground';

type ToolType = {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
};

const toolTypes: ToolType[] = [
  {
    id: 'transcript',
    name: 'Analisis Audio',
    description: 'Melakukan Transkripsi audio menjadi teks dan sentimen analisis audio dengan teknologi AI',
    icon: <div className="h-10 w-10"><img src="/img/waveform-icon.svg" className="h-10 w-10" alt="extract audio" /></div>
  },
  {
    id: geminiImageAgent.id,
    name: geminiImageAgent.name,
    description: geminiImageAgent.description,
    icon: <div className="h-10 w-10"><img src="/img/google-gemini-icon.svg" className="h-10 w-10" alt="Extract image" /></div>
  },
  {
    id: 'maps-agent',
    name: 'Maps Geocoding',
    description: 'Menggali informasi dari bisnis dan lokasi dengan Maps Geocoding API (BETA)',
    icon: <div className="h-10 w-10"><img src="/img/google-color-icon.svg" className="h-10 w-10" alt="Maps geocoding" /></div>
  },
  {
    id: pdfImageAgent.id,
    name: pdfImageAgent.name,
    description: pdfImageAgent.description,
    icon: <div className="h-10 w-10"><img src="/img/fact-file-color-icon.svg" className="h-10 w-10" alt="PDF and Image Analysis" /></div>
  }
];

export default function Toolkit() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [audioFormData, setAudioFormData] = useState<AudioFormData>({
    audio_file: null,
    task_type: 'transcribe'
  });
  const [imageFormData, setImageFormData] = useState({
    image_file: null as File | null,
    image_description: '',
    prompt_type: 'default' as const
  });
  const [pdfImageFormData, setPdfImageFormData] = useState<PdfImageFormData>({
    files: null,
    task_type: 'summarize',
    instruction: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[] | undefined>(undefined);
  const [mapsGeocodingFormData, setMapsGeocodingFormData] = useState<FormData>({
    message: ''
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatMode, setIsChatMode] = useState(false);

  // Inisialisasi session saat komponen dimount jika ada file yang diupload
  useEffect(() => {
    if (selectedTool === pdfImageAgent.id && pdfImageFormData.files && pdfImageFormData.files.length > 0) {
      console.log('Initializing session on component mount');
      initializeSession();
    }
  }, [selectedTool, pdfImageFormData.files]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setCitations(undefined);

    try {
      if (selectedTool === 'transcript' && audioFormData.audio_file) {
        const response = await processAudioTranscript({
          audio: audioFormData.audio_file,
          task_type: audioFormData.task_type as AudioPromptType
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to process audio');
        }

        setResult(response.text);
      } else if (selectedTool === geminiImageAgent.id && imageFormData.image_file) {
        // Untuk GeminiImageForm, kita tidak perlu melakukan apa-apa di sini
        // karena form akan menangani sendiri pemanggilan API dan menampilkan hasil
        console.log('GeminiImageForm will handle the API call');
      } else if (selectedTool === 'maps-agent' && mapsGeocodingFormData.message && typeof mapsGeocodingFormData.message === 'string') {
        const text = await submitMapsGeocoding(mapsGeocodingFormData.message);
        setResult(text);
      } else if (selectedTool === pdfImageAgent.id && pdfImageFormData.files && !isChatMode) {
        // Pastikan session diinisialisasi sebelum memproses file
        initializeSession();
        
        const response = await processPdfImage({
          files: Array.from(pdfImageFormData.files),
          task_type: pdfImageFormData.task_type as PdfImagePromptType,
          instruction: pdfImageFormData.instruction as string
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to process PDF/Image');
        }

        setResult(response.text);
        
        // Simpan citations jika ada
        if (response.citations) {
          setCitations(response.citations);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (fieldId: string, value: FormDataValue) => {
    if (fieldId === 'error') {
      setError(value as string);
      return;
    }

    if (selectedTool === 'transcript') {
      setAudioFormData(prev => ({
        ...prev,
        [fieldId]: value
      }));
    } else if (selectedTool === 'maps-agent') {
      setMapsGeocodingFormData(prev => ({
        ...prev,
        [fieldId]: value
      }));
    } else if (selectedTool === geminiImageAgent.id) {
      if (fieldId === 'image_file' && value instanceof File) {
        const previewUrl = URL.createObjectURL(value);
        setImagePreview(previewUrl);
      }
      setImageFormData(prev => ({
        ...prev,
        [fieldId]: value
      }));
    } else if (selectedTool === pdfImageAgent.id) {
      // Inisialisasi session saat file diupload
      if (fieldId === 'files' && value instanceof Array && value.length > 0) {
        console.log('Initializing session on file upload');
        initializeSession();
      }
      
      // Simpan file dalam state
      setPdfImageFormData(prev => ({
        ...prev,
        [fieldId]: value
      }));
    }
  };

  const handleSendChatMessage = async (message: string) => {
    if (!message.trim() || isProcessing) return;
    
    // Pastikan session diinisialisasi sebelum mengirim pesan
    initializeSession();
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    
    setIsProcessing(true);
    try {
      // Send message to API
      const response = await sendPdfImageChatMessage(message);
      
      // Add assistant response to chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Maaf, terjadi kesalahan saat memproses pesan Anda.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleChatMode = () => {
    // Pastikan dokumen sudah diproses sebelum beralih ke mode chat
    if (!isChatMode && pdfImageFormData.files && pdfImageFormData.files.length > 0) {
      // Jika belum ada hasil, proses dokumen terlebih dahulu
      if (!result) {
        // Gunakan task_type default jika belum dipilih
        const taskType = pdfImageFormData.task_type || 'summarize';
        
        // Proses dokumen secara otomatis dengan instruksi default
        setIsProcessing(true);
        processPdfImage({
          files: Array.from(pdfImageFormData.files),
          task_type: taskType as PdfImagePromptType,
          instruction: 'Analisis dokumen ini untuk persiapan tanya jawab.'
        })
          .then(response => {
            if (!response.success) {
              console.warn('Document processing warning:', response.error);
              // Tetap beralih ke mode chat meskipun ada warning
              setIsChatMode(true);
              setResult(null);
              // Tampilkan pesan error sebagai pesan chat pertama
              setChatMessages([
                {
                  role: 'assistant',
                  content: `⚠️ Peringatan: ${response.error || 'Terjadi masalah saat memproses dokumen.'}\n\nAnda tetap dapat menggunakan mode tanya jawab, tetapi mungkin akan ada keterbatasan dalam kemampuan menjawab pertanyaan tentang dokumen.`
                }
              ]);
            } else {
              console.log('Document processed successfully for chat mode');
              // Setelah dokumen diproses, beralih ke mode chat
              setIsChatMode(true);
              setResult(null);
            }
          })
          .catch(err => {
            console.error('Document processing error:', err);
            // Tetap beralih ke mode chat meskipun ada error
            setIsChatMode(true);
            setResult(null);
            // Tampilkan pesan error sebagai pesan chat pertama
            setChatMessages([
              {
                role: 'assistant',
                content: `❌ Error: ${err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses dokumen.'}\n\nAnda tetap dapat menggunakan mode tanya jawab, tetapi mungkin akan ada keterbatasan dalam kemampuan menjawab pertanyaan tentang dokumen.`
              }
            ]);
          })
          .finally(() => {
            setIsProcessing(false);
          });
      } else {
        // Jika sudah ada hasil, langsung beralih ke mode chat
        setIsChatMode(true);
        setResult(null);
      }
    } else {
      // Beralih kembali ke mode analisis
      setIsChatMode(false);
    }
    
    // Inisialisasi session
    initializeSession();
  };

  const selectedToolData = toolTypes.find(tool => tool.id === selectedTool);

  if (selectedTool && selectedToolData) {
    return (
      <DotBackground className="min-h-screen">
        <div className="p-6 lg:p-8">
          <header className="mb-8">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTool(null);
                    setAudioFormData({
                      audio_file: null,
                      task_type: 'transcribe'
                    });
                    setImageFormData({
                      image_file: null,
                      image_description: '',
                      prompt_type: 'default'
                    });
                    setPdfImageFormData({
                      files: null,
                      task_type: 'summarize',
                      instruction: ''
                    });
                    setImagePreview(null);
                    setResult(null);
                    setError(null);
                    setCitations(undefined);
                    setMapsGeocodingFormData({ message: '' });
                    setChatMessages([]);
                    setIsChatMode(false);
                    clearChatHistory();
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-7">{selectedToolData.name}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedToolData.description}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {selectedTool === 'transcript' ? (
                <AudioAgentForm
                  formData={audioFormData}
                  onInputChange={handleInputChange}
                  error={error}
                  isProcessing={isProcessing}
                  isDisabled={!!result}
                />
              ) : selectedTool === geminiImageAgent.id ? (
                <GeminiImageForm
                  agent={geminiImageAgent}
                  formData={imageFormData}
                  onInputChange={handleInputChange}
                  error={error}
                  isProcessing={isProcessing}
                  imagePreview={imagePreview}
                  onSubmit={handleSubmit}
                  onResult={(result) => {
                    setResult(result);
                    setIsProcessing(false);
                  }}
                />
              ) : selectedTool === 'maps-agent' ? (
                <BaseAgentForm
                  agent={mapsGeocodingAgent}
                  formData={mapsGeocodingFormData}
                  onInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                  error={error}
                  isProcessing={isProcessing}
                  isDisabled={!!result}
                />
              ) : selectedTool === pdfImageAgent.id ? (
                <PdfImageAnalysisForm
                  formData={pdfImageFormData}
                  onInputChange={handleInputChange}
                  error={error}
                  isProcessing={isProcessing}
                  isDisabled={!!result}
                  chatMessages={chatMessages}
                  onSendChatMessage={handleSendChatMessage}
                  isChatMode={isChatMode}
                  onToggleChatMode={handleToggleChatMode}
                />
              ) : null}
            </form>
          </div>

          {result && (
            <ResultArtifact 
              content={result}
              citations={citations}
              onClose={() => {
                setResult(null);
                setCitations(undefined);
                setMapsGeocodingFormData({ message: '' });
              }}
            />
          )}
        </div>
      </DotBackground>
    );
  }

  return (
    <DotBackground className="min-h-screen">
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Toolkit
              </h1>
            </div>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 ml-11">
              Kumpulan alat bantu untuk investigasi Anda
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {toolTypes.map(tool => (
              <div 
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all cursor-pointer border border-gray-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        {tool.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{tool.name}</h3>
                    </div>
                    <p className="text-gray-600">{tool.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DotBackground>
  );
}
