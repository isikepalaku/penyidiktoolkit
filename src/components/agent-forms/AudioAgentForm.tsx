import React from 'react';
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
import { FileAudio, BarChart2 } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const Square = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span
    data-square
    className={cn(
      "flex size-5 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground",
      className,
    )}
    aria-hidden="true"
  >
    {children}
  </span>
);

type AudioAgentFormProps = Omit<BaseAgentFormProps, 'agent'>;

export const AudioAgentForm: React.FC<AudioAgentFormProps> = ({
  formData,
  onInputChange,
  error,
  isProcessing,
  isDisabled
}) => {
  const [audioPreview, setAudioPreview] = React.useState<string | null>(null);
  const [isCaptchaVerified, setIsCaptchaVerified] = React.useState(false);
  const recaptchaRef = React.useRef<ReCAPTCHA>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File terlalu besar. Maksimal ukuran file adalah ${formatFileSize(MAX_FILE_SIZE)}`;
    }

    const validTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg'];
    if (!validTypes.includes(file.type)) {
      return 'Format file tidak didukung. Gunakan MP3, WAV, atau M4A';
    }

    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const handleFileChange = async (file: File | null) => {
    try {
      // Clean up previous preview
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview);
        setAudioPreview(null);
      }

      if (!file) {
        onInputChange('audio_file', null);
        return;
      }

      // Validate file
      const error = validateFile(file);
      if (error) {
        onInputChange('error', error);
        onInputChange('audio_file', null);
        return;
      }

      // Create new preview safely
      const previewUrl = URL.createObjectURL(file);
      
      // Test if audio can be loaded
      const audio = new Audio(previewUrl);
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve;
        audio.onerror = () => reject(new Error('File audio tidak dapat diputar'));
        
        // Set timeout for loading
        setTimeout(() => reject(new Error('Timeout saat memuat file audio')), 5000);
      });

      setAudioPreview(previewUrl);
      onInputChange('audio_file', file);
      onInputChange('error', null);

    } catch (err) {
      console.error('Error handling audio file:', err);
      onInputChange('error', err instanceof Error ? err.message : 'Gagal memproses file audio');
      onInputChange('audio_file', null);
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview);
        setAudioPreview(null);
      }
    }
  };

  const handleCaptchaChange = (token: string | null) => {
    setIsCaptchaVerified(!!token);
  };

  const handleExpired = () => {
    setIsCaptchaVerified(false);
  };

  React.useEffect(() => {
    // Cleanup preview URL when component unmounts
    return () => {
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview);
      }
    };
  }, [audioPreview]);

  return (
    <div className="space-y-6">
      {/* Audio Upload */}
      <div>
        <Label htmlFor="field-audio_file">Upload Audio</Label>
        <input
          id="field-audio_file"
          name="audio_file"
          type="file"
          accept="audio/mp3,audio/wav,audio/m4a"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          disabled={isDisabled || isProcessing}
          className={cn(
            "mt-2 block w-full text-sm text-gray-500",
            "file:mr-4 file:py-2 file:px-4",
            "file:rounded-md file:border-0",
            "file:text-sm file:font-semibold",
            "file:bg-blue-50 file:text-blue-700",
            "hover:file:bg-blue-100",
            isDisabled && "opacity-50 cursor-not-allowed"
          )}
        />
        <p className="mt-1 text-sm text-gray-500">
          Maksimal ukuran file: {formatFileSize(MAX_FILE_SIZE)}. Format yang didukung: MP3, WAV, M4A
        </p>
      </div>

      {/* Audio Preview */}
      {audioPreview && (
        <div className="mt-4">
          <audio 
            ref={audioRef}
            controls 
            src={audioPreview}
            className="w-full max-w-2xl"
            onError={() => {
              onInputChange('error', 'Gagal memutar file audio');
              if (audioPreview) {
                URL.revokeObjectURL(audioPreview);
                setAudioPreview(null);
              }
            }}
          >
            Browser Anda tidak mendukung pemutaran audio.
          </audio>
        </div>
      )}

      {/* Task Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="task-type-select">Jenis Tugas</Label>
        <Select 
          value={(formData.task_type as string) || 'transcribe'}
          onValueChange={(value) => onInputChange('task_type', value)}
          disabled={isDisabled || isProcessing}
        >
          <SelectTrigger 
            id="task-type-select"
            className={cn(
              "ps-2 [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span_[data-square]]:shrink-0",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <SelectValue placeholder="Pilih jenis tugas" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="transcribe">
                <Square className="bg-blue-400/20 text-blue-500">
                  <FileAudio className="h-3 w-3" />
                </Square>
                <span className="truncate">Transkripsi Audio</span>
              </SelectItem>
              <SelectItem value="sentiment">
                <Square className="bg-purple-400/20 text-purple-500">
                  <BarChart2 className="h-3 w-3" />
                </Square>
                <span className="truncate">Analisis Sentimen</span>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* ReCAPTCHA */}
      {formData.audio_file && !isDisabled && (
        <div className="flex justify-center">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={RECAPTCHA_SITE_KEY || ''}
            onChange={handleCaptchaChange}
            onExpired={handleExpired}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing || isDisabled || !formData.audio_file || !isCaptchaVerified}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium",
          (isProcessing || isDisabled || !isCaptchaVerified)
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700",
          isDisabled && "opacity-50"
        )}
      >
        {isProcessing ? (
          <>
            <span className="animate-spin">⏳</span>
            Memproses...
          </>
        ) : (
          'Proses Audio'
        )}
      </button>
    </div>
  );
};

export default AudioAgentForm;