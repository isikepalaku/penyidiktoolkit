import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Konfigurasi marked dan DOMPurify for safe link handling
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

DOMPurify.setConfig({
  ADD_TAGS: ['a'],
  ADD_ATTR: ['target', 'rel', 'class'],
  FORBID_TAGS: ['style', 'script'],
  FORBID_ATTR: ['style', 'onerror', 'onload']
});

/**
 * Helper function untuk format message dengan markdown parsing dan sanitization
 * @param content - Content string yang akan diformat
 * @returns Sanitized HTML string
 */
export const formatMessage = (content: string): string => {
  try {
    // Pastikan content ada dan bukan string kosong
    if (!content) return '';
    
    // Parse markdown menjadi HTML
    const rawHtml = marked.parse(content);
    
    // Sanitasi HTML untuk mencegah XSS
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    
    return sanitizedHtml;
  } catch (error) {
    console.error('Error formatting message:', error);
    return 'Error formatting message.';
  }
}; 