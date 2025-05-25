import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Custom renderer untuk link agar selalu dibuka di tab baru
const renderer = new marked.Renderer();
renderer.link = function(href, title, text) {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

// Konfigurasi marked untuk parsing markdown
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
  renderer: renderer
});

// Konfigurasi DOMPurify untuk safe link handling
DOMPurify.setConfig({
  ADD_TAGS: ['a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code'],
  ADD_ATTR: ['target', 'rel', 'class', 'id', 'href', 'title'],
  FORBID_TAGS: ['style', 'script'],
  FORBID_ATTR: ['style', 'onerror', 'onload']
});

/**
 * Memproses HTML untuk memastikan semua link dibuka di tab baru
 * @param html - String HTML yang akan diproses
 * @returns String HTML dengan link yang sudah dimodifikasi
 */
const processLinksForNewTab = (html: string): string => {
  // Regex untuk menangkap semua tag <a> yang belum memiliki target="_blank"
  return html.replace(/<a\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>/gi, (match, beforeHref, href, afterHref) => {
    // Cek apakah sudah ada target="_blank"
    if (match.includes('target=')) {
      return match;
    }
    
    // Tambahkan target="_blank" dan rel="noopener noreferrer"
    return `<a ${beforeHref}href="${href}"${afterHref} target="_blank" rel="noopener noreferrer">`;
  });
};

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
    let sanitizedHtml = DOMPurify.sanitize(rawHtml);
    
    // Pastikan semua link dibuka di tab baru
    sanitizedHtml = processLinksForNewTab(sanitizedHtml);
    
    return sanitizedHtml;
  } catch (error) {
    console.error('Error formatting message:', error);
    return 'Error formatting message.';
  }
}; 