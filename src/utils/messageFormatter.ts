import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Style untuk chat message container dan kontennya
 */
const chatStyles = {
  container: `
    prose prose-sm max-w-none
    prose-ol:pl-5 prose-ol:mt-2 prose-ol:list-decimal prose-ol:list-outside
    prose-ul:pl-5 prose-ul:mt-2 prose-ul:list-disc prose-ul:list-outside
    prose-li:pl-1 prose-li:my-0 prose-li:marker:text-gray-400
    prose-p:my-2 prose-p:leading-relaxed
    prose-headings:mt-4 prose-headings:mb-2
    prose-pre:my-2 prose-pre:rounded-lg
    prose-code:text-gray-800
    prose-blockquote:my-2 prose-blockquote:pl-4 prose-blockquote:border-l-4 prose-blockquote:border-gray-300
    prose-a:text-blue-600 prose-a:no-underline hover:prose-a:text-blue-800
    prose-strong:font-semibold prose-strong:text-gray-900
    prose-em:italic prose-em:text-gray-800
    prose-table:border-collapse prose-table:w-full
    prose-th:bg-gray-50 prose-th:p-2 prose-th:border prose-th:border-gray-300
    prose-td:p-2 prose-td:border prose-td:border-gray-300
    prose-img:rounded-lg prose-img:shadow-sm
    prose-hr:my-4 prose-hr:border-gray-200
  `.replace(/\s+/g, ' ').trim()
};

/**
 * Memformat pesan chat dengan menangani markdown dan sanitasi HTML
 * Menambahkan style khusus untuk links dan tampilan profesional
 * @param content - Konten pesan yang akan diformat
 * @returns String HTML yang sudah diformat dan disanitasi dengan style tambahan
 */
