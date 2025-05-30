import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Konfigurasi marked dengan opsi yang lebih baik
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

/**
 * Preprocessing untuk memperbaiki format markdown yang bermasalah
 */
const preprocessMarkdown = (content: string): string => {
  if (!content) return '';
  
  let processed = content;
  
  // 1. Convert escaped newlines menjadi newlines yang benar
  processed = processed.replace(/\\n/g, '\n');
  
  // 2. Perbaiki heading dengan format aneh seperti "# #" menjadi "##"
  processed = processed.replace(/^# # /gm, '## ');
  processed = processed.replace(/^# # #/gm, '### ');
  processed = processed.replace(/^# # # #/gm, '#### ');
  
  // 3. Perbaiki heading yang mungkin tidak terparsing
  processed = processed.replace(/^###\s+/gm, '### ');
  processed = processed.replace(/^##\s+/gm, '## ');
  processed = processed.replace(/^#\s+/gm, '# ');
  
  // 4. Perbaiki list items yang BENAR-BENAR dimulai dengan * atau -
  // Hanya target baris yang memang dimulai dengan list markers
  processed = processed.replace(/^(\s*)\*\s{2,}/gm, '$1* ');
  processed = processed.replace(/^(\s*)-\s{2,}/gm, '$1- ');
  
  // 5. Perbaiki nested list items dengan indentasi yang benar
  // Hanya untuk baris yang benar-benar list items
  processed = processed.replace(/^(\s{2,})\*\s+/gm, (match, indent) => {
    // Normalisasi indentasi ke kelipatan 2
    const normalizedIndent = '  '.repeat(Math.floor(indent.length / 2));
    return `${normalizedIndent}* `;
  });
  
  // 6. JANGAN bersihkan whitespace di awal baris secara global
  // Hanya bersihkan untuk baris yang bukan list, heading, atau code
  processed = processed.split('\n').map(line => {
    // Jika baris adalah list item, heading, atau code block, biarkan
    if (line.match(/^\s*[\*\-]/) || line.match(/^\s*#/) || line.match(/^\s{4,}/)) {
      return line;
    }
    // Untuk baris biasa, bersihkan leading whitespace yang berlebihan
    return line.replace(/^[ \t]+/, '');
  }).join('\n');
  
  // 7. Perbaiki bold text yang tidak terparsing
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '**$1**');
  
  // 8. Ensure proper spacing around headings
  processed = processed.replace(/\n(#{1,6})/g, '\n\n$1');
  processed = processed.replace(/(#{1,6}[^\n]*)\n(?!\n)/g, '$1\n\n');
  
  // 9. Fix multiple consecutive newlines
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // 10. HANYA perbaiki list formatting untuk baris yang benar-benar list
  processed = processed.replace(/\n(\*\s{2,})/g, '\n* ');
  processed = processed.replace(/\n(-\s{2,})/g, '\n- ');
  
  // 11. Fix horizontal rules
  processed = processed.replace(/^---\s*$/gm, '\n---\n');
  
  // 12. Normalisasi line endings
  processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // 13. Remove trailing whitespace dari setiap line
  processed = processed.split('\n').map(line => line.trimEnd()).join('\n');
  
  return processed.trim();
};

/**
 * Post-processing untuk memperbaiki HTML output
 */
const postprocessHTML = (html: string): string => {
  if (!html) return '';
  
  let processed = html;
  
  // 1. Pastikan paragraf kosong dihapus
  processed = processed.replace(/<p>\s*<\/p>/g, '');
  
  // 2. Perbaiki spacing dalam list
  processed = processed.replace(/<li>\s*\*\s*/g, '<li>');
  
  // 3. Perbaiki bold text yang mungkin tidak terparsing
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // 4. Pastikan heading memiliki spacing yang baik
  processed = processed.replace(/(<\/h[1-6]>)(?!<)/g, '$1\n');
  
  return processed;
};

/**
 * Format message content dari markdown ke HTML yang aman
 * @param content - Konten markdown yang akan diformat
 * @returns HTML string yang sudah disanitasi
 */
export const formatMessage = (content: string): string => {
  try {
    if (!content || typeof content !== 'string') {
      return '';
    }
    
    // Preprocessing untuk memperbaiki format markdown
    const preprocessed = preprocessMarkdown(content);
    
    // Convert markdown to HTML
    const html = marked.parse(preprocessed);
    
    // Post-processing untuk memperbaiki HTML
    const postprocessed = postprocessHTML(html);
    
    // Sanitize HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(postprocessed, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'a', 'img', 'hr', 'div', 'span'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id']
    });
    
    return sanitizedHtml;
  } catch (error) {
    console.error('Error formatting message:', error);
    
    // Fallback: basic HTML escape dan newline conversion
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
  }
};

/**
 * CSS classes untuk styling prose content dengan table support
 */
export const getProseClasses = (theme: 'default' | 'amber' | 'red' | 'blue' | 'purple' = 'default') => {
  const baseClasses = `prose prose-sm max-w-none break-words 
    font-sans font-normal
    prose-headings:font-semibold prose-headings:my-3 prose-headings:leading-tight prose-headings:font-sans
    prose-p:text-gray-700 prose-p:my-2 prose-p:leading-relaxed prose-p:font-sans
    prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-pre:rounded prose-pre:p-3 prose-pre:overflow-x-auto prose-pre:font-mono
    prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono
    prose-li:text-gray-700 prose-li:marker:text-gray-500 prose-li:my-1 prose-li:leading-relaxed prose-li:font-sans
    prose-strong:text-gray-900 prose-strong:font-semibold prose-strong:font-sans prose-em:text-gray-700
    prose-ul:my-2 prose-ol:my-2 prose-ul:pl-5 prose-ol:pl-5
    prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:font-sans
    prose-hr:border-gray-300 prose-hr:my-4
    [&_p]:!my-2 [&_br]:leading-none
    [&_h1+p]:!mt-2 [&_h2+p]:!mt-2 [&_h3+p]:!mt-2
    [&_ul>li]:!my-1 [&_ol>li]:!my-1
    [&_ol]:font-variant-numeric-normal [&_ol]:tabular-nums
    [&_ul]:font-variant-numeric-normal [&_ul]:tabular-nums
    [&]:font-variant-numeric-normal [&]:tabular-nums
    [&_*]:font-variant-numeric-normal`;

  const themeClasses = {
    default: 'prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline',
    amber: 'prose-headings:text-amber-800 prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline',
    red: 'prose-headings:text-red-800 prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline',
    blue: 'prose-headings:text-blue-800 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline',
    purple: 'prose-headings:text-purple-800 prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline'
  };

  const tableClasses = `
    [&_table]:border-collapse [&_table]:my-4 [&_table]:w-full [&_table]:min-w-[500px] [&_table]:text-sm [&_table]:bg-white [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:shadow-sm [&_table]:font-sans
    [&_th]:bg-gray-50 [&_th]:p-3 [&_th]:border [&_th]:border-gray-200 [&_th]:font-semibold [&_th]:text-left [&_th]:text-gray-800 [&_th]:whitespace-nowrap [&_th]:max-w-[200px] [&_th]:font-sans
    [&_td]:p-3 [&_td]:border [&_td]:border-gray-100 [&_td]:align-top [&_td]:leading-relaxed [&_td]:break-words [&_td]:hyphens-auto [&_td]:font-sans
    [&_td:first-child]:font-medium [&_td:first-child]:bg-gray-50/50 [&_td:first-child]:whitespace-nowrap [&_td:first-child]:min-w-[120px] [&_td:first-child]:max-w-[180px]
    [&_td:last-child]:w-auto [&_td:last-child]:max-w-[350px]
    [&_tr:hover]:bg-gray-50/30`;

  return `${baseClasses} ${themeClasses[theme]} ${tableClasses}`;
};

/**
 * Wrapper component untuk responsive table handling
 */
export const createTableWrapper = (content: string) => {
  const hasTable = content.includes('<table');
  
  if (hasTable) {
    return `<div class="overflow-x-auto -mx-1 my-3">${content}</div>`;
  }
  
  return content;
}; 