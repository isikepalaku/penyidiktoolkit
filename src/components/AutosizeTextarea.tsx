import React from 'react';

export interface AutosizeTextareaProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  className?: string;
  disabled?: boolean;
}

const AutosizeTextarea: React.FC<AutosizeTextareaProps> = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  minRows = 3,
  maxRows = 12,
  className = '',
  disabled = false
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate line height from computed styles
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseInt(computedStyle.lineHeight);
    
    // Calculate min and max heights
    const minHeight = minRows * lineHeight;
    const maxHeight = maxRows * lineHeight;

    // Set new height based on content
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={textareaRef}
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      style={{
        resize: 'none',
        overflow: 'auto',
        minHeight: `${minRows * 1.5}em`,
        maxHeight: `${maxRows * 1.5}em`,
      }}
    />
  );
};

export default AutosizeTextarea;
