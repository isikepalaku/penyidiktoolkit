import { marked } from 'marked';
import DOMPurify from 'dompurify';
import remarkGfm from 'remark-gfm';

// Konfigurasi marked dengan opsi yang lebih baik
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false
});

/**
 * Process large tables from AI models like Gemini
 * @param content - Markdown content to process
 * @returns Processed markdown with fixed tables
 */
const processLargeTables = (content: string): string => {
  if (!content || !content.includes('|')) return content;
  
  // Regular expression to identify markdown tables
  const tableRegex = /(?:^\|[^\n]*\|\r?\n)((?:\|[^\n]*\|\r?\n)+)/gm;
  
  return content.replace(tableRegex, (tableMatch) => {
    // Split table into rows
    const rows = tableMatch.split('\n').filter(row => row.trim().startsWith('|') && row.trim().endsWith('|'));
    
    if (rows.length <= 2) return tableMatch; // Header + separator only, not a large table
    
    // Process the table header and separator
    const headerRow = rows[0];
    const separatorRow = rows[1];
    
    // Check if any row is excessively long (>1000 chars)
    const hasLongRow = rows.some(row => row.length > 1000);
    
    if (!hasLongRow) return tableMatch; // Not a problematic table
    
    // Count the number of columns in the header
    const columnCount = (headerRow.match(/\|/g) || []).length - 1;
    
    // Create a fixed version of the table with truncated cells
    let newTable = headerRow + '\n' + separatorRow + '\n';
    
    // Process data rows (skip header and separator)
    for (let i = 2; i < Math.min(rows.length, 20); i++) { // Limit to 20 rows max
      const row = rows[i];
      // Split the row into cells
      const cells = row.split('|').slice(1, -1);
      
      // Create a new row with truncated cells
      let newRow = '|';
      for (let j = 0; j < Math.min(cells.length, columnCount); j++) {
        let cellContent = cells[j] || '';
        // Truncate cell content if too long (>200 chars)
        if (cellContent.length > 200) {
          cellContent = cellContent.substring(0, 197) + '...';
        }
        newRow += cellContent + '|';
      }
      
      // If we're missing columns, add empty cells
      while ((newRow.match(/\|/g) || []).length - 1 < columnCount) {
        newRow += ' |';
      }
      
      newTable += newRow + '\n';
    }
    
    // Add a note if we truncated the table
    if (rows.length > 20) {
      newTable += '| *Tabel dipotong karena terlalu besar* |' + ' |'.repeat(columnCount - 1) + '\n';
    }
    
    return newTable;
  });
};

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
  processed = processed.replace(/^(\s{2,})\*\s+/gm, (_, indent) => {
    // Normalisasi indentasi ke kelipatan 2
    const normalizedIndent = '  '.repeat(Math.floor(indent.length / 2));
    return `${normalizedIndent}* `;
  });
  
  // 6. JANGAN bersihkan whitespace di awal baris secara global
  // Hanya bersihkan untuk baris yang bukan list, heading, atau code
  processed = processed.split('\n').map(line => {
    // Jika baris adalah list item, heading, atau code block, biarkan
    if (line.match(/^\s*[*-]/) || line.match(/^\s*#/) || line.match(/^\s{4,}/)) {
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
  
  // 14. Handle large tables from AI models like Gemini
  processed = processLargeTables(processed);
  
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
  
  // 5. Fix large table cells to prevent layout issues
  processed = processed.replace(/<td([^>]*)>([^<]{500,})<\/td>/g, (_, attrs, content) => {
    return `<td${attrs} class="truncated-cell" title="${content.substring(0, 100).replace(/"/g, '&quot;')}...">${content.substring(0, 497)}...</td>`;
  });
  
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
    
    // Check if content is extremely large
    if (content.length > 100000) {
      console.warn('Extremely large content detected, length:', content.length);
      // Truncate very large content to prevent browser performance issues
      content = content.substring(0, 100000) + '\n\n*Konten terlalu panjang dan telah dipotong...*';
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
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style']
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
    [&_table]:border-collapse [&_table]:my-4 [&_table]:w-full [&_table]:text-sm [&_table]:bg-white [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:shadow-sm [&_table]:font-sans
    [&_table]:overflow-x-auto [&_table]:max-w-full [&_table]:block
    [&_th]:bg-gray-50 [&_th]:p-3 [&_th]:border [&_th]:border-gray-200 [&_th]:font-semibold [&_th]:text-left [&_th]:text-gray-800 [&_th]:whitespace-nowrap [&_th]:max-w-[200px] [&_th]:font-sans
    [&_td]:p-3 [&_td]:border [&_td]:border-gray-100 [&_td]:align-top [&_td]:leading-relaxed [&_td]:break-words [&_td]:hyphens-auto [&_td]:font-sans [&_td]:max-w-[350px] [&_td]:overflow-hidden
    [&_td.truncated-cell]:relative [&_td.truncated-cell]:max-w-[350px] [&_td.truncated-cell]:truncate [&_td.truncated-cell]:cursor-help
    [&_td:first-child]:font-medium [&_td:first-child]:bg-gray-50/50 [&_td:first-child]:whitespace-nowrap [&_td:first-child]:min-w-[120px] [&_td:first-child]:max-w-[180px]
    [&_td:last-child]:w-auto
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

/**
 * TypeScript interface for markdown component configuration
 */
export interface MarkdownConfig {
  /** Class name for the container div */
  containerClassName: string;
  /** Class name for the ReactMarkdown component */
  className: string;
  /** Component configuration for ReactMarkdown */
  components: Record<string, { className: string } & Record<string, string>>;
  /** Remark plugins to use with ReactMarkdown */
  remarkPlugins: Array<typeof remarkGfm>; // More specific type for remark plugins
}

/**
 * Configuration for Analysis Markdown rendering styling
 * Contains styling and component props for consistent markdown rendering
 */
export const analysisMarkdownConfig: MarkdownConfig = {
  // Container class names
  containerClassName: "max-w-none break-words text-gray-800 leading-relaxed",
  
  // ReactMarkdown class names
  className: "prose prose-lg max-w-none prose-headings:text-blue-800 prose-headings:font-bold prose-headings:border-b-2 prose-headings:border-blue-200 prose-headings:pb-2 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-strong:text-gray-900 prose-strong:font-semibold prose-em:text-gray-600 prose-em:italic prose-a:text-blue-600 prose-a:hover:text-blue-800 prose-a:underline prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:mb-2 prose-li:leading-relaxed prose-hr:border-blue-200 prose-hr:my-8",
  
  // React-markdown component configurations (to be used in a TSX file)
  components: {
    h1: {
      className: "text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2 border-b-2 border-blue-200 pb-2 mt-8 first:mt-0"
    },
    a: {
      className: "text-blue-600 hover:text-blue-800 underline font-medium",
      target: "_blank",
      rel: "noopener noreferrer"
    },
    p: {
      className: "text-gray-700 leading-relaxed mb-4"
    },
    strong: {
      className: "text-gray-900 font-semibold"
    },
    em: {
      className: "text-gray-600 italic"
    },
    hr: {
      className: "border-blue-200 my-8"
    }
  },
  
  // Plugins to use
  remarkPlugins: [remarkGfm]
};

/**
 * TypeScript type for ReactMarkdown component props
 */
export type MarkdownComponentProps = Record<string, Record<string, string | React.CSSProperties>>;

/**
 * Helper function to create component mappings with class names
 * This is a pure TypeScript function that transforms our component configuration
 * into the format required by ReactMarkdown's components prop
 * 
 * @param components - Record of component configurations with className and other attributes
 * @returns An object that can be passed to ReactMarkdown's components prop
 */
export const createComponentProps = (components: Record<string, { className: string } & Record<string, string>>): MarkdownComponentProps => {
  return Object.entries(components).reduce((acc, [key, props]) => {
    acc[key] = props;
    return acc;
  }, {} as MarkdownComponentProps);
};