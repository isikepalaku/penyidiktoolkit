import React from 'react';
import type { BaseAgentFormProps } from './BaseAgentForm';

// Hilangkan agent dari destructuring karena tidak digunakan
export const ImageAgentForm: React.FC<BaseAgentFormProps & { imagePreview: string | null }> = ({
  formData,
  onInputChange,
  error,
  isProcessing,
  imagePreview
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="field-image_file" className="block text-sm font-medium text-gray-700 mb-2">
          Upload Gambar
        </label>
        <input
          id="field-image_file"
          name="image_file"
          type="file"
          accept="image/*"
          onChange={(e) => onInputChange('image_file', e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {imagePreview && (
        <div className="mt-4 relative">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full max-w-2xl h-auto rounded-lg shadow-lg"
          />
        </div>
      )}

      <div>
        <label htmlFor="field-image_description" className="block text-sm font-medium text-gray-700 mb-2">
          Deskripsi Gambar (Opsional)
        </label>
        <textarea
          id="field-image_description"
          name="image_description"
          value={(formData.image_description as string) || ''}
          onChange={(e) => onInputChange('image_description', e.target.value)}
          placeholder="Berikan deskripsi tambahan tentang gambar..."
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isProcessing}
        className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
          isProcessing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isProcessing ? 'Memproses...' : 'Analisis Gambar'}
      </button>
    </div>
  );
};

export default ImageAgentForm;