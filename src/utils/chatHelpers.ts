/**
 * Utility functions untuk chat components
 */

/**
 * Scroll container ke bottom dengan smooth animation
 * @param containerRef - Ref ke container yang akan di-scroll
 */
export const scrollToBottom = (containerRef: React.RefObject<HTMLElement>) => {
  try {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    });
  } catch (error) {
    console.error('Error scrolling to bottom:', error);
  }
};

/**
 * Handle perubahan tinggi textarea secara dinamis
 * @param textarea - HTML textarea element
 * @param value - Nilai text area
 */
export const adjustTextareaHeight = (textarea: HTMLTextAreaElement, value: string) => {
  textarea.style.height = 'auto'; // Reset height to recalculate
  textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
};

/**
 * Focus textarea dengan delay untuk menghindari masalah timing
 * @param textareaRef - Ref ke textarea element
 * @param delay - Delay dalam ms (default: 500)
 */
export const focusTextareaWithDelay = (
  textareaRef: React.RefObject<HTMLTextAreaElement>, 
  delay: number = 500
) => {
  setTimeout(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, delay);
};

/**
 * Copy text ke clipboard dan handle success state
 * @param text - Text yang akan dicopy
 * @param setCopied - State setter untuk copied state
 */
export const copyToClipboard = (
  text: string, 
  setCopied: (value: string | null) => void
) => {
  navigator.clipboard.writeText(text);
  setCopied(text);
  setTimeout(() => setCopied(null), 2000);
};

/**
 * Generate error message yang lebih user-friendly
 * @param error - Error object
 * @returns User-friendly error message
 */
export const getErrorMessage = (error: any): string => {
  if (!navigator.onLine) {
    return 'Perangkat Anda sedang offline. Silakan periksa koneksi internet dan coba lagi.';
  }
  
  if (error.message) {
    // Jika error spesifik tentang ukuran file
    if (error.message.includes('File terlalu besar')) {
      return 'File terlalu besar. Harap gunakan file dengan ukuran lebih kecil (maksimal 50MB).';
    }
    
    // Jika error timeout
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return 'Permintaan timeout. File mungkin terlalu besar atau koneksi terlalu lambat.';
    }
    
    // Jika error spesifik tentang rate limit
    if (error.message.includes('Terlalu banyak permintaan') || error.message.includes('429')) {
      return 'rate_limit_error';
    }
    
    // Jika ada pesan error spesifik lainnya, tampilkan
    return error.message;
  }
  
  // Default error message for rate limit
  return 'rate_limit_error';
}; 