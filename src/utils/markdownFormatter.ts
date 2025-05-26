import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Konfigurasi marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Format message content dari markdown ke HTML yang aman
 * @param content - Konten markdown yang akan diformat
 * @returns HTML string yang sudah disanitasi
 */
export const formatMessage = (content: string): string => {
  try {
    // Convert markdown to HTML
    const html = marked(content);
    
    // Sanitize HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(html);
    
    return sanitizedHtml;
  } catch (error) {
    console.error('Error formatting message:', error);
    return content;
  }
};

/**
 * CSS classes untuk styling prose content dengan table support
 */
export const getProseClasses = (theme: 'default' | 'amber' | 'red' | 'blue' = 'default') => {
  const baseClasses = `prose prose-sm max-w-none break-words 
    prose-headings:font-semibold prose-headings:my-2
    prose-p:text-gray-700 prose-p:my-1 prose-p:leading-relaxed
    prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-pre:rounded prose-pre:p-3
    prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono
    prose-li:text-gray-700 prose-li:marker:text-gray-500 prose-li:my-0.5
    prose-strong:text-gray-900 prose-em:text-gray-700
    prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
    leading-tight [&_p]:!my-1 [&_br]:leading-none
    [&_h1+p]:!mt-1 [&_h2+p]:!mt-1 [&_h3+p]:!mt-1`;

  const themeClasses = {
    default: 'prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline',
    amber: 'prose-headings:text-amber-800 prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline',
    red: 'prose-headings:text-red-800 prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline',
    blue: 'prose-headings:text-blue-800 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline'
  };

  const tableClasses = `
    [&_table]:border-collapse [&_table]:my-3 [&_table]:w-full [&_table]:min-w-[500px] [&_table]:text-sm [&_table]:bg-white [&_table]:rounded-lg [&_table]:overflow-hidden
    [&_th]:bg-gray-50 [&_th]:p-2 [&_th]:border-b [&_th]:border-gray-200 [&_th]:font-semibold [&_th]:text-left [&_th]:text-gray-800 [&_th]:whitespace-nowrap [&_th]:max-w-[200px]
    [&_td]:p-2 [&_td]:border-b [&_td]:border-gray-100 [&_td]:align-top [&_td]:leading-relaxed [&_td]:break-words [&_td]:hyphens-auto
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
    return `<div class="overflow-x-auto -mx-1 my-2">${content}</div>`;
  }
  
  return content;
}; 