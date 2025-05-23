import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Konfigurasi marked untuk parsing markdown
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

// Konfigurasi DOMPurify untuk safe link handling
DOMPurify.setConfig({
  ADD_TAGS: ['a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code'],
  ADD_ATTR: ['target', 'rel', 'class', 'id'],
  FORBID_TAGS: ['style', 'script'],
  FORBID_ATTR: ['style', 'onerror', 'onload']
});

/**
 * Format message content dari markdown ke HTML yang aman
 * @param content - String markdown yang akan diformat
 * @returns String HTML yang sudah disanitasi
 */
export const formatMessage = (content: string): string => {
  try {
    // Pastikan content ada dan bukan string kosong
    if (!content) return '';
    
    // Preprocessor sederhana: hanya ganti karakter newline
    // Terlalu banyak preprocessing bisa mengubah format asli
    let processedContent = content.replace(/\\n/g, '\n');
    
    // Parse markdown menjadi HTML
    const rawHtml = marked.parse(processedContent);
    
    // Sanitasi HTML untuk mencegah XSS
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    
    return sanitizedHtml;
  } catch (error) {
    console.error('Error formatting message:', error);
    return 'Error formatting message.';
  }
}; 