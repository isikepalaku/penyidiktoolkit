import { useEffect, useRef, useCallback, ChangeEvent } from 'react';

interface AutosizeTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  maxRows?: number;
  id?: string;
  name?: string;
}

const AutosizeTextarea = ({
  value,
  onChange,
  placeholder,
  className = '',
  minRows = 3,
  maxRows = 8,
  id,
  name
}: AutosizeTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const calculateHeight = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      
      // Reset height to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate line height from computed styles
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
      const paddingTop = parseInt(window.getComputedStyle(textarea).paddingTop);
      const paddingBottom = parseInt(window.getComputedStyle(textarea).paddingBottom);
      
      // Calculate min and max heights
      const minHeight = lineHeight * minRows + paddingTop + paddingBottom;
      const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;
      
      // Set new height
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
      
      // Add scrollbar if content exceeds maxHeight
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [minRows, maxRows]);

  useEffect(() => {
    calculateHeight();
  }, [value, minRows, maxRows, calculateHeight]);

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    calculateHeight();
  };

  return (
    <textarea
      ref={textareaRef}
      id={id}
      name={name}
      value={value}
      onChange={handleInput}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-white transition-all 
        p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        font-sans text-base leading-relaxed placeholder-gray-400
        ${className}`}
      style={{
        minHeight: `${minRows * 24}px`, // Approximate line height
      }}
    />
  );
};

export default AutosizeTextarea;
