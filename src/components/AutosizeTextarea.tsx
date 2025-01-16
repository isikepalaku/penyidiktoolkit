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
      
      // Calculate min height only (remove maxHeight constraint initially)
      const minHeight = lineHeight * minRows + paddingTop + paddingBottom;
      
      // Set initial height to minHeight or scrollHeight, whichever is larger
      let newHeight = Math.max(textarea.scrollHeight, minHeight);
      
      // Only apply maxHeight constraint if content exceeds minRows
      if (value.length > 0) {
        const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;
        newHeight = Math.min(newHeight, maxHeight);
      }
      
      textarea.style.height = `${newHeight}px`;
      
      // Add scrollbar only if content exceeds current height
      textarea.style.overflowY = textarea.scrollHeight > newHeight ? 'auto' : 'hidden';
      textarea.style.overflowX = 'hidden'; // Prevent horizontal scroll
    }
  }, [minRows, maxRows, value]);

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
      className={`w-full max-w-full resize-none bg-white transition-all 
        p-3 md:p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        text-sm md:text-base leading-relaxed placeholder-gray-400 box-border
        ${className}`}
      style={{
        minHeight: `${minRows * 24}px`, // Approximate line height
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap'
      }}
    />
  );
};

export default AutosizeTextarea;