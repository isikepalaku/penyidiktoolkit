import React from 'react';
import type { BaseAgentFormProps } from './BaseAgentForm';
import { imagePrompts } from '../../data/agents/imageAgent';
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
import { FileImage, Microscope } from "lucide-react";

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

export const ImageAgentForm: React.FC<BaseAgentFormProps & { 
  imagePreview: string | null 
}> = ({
  formData,
  onInputChange,
  error,
  isProcessing,
  imagePreview
}) => {
  return (
    <div className="space-y-6">
      {/* Prompt Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="prompt-type">Jenis Analisis</Label>
        <Select 
          value={(formData.prompt_type as string) || 'default'}
          onValueChange={(value) => onInputChange('prompt_type', value as keyof typeof imagePrompts)}
        >
          <SelectTrigger className="ps-2 [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span_[data-square]]:shrink-0">
            <SelectValue placeholder="Pilih jenis analisis" />
          </SelectTrigger>
          <SelectContent className="[&_*[role=option]>span]:end-2 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:flex [&_*[role=option]>span]:items-center [&_*[role=option]>span]:gap-2 [&_*[role=option]]:pe-8 [&_*[role=option]]:ps-2">
            <SelectGroup>
              <SelectItem value="default">
                <Square className="bg-blue-400/20 text-blue-500">
                  <FileImage className="h-3 w-3" />
                </Square>
                <span className="truncate">Analisis Standar</span>
              </SelectItem>
              <SelectItem value="forensic">
                <Square className="bg-purple-400/20 text-purple-500">
                  <Microscope className="h-3 w-3" />
                </Square>
                <span className="truncate">Analisis Forensik</span>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Image Upload */}
      <div>
        <Label htmlFor="field-image_file">Upload Gambar</Label>
        <input
          id="field-image_file"
          name="image_file"
          type="file"
          accept="image/*"
          onChange={(e) => onInputChange('image_file', e.target.files?.[0] || null)}
          className="mt-2 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="mt-4 relative">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full max-w-2xl h-auto rounded-lg shadow-lg"
          />
        </div>
      )}

      {/* Description Textarea */}
      <div>
        <Label htmlFor="field-image_description">Deskripsi Gambar (Opsional)</Label>
        <textarea
          id="field-image_description"
          name="image_description"
          value={(formData.image_description as string) || ''}
          onChange={(e) => onInputChange('image_description', e.target.value)}
          placeholder="Berikan deskripsi tambahan tentang gambar..."
          className="mt-2 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing || !formData.image_file}
        className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
          isProcessing || !formData.image_file
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isProcessing ? 'Memproses...' : 'Analisis Gambar'}
      </button>
    </div>
  );
};

export default ImageAgentForm;