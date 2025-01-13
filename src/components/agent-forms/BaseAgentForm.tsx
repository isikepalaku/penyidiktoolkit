import React from 'react';
import type { ExtendedAgent, FormData } from '../../types';
import AutosizeTextarea from '../AutosizeTextarea';

export interface BaseAgentFormProps {
  agent: ExtendedAgent;
  formData: FormData;
  onInputChange: (fieldId: string, value: string | File | null) => void;
  error?: string | null;
  isProcessing: boolean;
}

export const BaseAgentForm: React.FC<BaseAgentFormProps> = ({
  agent,
  formData,
  onInputChange,
  error,
  isProcessing
}) => {
  return (
    <div className="space-y-6">
      {agent.fields.map((field) => (
        <div key={field.id}>
          <label htmlFor={`field-${field.id}`} className="block text-sm font-medium text-gray-700 mb-2">
            {field.label}
          </label>
          {field.type === 'textarea' ? (
            <AutosizeTextarea
              id={`field-${field.id}`}
              name={field.id}
              value={(formData[field.id] as string) || ''}
              onChange={(value) => onInputChange(field.id, value)}
              placeholder={field.placeholder}
              minRows={3}
              maxRows={12}
              className="shadow-sm"
            />
          ) : (
            <input
              id={`field-${field.id}`}
              name={field.id}
              type="text"
              value={(formData[field.id] as string) || ''}
              onChange={(e) => onInputChange(field.id, e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={field.placeholder}
            />
          )}
        </div>
      ))}

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
        {isProcessing ? 'Memproses...' : 'Analisis'}
      </button>
    </div>
  );
};

export default BaseAgentForm;