export const formatMessage = (content: string): string => {
  if (!content) return '';

  // Perbaiki format list yang tidak tepat
  let fixedContent = content
    // Hapus list marker yang tidak perlu
    .replace(/^[•\-\*]\s/gm, '')
    // Pastikan baris baru yang bukan bagian dari list tidak diberi marker
    .split('\n')
    .map(line => {
      const trimmedLine = line.trim();
      
      // Jika baris dimulai dengan angka atau huruf diikuti titik, ini mungkin list
      if (/^\d+\.\s/.test(trimmedLine) || /^[a-zA-Z]\.\s/.test(trimmedLine)) {
        return line;
      }
      
      // Jika baris dimulai dengan - atau * dan spasi, ini adalah list
      if (/^[-\*]\s/.test(trimmedLine)) {
        return line;
      }
      
      // Jika baris kosong, biarkan
      if (!trimmedLine) {
        return line;
      }
      
      // Untuk baris lain, pastikan tidak ada marker
      return line.replace(/^[-\*•]\s/, '');
    })
    .join('\n')
    // Perbaiki multiple newlines menjadi maksimal 2
    .replace(/\n{3,}/g, '\n\n')
    // Perbaiki format list dengan indentasi
    .replace(/^(\s*[-\*]\s)/gm, '- ')
    // Perbaiki format quote
    .replace(/^>\s*/gm, '> ');

  // Perbaiki penomoran list
  const lines = fixedContent.split('\n');
  let inOrderedList = false;
  let currentNumber = 0;
  let listLevel = 0;

  fixedContent = lines.map(line => {
    const trimmedLine = line.trim();
    const indentLevel = Math.floor((line.length - trimmedLine.length) / 2);
    
    // Deteksi awal list bernomor
    if (/^\d+\.\s/.test(trimmedLine)) {
      // Reset penomoran jika level indentasi berbeda
      if (indentLevel !== listLevel) {
        inOrderedList = false;
        listLevel = indentLevel;
      }
      
      if (!inOrderedList) {
        inOrderedList = true;
        currentNumber = 0;
      }
      currentNumber++;
      // Tambahkan indentasi yang sesuai
      const indent = '  '.repeat(indentLevel);
      return `${indent}${currentNumber}. ${trimmedLine.replace(/^\d+\.\s/, '')}`;
    }
    
    // Jika baris kosong atau bukan bagian dari list, reset status
    if (!trimmedLine || !(/^[-\*•\d]\s/.test(trimmedLine))) {
      inOrderedList = false;
      listLevel = 0;
    }
    
    return line;
  }).join('\n');

  // Konfigurasi marked dengan renderer kustom
  const renderer = new marked.Renderer();
  
  // Kustomisasi rendering link dengan title tooltip
  renderer.link = (href, title, text) => {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline decoration-blue-400/50 hover:decoration-blue-600 transition-colors group">
      ${text}
      ${title ? `<span class="invisible group-hover:visible absolute bg-gray-800 text-white text-xs rounded px-2 py-1 mt-1 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">${title}</span>` : ''}
    </a>`;
  };

  // Kustomisasi rendering heading
  renderer.heading = (text, level) => {
    const sizes = {
      1: 'text-2xl',
      2: 'text-xl',
      3: 'text-lg',
      4: 'text-base',
      5: 'text-sm',
      6: 'text-xs'
    };
    return `<h${level} class="font-semibold ${sizes[level as keyof typeof sizes]} mb-2 mt-4">${text}</h${level}>`;
  };

  // Kustomisasi rendering blockquote
  renderer.blockquote = (quote) => {
    return `<blockquote class="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-700">${quote}</blockquote>`;
  };

  // Kustomisasi rendering code dengan syntax highlighting dan copy button
  renderer.code = (code, language) => {
    const languageClass = language ? ` language-${language}` : '';
    const languageLabel = language ? `<div class="text-xs text-gray-500 mb-2">${language}</div>` : '';
    return `
      <div class="relative group">
        ${languageLabel}
        <pre class="bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto${languageClass}">
          <code class="text-sm font-mono text-gray-800">${code}</code>
        </pre>
        <button class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-200 hover:bg-gray-300 rounded px-2 py-1 text-xs text-gray-700" onclick="navigator.clipboard.writeText(this.parentElement.querySelector('code').textContent)">
          Copy
        </button>
      </div>
    `;
  };

  // Kustomisasi rendering list dengan proper nesting dan styling
  renderer.list = (body, ordered) => {
    const type = ordered ? 'ol' : 'ul';
    const listClass = ordered ? 'list-decimal' : 'list-disc';
    return `<${type} class="my-4 pl-6 space-y-2 ${listClass} marker:text-gray-400">${body}</${type}>`;
  };

  // Kustomisasi rendering list item dengan penomoran yang benar
  renderer.listitem = (text) => {
    return `<li class="text-gray-700">${text}</li>`;
  };

  // Kustomisasi rendering tabel
  renderer.table = (header, body) => {
    return `
      <div class="overflow-x-auto my-4">
        <table class="min-w-full border-collapse border border-gray-300 rounded-lg">
          <thead class="bg-gray-100">${header}</thead>
          <tbody class="bg-white">${body}</tbody>
        </table>
      </div>
    `;
  };

  renderer.tablerow = (content) => {
    return `<tr class="border-b border-gray-300 hover:bg-gray-50 transition-colors">${content}</tr>`;
  };

  renderer.tablecell = (content, { header }) => {
    if (header) {
      return `<th class="px-4 py-2 text-left font-semibold text-gray-700">${content}</th>`;
    }
    return `<td class="px-4 py-2 text-gray-700">${content}</td>`;
  };

  // Konfigurasi marked
  marked.setOptions({
    renderer,
    breaks: true,      // Mengaktifkan line breaks
    gfm: true,         // Mengaktifkan GitHub Flavored Markdown
    headerIds: false,  // Menonaktifkan ID otomatis pada header
    mangle: false,     // Menonaktifkan escape pada email links
  });

  // Sanitasi HTML yang dihasilkan dengan style tambahan
  const sanitizedHtml = DOMPurify.sanitize(marked.parse(fixedContent), {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
      'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'button'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'title', 'onclick'],
    ADD_ATTR: ['target'], // Menambahkan target="_blank" untuk links
  });

  // Tambahkan wrapper dengan style dasar
  return `<div class="${chatStyles.container}">${sanitizedHtml}</div>`;
}; 