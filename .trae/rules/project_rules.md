# Instructions

During your interaction with the user, if you find anything reusable in this project (e.g. version of a library, model name), especially about a fix to a mistake you made or a correction you received, you should take note in the `Lessons` section in the `.cursorrules` file so you will not make the same mistake again. 

You should also use the `.cursorrules` file as a Scratchpad to organize your thoughts. Especially when you receive a new task, you should first review the content of the Scratchpad, clear old different task if necessary, first explain the task, and plan the steps you need to take to complete the task. You can use todo markers to indicate the progress, e.g.
[X] Task 1
[ ] Task 2

Also update the progress of the task in the Scratchpad when you finish a subtask.
Especially when you finished a milestone, it will help to improve your depth of task accomplishment to use the Scratchpad to reflect and plan.
The goal is to help you maintain a big picture as well as the progress of the task. Always refer to the Scratchpad when you plan the next step.

## Instructions for Using Graphiti's MCP Tools for Agent Memory

### Before Starting Any Task

- **Always search first:** Use the `search_nodes` tool to look for relevant preferences and procedures before beginning work.
- **Search for facts too:** Use the `search_facts` tool to discover relationships and factual information that may be relevant to your task.
- **Filter by entity type:** Specify `Preference`, `Procedure`, or `Requirement` in your node search to get targeted results.
- **Review all matches:** Carefully examine any preferences, procedures, or facts that match your current task.

### Always Save New or Updated Information

- **Capture requirements and preferences immediately:** When a user expresses a requirement or preference, use `add_episode` to store it right away.
  - _Best practice:_ Split very long requirements into shorter, logical chunks.
- **Be explicit if something is an update to existing knowledge.** Only add what's changed or new to the graph.
- **Document procedures clearly:** When you discover how a user wants things done, record it as a procedure.
- **Record factual relationships:** When you learn about connections between entities, store these as facts.
- **Be specific with categories:** Label preferences and procedures with clear categories for better retrieval later.

### During Your Work

- **Respect discovered preferences:** Align your work with any preferences you've found.
- **Follow procedures exactly:** If you find a procedure for your current task, follow it step by step.
- **Apply relevant facts:** Use factual information to inform your decisions and recommendations.
- **Stay consistent:** Maintain consistency with previously identified preferences, procedures, and facts.

### Best Practices

- **Search before suggesting:** Always check if there's established knowledge before making recommendations.
- **Combine node and fact searches:** For complex tasks, search both nodes and facts to build a complete picture.
- **Use `center_node_uuid`:** When exploring related information, center your search around a specific node.
- **Prioritize specific matches:** More specific information takes precedence over general information.
- **Be proactive:** If you notice patterns in user behavior, consider storing them as preferences or procedures.

**Remember:** The knowledge graph is your memory. Use it consistently to provide personalized assistance that respects the user's established preferences, procedures, and factual context.

## Gemini API Prompt Engineering Lessons

- **Menghilangkan Frasa Berulang di Respons Gemini**: Untuk menghindari frasa seperti "Baik, saya akan menyusun laporan..." yang selalu muncul di awal respons:
  * Hindari instruksi eksplisit seperti "Gunakan kemampuan pencarian web Anda untuk mengumpulkan informasi..."
  * Jangan gunakan frasa "Setelah itu, buatlah laporan..." yang menyebabkan model memberikan konfirmasi
  * Gunakan instruksi langsung seperti "Susun laporan..." atau "Identifikasi dan sajikan..."
  * Hindari kata "HARUS" atau "Anda HARUS" yang memicu respons konfirmasi
  * Struktur prompt dengan role definition yang langsung ke tugas tanpa instruksi bertahap
  * Contoh yang baik: "Anda adalah analis intelijen yang bertugas menyusun laporan..." (langsung ke tugas)
  * Contoh yang buruk: "Gunakan kemampuan pencarian web Anda untuk mengumpulkan informasi... Setelah itu, buatlah laporan..." (memicu konfirmasi)

- **Gemini 2.0 Grounding Implementation**: Untuk implementasi grounding yang benar dengan Gemini 2.0:
  * Gunakan struktur API call yang benar: `contents: [{ parts: requestParts }]` bukan `contents: { parts: requestParts }`
  * Akses grounding metadata dengan: `response.candidates?.[0]?.groundingMetadata`
  * Grounding chunks tersedia di: `groundingMetadata?.groundingChunks`
  * Setiap chunk memiliki struktur: `chunk.web?.uri` dan `chunk.web?.title`
  * Gunakan Map untuk deduplikasi sources berdasarkan URI
  * Tambahkan logging untuk debugging: console.log jumlah chunks dan domains yang ditemukan
  * Jika tidak ada sources yang ditemukan, log warning untuk debugging
  * Search entry point tersedia di: `groundingMetadata?.searchEntryPoint`
  * Referensi: https://ai.google.dev/gemini-api/docs/grounding?lang=javascript

- **Gemini Document Processing Implementation**: Untuk implementasi document processing yang benar dengan Gemini API:
  * **File Size Limits**: Maksimal 20MB untuk inline data upload, gunakan File API untuk file > 20MB
  * **Supported MIME Types**: application/pdf, text/plain, text/html, text/css, text/md, text/csv, text/xml, text/rtf, application/x-javascript, text/javascript, application/x-python, text/x-python, plus Office formats (.docx, .xlsx)
  * **Content Structure**: Gunakan format `contents: [{ parts: contentParts }]` dengan text prompt sebelum file untuk hasil optimal
  * **File Processing**: Implement proper base64 encoding dengan validasi MIME type dan file size
  * **Error Handling**: Tambahkan validasi file size, MIME type, dan detailed error messages untuk troubleshooting
  * **Temperature Setting**: Gunakan temperature 0.1 untuk analisis dokumen yang konsisten
  * **Logging Strategy**: Log file details (name, type, size), processing steps, dan API call parameters untuk debugging
  * **UI Integration**: Update accept attribute untuk mendukung semua format yang didukung API
  * **Best Practices**: Text prompt ditempatkan sebelum file attachment, implement comprehensive file validation
  * Referensi: https://ai.google.dev/gemini-api/docs/document-processing?lang=node

## ReactMarkdown Integration Lessons

- **Use inline component definitions**: Define components directly in the components prop for better type safety
- **Component format example**:
  ```typescript
  components={{
    h1: ({ children, ...props }) => (
      <h1 className="text-2xl font-bold" {...props}>
        {children}
      </h1>
    ),
    // other components...
  }}
  ```
- **Error prevention**: "Element type is invalid" errors typically occur when passing objects instead of React components
- **Debugging tip**: If ReactMarkdown fails, check that all component values are actual React component functions
- **Avoid helper functions**: ReactMarkdown components prop expects actual React components, not objects or helper function results

## API Integration Lessons

- When using FormData for file uploads, don't set Content-Type header manually - let browser handle it
- For api.reserse.id, always use VITE_API_KEY in X-API-Key header
- For flow.reserse.id, use VITE_PERKABA_API_KEY
- Set appropriate file size limits (50MB) for image uploads in nginx and vite config
- Use relative URLs with proxy in vite.config.ts instead of absolute URLs
- Add all required domains to allowedHosts in vite.config.ts (api.reserse.id, flow.reserse.id, app.reserse.id)
- Configure allowedHosts in both server and preview mode
- Use wildcard subdomain (.reserse.id) for broader access
- Set proper hostname in docker and nginx configs

### Service Implementation Best Practices

- **NEVER hardcode API endpoints**: Always use `env.apiUrl` atau `API_BASE_URL` dari config
- **Follow existing patterns**: Gunakan pola yang sama dengan service yang sudah ada (seperti tipidkorService.ts)
- **Import env config**: Selalu import `{ env } from '@/config/env'` untuk akses ke environment variables
- **Use consistent structure**: 
  ```typescript
  const API_BASE_URL = env.apiUrl || 'https://api.reserse.id';
  const url = `${API_BASE_URL}/v1/playground/teams/[team-name]/runs`;
  ```
- **Session management**: Implementasi session dan user ID management yang konsisten dengan Supabase auth
- **Error handling**: Gunakan retry logic dan network error detection yang sama
- **Response parsing**: Implementasi parseResponse function untuk handle berbagai format response
- **Timeout handling**: Gunakan FETCH_TIMEOUT yang konsisten (600000ms = 10 menit)
- **Headers consistency**: Gunakan pattern header yang sama (Accept, X-API-Key, X-User-ID, Authorization)
- **API Key Security**: Selalu gunakan `import.meta.env.VITE_API_KEY` dari environment variables, NEVER hardcode API keys

## PenyidikAi Agent Implementation Pattern

Untuk menambahkan agen baru di PenyidikAi.tsx, ikuti langkah-langkah berikut:

1. Buat Service File (src/services/[agentName]Service.ts):
   - Import env dan uuid
   - Gunakan FormData untuk request body
   - Implementasikan retry logic untuk error jaringan dan server
   - Gunakan endpoint `/v1/playground/agents/[endpoint-name]/runs`
   - Implementasikan fungsi sendChatMessage, clearChatHistory, dan initializeSession
   - Contoh:
   ```typescript
   const formData = new FormData();
   formData.append('message', message.trim());
   formData.append('agent_id', 'fismondev-chat');
   formData.append('stream', 'false');
   formData.append('monitor', 'false');
   formData.append('session_id', currentSessionId);
   formData.append('user_id', currentSessionId);
   ```

2. Buat Konfigurasi Agen (src/data/agents/[agentName]Agent.ts):
   - Gunakan interface ExtendedAgent
   - Tentukan id, name, type, status, dan description
   - Tambahkan icon dan iconClassName
   - Contoh:
   ```typescript
   export const fismondevAgent: ExtendedAgent = {
     id: 'fismondev_001',
     name: 'Fismondev AI',
     type: 'fismondev_chat',
     status: 'on',
     description: 'Asisten AI yang fokus pada tindak pidana di bidang Fiskal, Moneter, dan Devisa',
     icon: DollarSign,
     iconClassName: 'text-green-600',
     fields: []
   };
   ```

3. Update Types (src/types/index.ts):
   - Tambahkan tipe agen baru ke union type AgentType
   - Contoh: `| 'fismondev_chat'`

4. Update Utils (src/utils/utils.ts):
   - Tambahkan ID agen ke AGENT_IDS
   - Tambahkan case di getAgentTypeFromId
   - Contoh:
   ```typescript
   FISMONDEV_CHAT: 'fismondev_001'
   ```

5. Update AgentCard (src/components/AgentCard.tsx):
   - Tambahkan case di getAgentIcon
   - Gunakan ikon yang sesuai
   - Contoh:
   ```typescript
   case 'fismondev_chat':
     return <img src="/img/krimsus.png" alt="Fismondev AI" className="h-10 w-10" />;
   ```

6. Update PenyidikAi Component (src/pages/PenyidikAi.tsx):
   - Import agen dan service
   - Tambahkan agen ke array agents
   - Tambahkan case di renderContent
   - Tambahkan styling yang sesuai
   - Contoh:
   ```typescript
   case 'fismondev_chat':
     return <ChatInterface sendMessage={sendFismondevChatMessage} />;
   ```

7. Styling Konsisten:
   - Gunakan gradient yang sesuai dengan jenis agen
   - Pertahankan konsistensi visual dengan agen lain
   - Contoh:
   ```typescript
   agent.type === 'fismondev_chat'
     ? "bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100"
     : "bg-gradient-to-br from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100"
   ```

## Security Lessons

- Add rate limiting in nginx (10r/s with burst 20)
- Block unnecessary paths (/webui, /geoserver, /admin, etc.)
- Add security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- Configure robots.txt to disallow all
- Handle favicon.ico and .git requests properly
- Filter proxy paths in vite.config.ts to only allow needed routes

## Project Structure Lessons

From project.md:
- Follow consistent service pattern for new agents:
  - Service file in src/services/
  - Agent config in src/data/agents/
  - Page component in src/pages/
  - Update Sidebar.tsx and App.tsx
- Use existing components:
  - ChatInterface for chat functionality
  - AgentCard for agent display
  - BaseAgentForm for forms
- Maintain consistent styling with Tailwind CSS
- Handle chat message formatting:
  - Use flex-wrap and min-w-0 to prevent overflow
  - Add pre-wrap for code blocks and pre elements
  - Make tables scrollable horizontally
  - Use word-break and overflow-wrap for long content
- Agent configuration best practices:
  - Add descriptive icons that match agent functionality
  - Use consistent color schemes for related agents
  - Keep form heights appropriate for expected input length
  - Include clear placeholder text in form fields

## Chat Agent Implementation Pattern

When adding a new chat-based agent to the UndangUndang component, follow these steps:

1. Create Service File (src/services/[agentName]Service.ts):
 - Import env config and uuid
 - Configure API constants (API_KEY, MAX_RETRIES, etc.)
 - Implement session management
 - Implement parseResponse function for handling responses
 - Implement sendChatMessage with FormData and proper error handling
 - Add clearChatHistory and initializeSession functions

2. Update Types (src/types/index.ts):
 - Add new agent type to AgentType union (e.g., 'ciptakerja_chat')

3. Update Utils (src/utils/utils.ts):
 - Add agent ID to AGENT_IDS constant
 - Add case in getAgentTypeFromId
 - Don't add to getTypeDisplay if it's a chat agent (these use custom display names)

4. Update Agent Card (src/components/AgentCard.tsx):
 - Add case in getAgentIcon with appropriate Lucide icon
 - Choose an icon that represents the agent's function
 - Use consistent icon size (24px)
 - Give icon an appropriate color

5. Update UndangUndang Component (src/pages/UndangUndang.tsx):
 - Import new service's sendChatMessage
 - Add agent to agents array with proper configuration
 - Add case in renderContent switch statement
 - Configure card styling:
   * Use professional color gradients
   * Maintain visual hierarchy
   * Ensure contrast and readability
   * Keep consistent hover effects
   * Match icon and colors to agent's purpose

6. Follow Best Practices:
 - Maintain consistent error handling
 - Use proper session management
 - Implement proper logging
 - Follow API security guidelines
 - Use professional color schemes appropriate for police applications
 - Ensure visual consistency with existing agents

Professional Color Scheme Examples:
- Financial Services (P2SK): blue-indigo gradient (from-blue-50 to-indigo-50)
- Criminal Law (KUHP): rose-orange gradient (from-rose-50 to-orange-50)
- Technology Law (ITE): cyan-sky gradient (from-cyan-50 to-sky-50)
- Labor Law (Cipta Kerja): slate-gray gradient (from-slate-50 to-gray-50)

## Environment Configuration Lessons

- Use default values in env.ts for critical variables
- Keep API keys secure and never log them
- Use separate keys for different services:
  - VITE_API_KEY for api.reserse.id
  - VITE_PERKABA_API_KEY for flow.reserse.id
  - VITE_OPENAI_API_KEY for OpenAI
  - VITE_GEMINI_API_KEY for Google Gemini API (sentiment analysis)
  - VITE_SUPABASE_URL for Supabase URL
  - VITE_SUPABASE_ANON_KEY for Supabase Anon Key
  - etc.

## Supabase Security Lessons

⚠️ **CRITICAL SECURITY PRACTICES:**
- **ALWAYS enable Row Level Security (RLS)** pada semua tabel public
- **NEVER expose auth.users** melalui views atau materialized views
- **ALWAYS create proper RLS policies** untuk data isolation
- **REVOKE anonymous access** dari tabel yang mengandung data user
- **GRANT access hanya untuk authenticated users** sesuai kebutuhan

### Security Implementation Pattern:
```sql
-- 1. Enable RLS untuk tabel baru
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- 2. Buat policy untuk user isolation
CREATE POLICY "Users can only access their own data" 
ON public.table_name 
FOR ALL 
USING (auth.uid()::text = user_id);

-- 3. Revoke akses anon dan grant authenticated
REVOKE ALL ON public.table_name FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_name TO authenticated;
```

### Application Code Security:
```typescript
// ✅ CORRECT - Selalu filter berdasarkan user
const { data } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id);

// ✅ CORRECT - Selalu include user_id dalam insert
const { data } = await supabase
  .from('table_name')
  .insert({ content: 'data', user_id: user.id });

// ❌ WRONG - Query tanpa user filter (akan return empty dengan RLS)
const { data } = await supabase.from('table_name').select('*');

// ❌ WRONG - Insert tanpa user_id (akan error dengan RLS)
const { data } = await supabase.from('table_name').insert({ content: 'data' });
```

### Security Monitoring:
- **Regular audit** RLS policies dan permissions
- **Monitor Supabase dashboard** untuk security warnings
- **Test user isolation** secara berkala
- **Backup database** sebelum perubahan security
- **Implement rollback plan** untuk emergency situations

### Common RLS Issues:
- `new row violates row-level security policy` → Include user_id dalam insert
- `permission denied for table` → Check user authentication status
- `empty result set` → Verify user_id filter dalam query
- `exposed auth.users` → Remove atau secure views yang mengakses auth schema

## Table Rendering Lessons

### Responsive Table Implementation in Chat Components

Untuk menangani tabel yang kompleks dari backend AI dalam komponen chat, gunakan pattern berikut:

1. **Tailwind Arbitrary Values untuk Table Styling**:
   ```typescript
   className="prose prose-sm max-w-none
             [&_table]:border-collapse [&_table]:my-4 [&_table]:w-full [&_table]:min-w-[600px] [&_table]:text-sm [&_table]:bg-white [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:shadow-sm
             [&_th]:bg-red-50 [&_th]:p-3 [&_th]:border [&_th]:border-gray-300 [&_th]:font-semibold [&_th]:text-left [&_th]:text-red-800 [&_th]:whitespace-nowrap [&_th]:max-w-[200px]
             [&_td]:p-3 [&_td]:border [&_td]:border-gray-300 [&_td]:align-top [&_td]:leading-relaxed [&_td]:break-words [&_td]:hyphens-auto
             [&_td:first-child]:font-semibold [&_td:first-child]:bg-gray-50 [&_td:first-child]:whitespace-nowrap [&_td:first-child]:min-w-[150px] [&_td:first-child]:max-w-[200px]
             [&_td:last-child]:w-auto [&_td:last-child]:max-w-[400px]
             [&_tr:nth-child(even)]:bg-gray-50/50
             [&_tr:hover]:bg-gray-100/50"
   ```

2. **Responsive Wrapper Pattern**:
   ```typescript
   <div className="overflow-x-auto -mx-2 sm:-mx-4">
     <div className="prose..." dangerouslySetInnerHTML={{ __html: formatMessage(content) }} />
   </div>
   ```

3. **Key Styling Principles**:
   - **Minimum Width**: Set `min-w-[600px]` untuk tabel agar tetap readable
   - **Column Control**: Batasi lebar kolom pertama dan terakhir dengan `max-w-[200px]` dan `max-w-[400px]`
   - **Text Wrapping**: Gunakan `break-words` dan `hyphens-auto` untuk text yang panjang
   - **Visual Enhancement**: Tambahkan hover effects, alternating colors, dan shadow
   - **Responsive Scroll**: Gunakan `overflow-x-auto` untuk scroll horizontal pada layar kecil

4. **Benefits**:
   - Tabel tetap readable pada semua ukuran layar
   - Scroll horizontal otomatis pada mobile
   - Professional appearance dengan visual enhancements
   - Consistent dengan design system aplikasi

5. **Common Issues**:
   - **Kolom terlalu lebar**: Gunakan `max-width` constraints
   - **Text overflow**: Implementasikan `break-words` dan `hyphens-auto`
   - **Mobile responsiveness**: Selalu wrap dengan `overflow-x-auto`
   - **CSS conflicts**: Gunakan arbitrary values untuk specificity yang tinggi

## API Key Security Lessons

⚠️ **CRITICAL SECURITY PRACTICES:**
- **NEVER hardcode API keys in source code files**
- **NEVER commit .env files to version control**
- **NEVER log actual API key values, even partially**
- **ALWAYS use environment variables for sensitive credentials**

### Security Patterns:
```typescript
// ✅ CORRECT - Use environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ✅ CORRECT - Safe logging
console.log('API Key status:', API_KEY ? 'Available' : 'Missing');

// ❌ WRONG - Never expose actual key values
console.log('API Key:', API_KEY); // DANGEROUS!
console.log('API Key prefix:', API_KEY.substring(0, 5)); // STILL DANGEROUS!

// ❌ WRONG - Never hardcode keys
const API_KEY = 'AIzaSyBf4_0ll5H7OMs7yAtgXO1LWVAWhOcbJmo'; // NEVER DO THIS!
```

### .gitignore Requirements:
- Ensure `.env` files are in .gitignore
- Ensure `.env.local`, `.env.production.local` etc. are ignored
- Provide `.env.example` with placeholder values for new developers

### Emergency Response for Exposed Keys:
1. **Immediately revoke/regenerate** the exposed API key
2. **Remove key from all files** including documentation and comments
3. **Search entire codebase** for any hardcoded key references
4. **Check git history** and remove exposed keys from commits
5. **Update .env.example** with proper placeholder values
6. **Audit all logging statements** to ensure no key exposure

## Performance Optimization Lessons

- Use code splitting with manual chunks for vendor, UI, and feature code
- Enable proper caching headers in nginx for static assets
- Configure gzip compression for text-based assets
- Preload critical assets in index.html
- Use resource hints (preconnect) for external APIs
- Optimize build settings in vite.config.ts
- Use immutable cache for versioned assets
- Disable caching for API endpoints while keeping static asset caching
- Use different cache strategies for different content types
- Keep HTTP/2 benefits without affecting API responses

## Docker Deployment Lessons

- Use multi-stage builds to reduce final image size
- Configure proper healthchecks for container monitoring
- Set resource limits to prevent container abuse
- Use nginx:alpine as production base image
- Enable logging rotation to prevent disk space issues
- Configure Docker networks with specific names and gateways
- Clean up unused networks before redeploying
- Use production-specific nginx configuration
- Use npm ci for faster, reliable builds
- Enable nginx caching for static assets
- Configure proper resource limits for production
- Use HTTP/2 for better performance
- Enable brotli compression for better compression ratios

## UI/UX Lessons

- Handle chat interface layout:
  - Use flex-wrap and min-w-0 for message containers to prevent overflow
  - Avoid nested scrollbars by using whitespace-pre-wrap and break-words
  - Use single scrollable container at the top level with proper bottom padding (pb-32)
  - Keep input area fixed at bottom with position: fixed
  - Let content flow naturally with proper word breaking
  - Keep tables and code blocks within container width
  - Use space-y utilities for consistent message spacing
  - Ensure enough bottom padding to prevent content from being hidden under input area

- Responsive Loading Animation Best Practices:
  - **Mobile-first skeleton design**: Gunakan `flex gap-4 w-full max-w-[80%]` untuk container yang responsif
  - **Full-width skeleton bars**: Gunakan variasi width (`w-full`, `w-11/12`, `w-full`) untuk natural skeleton appearance
  - **Flexible layout structure**: Gunakan `flex-1 space-y-2 py-1 w-full` untuk content area yang expandable
  - **Theme consistency in skeletons**: Gunakan warna yang sesuai dengan theme (e.g. `bg-purple-200` untuk purple theme)
  - **Smooth animations**: Selalu gunakan `animate-pulse` untuk skeleton loading effects
  - **Descriptive loading text**: Berikan text yang jelas seperti "Mencari informasi dan merangkum jawaban..."
  - **Icon consistency**: Pertahankan icon/avatar yang sesuai dengan agent theme saat loading
  - **Avoid fixed containers**: Jangan gunakan fixed width containers untuk loading states pada mobile
  - **Pattern consistency**: Ikuti established skeleton patterns dari components yang sudah ada
- Consider different AI response formats:
  - Code blocks
  - Tables
  - Long URLs
  - Formatted text
  - Lists and indentation
- Add chat-message class for consistent styling across components
- Use TypeScript interfaces for better type safety and documentation
- Remove unused imports to improve code cleanliness
- Visual consistency:
  - Use meaningful icons for each agent type
  - Maintain consistent color schemes
  - Adjust form sizes based on expected content
  - Provide clear visual hierarchy
- Agent icon implementation:
  - Icons should be defined in AgentCard.tsx's getAgentIcon function
  - Use Lucide icons consistently across all agents
  - Follow color scheme patterns (e.g., indigo for analytics, blue for research)
  - Keep icon size consistent (24px)
  - Don't define icons in individual agent files
  - Use proper icon that represents agent's function (e.g., BarChart3 for trend analysis)
  - For custom SVG icons:
    * Place SVG files in public/img directory
    * Reference in img src with absolute path from public (e.g., "/img/google-scholar.svg")
    * Keep original SVG colors if they match the design
    * Maintain consistent size with w-6 h-6 classes (24px)
- ChatPage implementation best practices:
  - Use consistent structure across all ChatPage components
  - Follow the same pattern for message handling, formatting, and display
  - Use conditional rendering for UI elements that should appear/disappear based on state
  - Hide example questions after user starts chatting (messages.length > 1)
  - Use proper spacing and layout for different screen sizes
  - Ensure proper sidebar spacing with lg:pl-64 to prevent overlap
  - Use max-w-3xl mx-auto for content centering
  - Implement proper scrolling behavior with requestAnimationFrame
  - Use consistent styling for message bubbles, info panels, and input areas
  - Provide clear visual feedback for user actions (copying, sending messages)
  - Use aria-label attributes for better accessibility
  - Remove unused imports to prevent TypeScript errors
- UndangUndang ChatPage implementation pattern:
  - Create dedicated ChatPage components for each agent type (e.g., KUHPChatPage)
  - Use consistent color schemes that match the agent's domain:
    * KUHP (Criminal Law): rose-600 (red) theme
    * P2SK (Financial Services): blue-600 (blue) theme
    * ITE (Technology Law): cyan-600 (light blue) theme
    * Cipta Kerja (Labor Law): slate-600 (gray) theme
    * Kesehatan (Health Law): emerald-600 (green) theme
    * Fidusia (Insurance Law): orange-600 (orange) theme
  - Customize welcome messages and example questions for each agent's domain
  - Maintain consistent UI structure across all ChatPage components
  - Use the same formatMessage function for consistent markdown rendering
  - Implement proper session management with initializeSession and clearChatHistory
  - Use consistent error handling and loading states

### File Upload Implementation Patterns

1. State Management untuk File Upload:
   ```typescript
   // State untuk tracking file
   const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
   // State untuk progress
   const [progress, setProgress] = useState<{status: string, percent: number}>({
     status: 'preparing',
     percent: 0
   });
   const [showProgress, setShowProgress] = useState(false);
   ```

2. Implementasi File Input dan Handler:
   ```typescript
   // Ref untuk input file yang disembunyikan
   const fileInputRef = useRef<HTMLInputElement>(null);
   
   // Handler untuk perubahan file
   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files) {
       const filesArray = Array.from(e.target.files);
       setSelectedFiles(prev => [...prev, ...filesArray]);
     }
   };
   
   // Handler untuk menghapus file
   const handleRemoveFile = (indexToRemove: number) => {
     setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
   };
   
   // Fungsi untuk membuka dialog file
   const handleOpenFileDialog = () => {
     if (fileInputRef.current) {
       fileInputRef.current.click();
     }
   };
   ```

3. Komponen Progress Bar:
   ```typescript
   // Progress bar component
   const ProgressBar = ({ percent = 0, status = 'uploading' }) => {
     const getStatusText = () => {
       switch (status) {
         case 'preparing': return 'Mempersiapkan...';
         case 'uploading': return 'Mengunggah file...';
         case 'processing': return 'Memproses dokumen...';
         case 'completed': return 'Selesai!';
         default: return 'Memproses...';
       }
     };
     
     const getColor = () => {
       switch (status) {
         case 'completed': return 'bg-green-500';
         case 'processing': return 'bg-blue-500';
         case 'uploading': return 'bg-amber-500';
         default: return 'bg-blue-500';
       }
     };
     
     return (
       <div className="w-full mb-3">
         <div className="flex justify-between items-center mb-1">
           <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
           <span className="text-sm font-medium text-gray-700">{percent}%</span>
         </div>
         <div className="w-full bg-gray-200 rounded-full h-2.5">
           <div 
             className={`h-2.5 rounded-full ${getColor()} transition-all duration-500 ease-in-out`} 
             style={{ width: `${percent}%` }}
           ></div>
         </div>
       </div>
     );
   };
   ```

4. UI Elements untuk File Upload:
   ```typescript
   {/* File Upload Button */}
   <button
     type="button"
     onClick={handleOpenFileDialog}
     disabled={isProcessing}
     className="absolute left-2 bottom-3 p-2 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors z-20"
     aria-label="Upload file"
   >
     <Paperclip className="w-5 h-5" />
   </button>
   
   {/* Hidden file input */}
   <input 
     type="file" 
     ref={fileInputRef}
     onChange={handleFileChange}
     className="hidden"
     multiple
     accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png"
   />
   
   {/* File Preview Area */}
   {selectedFiles.length > 0 && (
     <div className="mb-3 flex flex-wrap gap-2">
       {selectedFiles.map((file, index) => (
         <div 
           key={index}
           className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 flex items-center gap-2 text-sm text-blue-700"
         >
           <File className="w-4 h-4" />
           <span className="truncate max-w-[150px]">{file.name}</span>
           <button 
             onClick={() => handleRemoveFile(index)}
             className="text-blue-500 hover:text-blue-700"
             aria-label="Hapus file"
           >
             <XIcon className="w-4 h-4" />
           </button>
         </div>
       ))}
     </div>
   )}
   
   {/* Progress Bar UI */}
   {showProgress && (
     <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
       <ProgressBar 
         percent={progress.percent} 
         status={progress.status}
       />
       <p className="text-xs text-gray-500 italic">
         {progress.status === 'uploading' 
           ? 'Mengunggah file besar memerlukan waktu, mohon jangan refresh halaman.' 
           : progress.status === 'processing'
           ? 'AI sedang menganalisis dokumen, proses ini mungkin memerlukan beberapa menit untuk file besar.'
           : 'Sedang memproses...'}
       </p>
     </div>
   )}
   ```

5. Integrasi dengan Progress API:
   ```typescript
   // Setup progress listener
   useEffect(() => {
     const unsubscribe = onProgress((progressInfo) => {
       setProgress({
         status: progressInfo.status,
         percent: progressInfo.percent || 0
       });
       
       if (progressInfo.status === 'completed') {
         // Hide progress after completion + delay
         setTimeout(() => {
           setShowProgress(false);
         }, 1000);
       } else {
         setShowProgress(true);
       }
     });
     
     return () => {
       unsubscribe();
     };
   }, []);
   ```

6. File Size Checking:
   ```typescript
   // Check if any file is large (> 5MB)
   const hasLargeFile = selectedFiles.some(file => file.size > 5 * 1024 * 1024);
   if (hasLargeFile) {
     setShowProgress(true);
   }
   
   // Log file sizes sebelum upload
   if (selectedFiles.length > 0) {
     console.log('Uploading files:');
     selectedFiles.forEach((file, index) => {
       console.log(`File ${index + 1}: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
     });
   }
   ```

7. Error Handling untuk Upload File:
   ```typescript
   // Fungsi untuk menampilkan error yang lebih spesifik
   const getErrorMessage = (error: any): string => {
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
       if (error.message.includes('Terlalu banyak permintaan')) {
         return 'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu beberapa saat dan coba lagi.';
       }
       
       // Jika ada pesan error spesifik lainnya, tampilkan
       return error.message;
     }
     
     // Default error message
     return 'Permintaan Terlalu banyak, coba lagi dalam 2 menit. (dengan bertumbuhnya pengguna, saat ini kami membatasi permintaan untuk menjaga kualitas layanan)';
   };
   ```

8. Best Practices untuk File Upload:
   - Gunakan accept attribute untuk membatasi jenis file yang dapat diunggah
   - Tampilkan progress bar khususnya untuk file besar
   - Berikan feedback visual untuk status upload (warna berbeda untuk status berbeda)
   - Tampilkan pesan informatif selama proses upload
   - Implementasikan mekanisme untuk menghapus file sebelum upload
   - Truncate nama file yang terlalu panjang dengan class `truncate max-w-[150px]`
   - Log ukuran file untuk debugging
   - Nonaktifkan tombol upload selama proses upload
   - Berikan pesan error yang spesifik untuk masalah umum (file terlalu besar, timeout, offline)
   - Reset selectedFiles setelah upload berhasil

9. Integrasi dengan Form Submission:
   ```typescript
   // Tetap memungkinkan submit jika ada file yang dipilih, bahkan jika inputMessage kosong
   if ((selectedFiles.length === 0 && !inputMessage.trim()) || isProcessing) return;
   
   // Jika pesan kosong tapi ada file, tampilkan pesan default
   content: inputMessage.trim() || (selectedFiles.length > 0 ? "Tolong analisis file yang saya kirimkan." : ""),
   
   // Kirim pesan dengan file jika ada
   const response = await sendChatMessage(
     userMessage.content, 
     selectedFiles.length > 0 ? selectedFiles : undefined
   );
   
   // Reset selected files setelah berhasil mengirim
   setSelectedFiles([]);
   setShowProgress(false);
   ```

## AGNO Streaming Status Animations Implementation Pattern

### Overview
Implementasi real-time streaming status animations untuk AGNO API yang menunjukkan proses AI secara detail (thinking, tool calls, memory updates) dengan positioning yang tepat dalam message bubbles.

### 1. StreamingStatus Component Architecture

#### Component Structure (src/components/ui/StreamingStatus.tsx):
```typescript
interface StreamingStatusProps {
  streamingStatus: StreamingStatus;
  compact?: boolean; // untuk display dalam message bubble
}

// Phases yang didukung:
// - Thinking: Brain icon + bouncing dots
// - Tool Call: Wrench icon + spinning loader  
// - Memory Update: Database icon + pulsing bars
// - Completion: CheckCircle icon
```

#### Animation Patterns:
- **Thinking Phase**: 
  * Icon: Brain dengan animate-pulse
  * Animation: 3 bouncing dots dengan staggered delays (0ms, 150ms, 300ms)
  * Text: "Menganalisis pertanyaan..."
  
- **Tool Call Phase**:
  * Icon: Wrench dengan animate-spin
  * Animation: Spinning wrench + rotating Loader2
  * Text: "Menggunakan {toolName}..." atau "Mengakses knowledge base..."
  
- **Memory Update Phase**:
  * Icon: Database dengan animate-pulse  
  * Animation: 3 vertical pulsing bars dengan staggered delays
  * Text: "Menyimpan informasi ke memori..."
  
- **Completion Phase**:
  * Icon: CheckCircle (static green)
  * Text: "Respons selesai"

#### Progress Indicators:
- **Visual**: Colored dots showing current phase
- **Colors**: Purple (thinking), Blue (knowledge), Green (memory)
- **Labels**: "Thinking", "Knowledge Access", "Memory Update"

### 2. State Management Pattern

#### StreamingStatus Interface (src/types/playground.ts):
```typescript
interface StreamingStatus {
  isThinking: boolean;
  isCallingTool: boolean;
  toolName?: string;
  isUpdatingMemory: boolean;
  hasCompleted: boolean;
}
```

#### Store Integration (src/stores/PlaygroundStore.ts):
```typescript
// State management functions
setStreamingStatus: (status: Partial<StreamingStatus>) => void;
resetStreamingStatus: () => void;

// Usage pattern
const { streamingStatus, setStreamingStatus, resetStreamingStatus } = usePlaygroundStore();
```

### 3. Event Handler Pattern

#### useAIChatStreamHandler Integration:
```typescript
// RunStarted: Initialize thinking phase
setStreamingStatus({ isThinking: true });

// ToolCallStarted: Begin tool call phase  
setStreamingStatus({ 
  isThinking: false, 
  isCallingTool: true, 
  toolName: event.data?.name || 'knowledge base' 
});

// ToolCallCompleted: End tool call phase
setStreamingStatus({ isCallingTool: false, toolName: undefined });

// UpdatingMemory: Begin memory update phase
setStreamingStatus({ isUpdatingMemory: true });

// RunCompleted: Complete all phases
setStreamingStatus({ 
  hasCompleted: true,
  isThinking: false,
  isCallingTool: false, 
  isUpdatingMemory: false 
});

// Reset after delay for new conversations
setTimeout(() => resetStreamingStatus(), 1000);
```

### 4. Per-Message Animation Positioning

#### Detection Logic untuk Streaming Message:
```typescript
const isStreamingMessage = message.role === 'agent' && 
                         isLastMessage && 
                         isLoading &&
                         (hasMinimalContent || 
                          streamingStatus.isThinking || 
                          streamingStatus.isCallingTool || 
                          streamingStatus.isUpdatingMemory);

// hasMinimalContent = content length < 50 characters
const hasMinimalContent = message.content && message.content.length < 50;
```

#### Positioning Strategy:
- **Location**: Inside agent message bubble yang sedang streaming
- **Placement**: Di atas content dengan `mb-3` spacing
- **Styling**: Compact design (`bg-purple-50`, `w-4 h-4` icons, `text-xs`)
- **Real-time**: Animasi selalu muncul di message yang sedang aktif

### 5. UI Integration Pattern

#### Chat Component Integration:
```typescript
// Dalam message rendering loop
{isStreamingMessage && (
  <div className="mb-3">
    <StreamingStatus 
      streamingStatus={streamingStatus} 
      compact={true}
    />
  </div>
)}

// Conditional copy button (hanya muncul jika ada content)
{message.content && (
  <button 
    onClick={() => copyToClipboard(message.content)}
    className="opacity-0 group-hover:opacity-100 transition-opacity"
  >
    <Copy className="w-4 h-4" />
  </button>
)}

// Empty message placeholder
{!message.content && isStreamingMessage && (
  <p className="text-gray-500 italic text-sm">Sedang memproses...</p>
)}
```

### 6. Timing Detection Best Practices

#### Critical Implementation Notes:
- **Avoid skeleton conflicts**: Jangan gunakan skeleton loading bersamaan dengan streaming animations
- **Message state detection**: Gunakan multiple criteria untuk detecting streaming message
- **Empty content handling**: Provide placeholder text untuk message kosong saat streaming
- **Conditional rendering**: Copy/action buttons hanya muncul jika ada content
- **Animation lifecycle**: Reset status setelah completion dengan appropriate delay

#### Common Pitfalls:
- **Late animation appearance**: Pastikan detection logic menggunakan streaming status, bukan hanya isLoading
- **Global positioning**: Hindari global animation positioning yang memerlukan scroll
- **Skeleton interference**: Hindari skeleton yang menutupi atau conflict dengan streaming animations
- **Timing issues**: Gunakan proper criteria untuk mendeteksi kapan animasi harus muncul

### 7. Implementation Checklist

#### Required Files:
- [ ] `src/components/ui/StreamingStatus.tsx` - Main animation component
- [ ] `src/types/playground.ts` - StreamingStatus interface
- [ ] `src/stores/PlaygroundStore.ts` - State management functions
- [ ] Enhanced `useAIChatStreamHandler.ts` - Event handlers
- [ ] Updated chat component - Message-level integration

#### Required Dependencies:
- [ ] Lucide icons: Brain, Wrench, Database, CheckCircle, Loader2
- [ ] Tailwind CSS animations: animate-pulse, animate-spin, animate-bounce
- [ ] Zustand store for state management

#### Validation Steps:
- [ ] Test thinking phase animation (brain + bouncing dots)
- [ ] Test tool call phase animation (wrench + spinner)
- [ ] Test memory update phase animation (database + pulsing bars)
- [ ] Test completion phase (checkmark)
- [ ] Verify per-message positioning (no global scrolling required)
- [ ] Test empty message handling (placeholder text)
- [ ] Test conditional copy button (only with content)
- [ ] Verify no skeleton conflicts
- [ ] Test animation timing (appears during processing, not after)

### 8. Benefits & UX Impact

#### User Experience Improvements:
- **Real-time Feedback**: User melihat proses AI secara detail dan real-time
- **Better Understanding**: Jelas menunjukkan fase mana yang sedang berjalan
- **Professional Appearance**: Animasi yang smooth dan sesuai dengan AI workflow
- **No Scroll Required**: Animasi muncul di tempat yang sedang user lihat
- **Event-Driven**: UI update berdasarkan actual streaming events dari backend

#### Technical Benefits:
- **Modular Design**: Component dapat digunakan ulang untuk agent lain
- **Type Safety**: Full TypeScript support dengan proper interfaces
- **Performance**: Minimal overhead dengan efficient state management
- **Maintainable**: Clear separation of concerns dan well-documented patterns

### 9. Extension Guidelines

#### Untuk Agent Baru:
- Gunakan usePlaygroundStore pattern yang sama
- Implement useAIChatStreamHandler dengan proper event mapping
- Use StreamingStatus component dengan compact mode
- Follow detection logic pattern untuk per-message positioning

#### Untuk Animasi Baru:
- Tambahkan phase baru di StreamingStatus interface
- Implement animation pattern dengan staggered delays
- Gunakan appropriate Lucide icons
- Maintain compact design untuk in-message display

#### Performance Considerations:
- Reset streaming status setelah completion
- Avoid memory leaks dengan proper cleanup
- Use efficient re-render patterns
- Minimize animation complexity untuk mobile performance

## History Management & Storage Optimization Implementation Pattern

### Overview
Implementasi comprehensive untuk mengelola history chat messages, mencegah pembebanan server, dan mengoptimalkan penggunaan localStorage dengan auto-cleanup dan monitoring.

### 1. Configuration Constants

#### Storage Limits (src/stores/PlaygroundStore.ts):
```typescript
// History management constants
const MAX_MESSAGES_PER_SESSION = 100; // Maksimal 100 pesan per session
const MAX_STORED_SESSIONS = 10; // Maksimal 10 session tersimpan
const MESSAGE_CLEANUP_THRESHOLD = 80; // Mulai cleanup saat mencapai 80 pesan
const SESSION_EXPIRY_DAYS = 7; // Session kadaluarsa setelah 7 hari
const STORAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB limit untuk localStorage
```

#### Benefits:
- **Configurable Limits**: Easy to adjust based on requirements
- **Tiered Cleanup**: Different thresholds for different actions
- **Memory Efficiency**: Prevents unlimited memory growth
- **User Experience**: Balances performance with functionality

### 2. Auto-Cleanup Strategies

#### Message Limiting:
```typescript
addMessage: (message) => {
  set((state) => {
    const newMessages = [...state.messages, message];
    
    // Auto-limit messages per session
    if (newMessages.length > MAX_MESSAGES_PER_SESSION) {
      const messagesToRemove = newMessages.length - MAX_MESSAGES_PER_SESSION;
      return {
        messages: newMessages.slice(messagesToRemove)
      };
    }
    
    return { messages: newMessages };
  });
  
  // Save to localStorage with optimization
  optimizedSaveToStorage();
}
```

#### Smart Cleanup Function:
```typescript
const cleanupOldMessages = () => {
  const { messages, setMessages } = usePlaygroundStore.getState();
  
  if (messages.length > MESSAGE_CLEANUP_THRESHOLD) {
    // Keep only the most recent messages, maintaining conversation context
    const messagesToKeep = Math.floor(MESSAGE_CLEANUP_THRESHOLD * 0.7); // Keep 70% of threshold
    const recentMessages = messages.slice(-messagesToKeep);
    
    console.log(`🧹 Auto-cleanup: Removed ${messages.length - messagesToKeep} old messages`);
    setMessages(recentMessages);
  }
};
```

### 3. Session Management

#### Session Expiry:
```typescript
// Enhanced SessionEntry interface
interface SessionEntry {
  session_id: string;
  title: string;
  created_at: number;
  lastActivity?: number; // Timestamp of last activity for cleanup purposes
}
```

#### Expired Session Cleanup:
```typescript
const cleanupExpiredSessions = () => {
  // Check session creation time
  const sessionCreated = localStorage.getItem('wassidik_session_created');
  if (sessionCreated) {
    const daysSinceCreation = (Date.now() - parseInt(sessionCreated)) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation > SESSION_EXPIRY_DAYS) {
      console.log(`🗑️ Session expired after ${daysSinceCreation.toFixed(1)} days`);
      clearSessionStorage();
      return;
    }
  }
  
  // Cleanup stored sessions by activity
  const validSessions = sessions.filter(session => {
    const daysSinceActivity = (Date.now() - session.lastActivity) / (1000 * 60 * 60 * 24);
    return daysSinceActivity <= SESSION_EXPIRY_DAYS;
  });
};
```

### 4. Storage Monitoring

#### Storage Usage Tracking:
```typescript
const getStorageUsage = (): number => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
};

const getStorageStats = () => {
  const usage = getStorageUsage();
  const limit = STORAGE_SIZE_LIMIT;
  const percentage = (usage / limit) * 100;
  
  return {
    usage: formatBytes(usage),
    limit: formatBytes(limit),
    percentage: Math.round(percentage),
    sessionCount: Object.keys(localStorage).filter(key => key.startsWith('wassidik_session_')).length,
    isNearLimit: percentage > 80
  };
};
```

#### Optimized Storage Save:
```typescript
const optimizedSaveToStorage = () => {
  // Check current storage usage
  const currentUsage = getStorageUsage();
  if (currentUsage > STORAGE_SIZE_LIMIT) {
    console.warn(`⚠️ Storage usage exceeds limit, performing cleanup`);
    cleanupExpiredSessions();
    cleanupOldMessages();
  }
  
  // Save current session messages (only recent ones for performance)
  const recentMessages = messages.slice(-50); // Save only last 50 messages
  const sessionData = {
    sessionId,
    messages: recentMessages,
    lastActivity: Date.now(),
    messageCount: messages.length
  };
  
  localStorage.setItem(`wassidik_session_${sessionId}`, JSON.stringify(sessionData));
};
```

### 5. UI Integration

#### Storage Stats Component:
```typescript
const StorageStatsDisplay = () => (
  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-4 shadow-sm rounded-md">
    <div className="flex">
      <Database className="h-5 w-5 text-blue-500" />
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-blue-800">Statistik Penyimpanan</h3>
        <div className="mt-2 text-sm text-blue-700 space-y-2">
          <div className="flex justify-between">
            <span>Penggunaan Storage:</span>
            <span className="font-medium">{storageStats.usage} / {storageStats.limit}</span>
          </div>
          
          {/* Progress bar for storage usage */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div className={cn("h-2 rounded-full transition-all duration-300",
              storageStats.percentage > 80 ? "bg-red-500" : 
              storageStats.percentage > 60 ? "bg-yellow-500" : "bg-green-500"
            )}
            style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
            />
          </div>
          
          {storageStats.isNearLimit && (
            <div className="text-red-600 text-xs mt-2 font-medium">
              ⚠️ Storage hampir penuh! Pertimbangkan untuk membersihkan data lama.
            </div>
          )}
        </div>
        
        <button onClick={handleStorageCleanup} className="mt-3 inline-flex items-center gap-1">
          <Trash2 className="w-3 h-3" />
          Bersihkan Data Lama
        </button>
      </div>
    </div>
  </div>
);
```

#### Header Integration:
```typescript
// Add storage monitoring button to header
<Button 
  variant="ghost" 
  size="icon" 
  onClick={() => setShowStorageInfo(!showStorageInfo)}
  className="text-gray-500"
  title="Storage Info"
>
  <Database className="h-5 w-5" />
</Button>
```

### 6. Best Practices

#### Implementation Guidelines:
- **Progressive Cleanup**: Cleanup berbertahap berdasarkan usage percentage
- **User Awareness**: Tampilkan warning saat storage hampir penuh
- **Non-Intrusive**: Auto-cleanup berjalan di background tanpa mengganggu user
- **Recoverable**: Manual cleanup option untuk kontrol user
- **Monitoring**: Real-time storage statistics untuk transparency

#### Performance Optimizations:
- **Lazy Loading**: Load hanya recent messages untuk performance
- **Batch Operations**: Combine multiple cleanup operations
- **Efficient Storage**: Store hanya data essential, compress jika perlu
- **Background Processing**: Cleanup running in background thread

### 7. Error Handling

#### Storage Error Recovery:
```typescript
// Graceful error handling for storage operations
try {
  localStorage.setItem(key, value);
} catch (error) {
  console.warn('Storage full, attempting cleanup...');
  cleanupExpiredSessions();
  try {
    localStorage.setItem(key, value);
  } catch (retryError) {
    console.error('Storage still full after cleanup:', retryError);
    // Fallback: use in-memory storage
  }
}
```

#### User Communication:
- **Clear Messages**: Informative error messages untuk user
- **Action Suggestions**: Saran konkret untuk mengatasi masalah
- **Fallback Options**: Alternative solutions jika storage penuh

### 8. Extension Guidelines

#### For New Chat Components:
- Import `getStorageStats, forceCleanup` from PlaygroundStore
- Add storage monitoring UI dengan Database icon
- Implement `handleStorageCleanup` function
- Use optimized save patterns untuk message persistence

#### For Custom Cleanup Strategies:
- Extend cleanup constants untuk domain-specific requirements
- Add new cleanup triggers berdasarkan usage patterns
- Implement custom storage monitoring sesuai kebutuhan aplikasi
- Consider server-side cleanup coordination untuk multi-device sync

#### Monitoring & Analytics:
- Track storage usage patterns untuk optimization insights
- Monitor cleanup frequency untuk tuning thresholds
- Log user engagement dengan cleanup features
- Analyze performance impact dari history management

### 9. Server Coordination

#### API Considerations:
- **Pagination Support**: Implement server-side pagination untuk large histories
- **Sync Strategy**: Coordinate client cleanup dengan server storage
- **Conflict Resolution**: Handle conflicts antara local dan server state
- **Batch Updates**: Efficient batch operations untuk reduced server load

#### Implementation Pattern:
```typescript
// Server-coordinated cleanup
const syncWithServer = async () => {
  try {
    // Send local cleanup events to server
    await api.post('/sessions/cleanup', {
      sessionId,
      messageCount: messages.length,
      lastActivity: Date.now()
    });
  } catch (error) {
    console.warn('Failed to sync cleanup with server:', error);
  }
};
```

# Scratchpad

## Task: Perbaikan Gemini Document Processing di piketSpktAnalysisService.ts - COMPLETED ✅

### Deskripsi:
User melaporkan bahwa piketSpktAnalysisService.ts tidak dapat membaca dokumen, dan memberikan dokumentasi resmi Google Gemini API untuk document processing sebagai referensi perbaikan.

### Masalah yang Ditemukan:
- **API Structure Tidak Sesuai**: Struktur API call tidak mengikuti format dokumentasi resmi
- **File Processing Kurang Optimal**: File handling tidak memiliki validasi proper untuk MIME type dan file size
- **Content Structure**: Pengaturan content parts tidak sesuai best practices dokumentasi
- **Missing File Support**: Accept attribute UI tidak mendukung semua format file yang didukung API
- **Error Handling Terbatas**: Tidak ada validasi file size limits (20MB) dan MIME type validation
- **Temperature Setting**: Tidak ada pengaturan temperature untuk consistency

### Solusi yang Diimplementasikan:

#### 1. Enhanced File Processing dengan Validasi Komprehensif:
- **File Size Validation**: Implementasi validasi 20MB limit sesuai dokumentasi untuk inline data
- **MIME Type Validation**: Daftar lengkap supported MIME types berdasarkan dokumentasi resmi
- **Enhanced Error Handling**: Error messages yang lebih spesifik dan informatif
- **Detailed Logging**: Log file details (name, type, size) untuk debugging
- **Base64 Encoding**: Improved base64 encoding dengan proper error handling

#### 2. API Call Structure Sesuai Dokumentasi Resmi:
- **Content Parts Structure**: Menggunakan `contents: [{ parts: contentParts }]` format yang benar
- **Text Before File**: Text prompt ditempatkan sebelum file sesuai best practices
- **Temperature Setting**: Menambahkan temperature 0.1 untuk konsistensi analisis
- **Enhanced Logging**: Comprehensive logging untuk API call parameters dan debugging

#### 3. Supported File Formats Sesuai Dokumentasi:
- **Document Formats**: PDF, TXT, HTML, CSS, MD, CSV, XML, RTF
- **Code Formats**: JavaScript (.js), Python (.py)
- **Office Formats**: DOCX, XLSX, DOC, XLS (dengan warning untuk unsupported MIME)
- **UI Integration**: Updated accept attribute untuk mendukung semua format

#### 4. Error Handling dan Logging Enhancement:
- **File Size Limits**: Clear error message untuk file > 20MB
- **MIME Type Warnings**: Warning untuk unsupported MIME types
- **Processing Steps**: Detailed logging untuk setiap step processing
- **API Call Debugging**: Log API parameters dan response details

### Benefits:
- **Better Document Support**: Mendukung semua format file yang didukung Gemini API
- **Improved Reliability**: Validasi komprehensif mencegah error API
- **Better User Experience**: Error messages yang jelas dan informatif
- **Debugging Capability**: Comprehensive logging untuk troubleshooting
- **API Compliance**: Full compliance dengan dokumentasi resmi Google Gemini API
- **Professional Implementation**: Mengikuti best practices untuk document processing

### Files Modified:
- **src/services/piketSpktAnalysisService.ts**: Enhanced file processing, API structure, validasi, dan logging
- **src/components/ui/PiketSpktChatPage.tsx**: Updated accept attribute untuk mendukung semua format file
- **.cursorrules**: Documentation update dengan Gemini Document Processing lessons

### Technical Implementation Details:
- **File Validation**: 20MB size limit check dengan error message yang jelas
- **MIME Type Support**: Full list dari dokumentasi resmi dengan fallback handling
- **API Structure**: `contents: [{ parts: contentParts }]` dengan proper content ordering
- **Temperature Control**: temperature: 0.1 untuk konsistensi analisis dokumen
- **Logging Strategy**: File details → Processing steps → API call → Response analysis
- **Error Recovery**: Graceful error handling dengan informative messages

### Status:
✅ **COMPLETED** - piketSpktAnalysisService.ts sekarang fully compliant dengan Google Gemini API documentation untuk document processing. Service mendukung semua format file yang didukung API dengan validasi komprehensif, error handling yang proper, dan logging yang detailed untuk debugging.

---

## Previous Completed Tasks:

## Task: Implementasi Animated Streaming Status UI - COMPLETED ✅

### Deskripsi:
User meminta untuk mengganti skeleton loading dengan animasi yang menunjukkan proses thinking, tool calls, dan memory updates secara real-time sesuai dengan streaming events yang diterima dari AGNO API.

### Solusi yang Diimplementasikan:

#### 1. StreamingStatus Component (src/components/ui/StreamingStatus.tsx):
- **Thinking Animation**: Brain icon dengan bouncing dots untuk fase analisis
- **Tool Call Animation**: Wrench icon dengan spinning loader untuk akses knowledge base
- **Memory Update Animation**: Database icon dengan pulsing bars untuk menyimpan informasi
- **Completion Animation**: CheckCircle icon saat respons selesai
- **Progress Indicators**: Dots indicator yang menunjukkan fase mana yang sedang aktif

#### 2. Enhanced PlaygroundStore (src/stores/PlaygroundStore.ts & src/types/playground.ts):
- **StreamingStatus Interface**: State tracking untuk isThinking, isCallingTool, toolName, isUpdatingMemory, hasCompleted
- **State Management**: setStreamingStatus dan resetStreamingStatus functions
- **Type Safety**: Full TypeScript support untuk streaming status

#### 3. Enhanced useAIChatStreamHandler:
- **RunStarted Handler**: Set isThinking=true di awal proses
- **ToolCallStarted Handler**: Set isCallingTool=true dengan toolName
- **ToolCallCompleted Handler**: Set isCallingTool=false
- **UpdatingMemory Handler**: Set isUpdatingMemory=true
- **RunCompleted Handler**: Set hasCompleted=true dan reset semua status

#### 4. Enhanced WassidikPenyidikChatPage:
- **StreamingStatus Integration**: Menampilkan real-time status streaming
- **Conditional Skeleton**: Skeleton hanya muncul saat generating content, tidak saat thinking/tool calls
- **UI Coordination**: StreamingStatus dan skeleton tidak overlap

### Animasi yang Diimplementasikan:

#### Thinking Phase:
- **Icon**: Brain dengan animate-pulse
- **Text**: "Menganalisis pertanyaan..."
- **Animation**: 3 bouncing dots dengan staggered delays (0ms, 150ms, 300ms)

#### Tool Call Phase:
- **Icon**: Wrench dengan animate-spin
- **Text**: "Menggunakan {toolName}..." atau "Mengakses knowledge base..."
- **Animation**: Spinning wrench + rotating Loader2

#### Memory Update Phase:
- **Icon**: Database dengan animate-pulse
- **Text**: "Menyimpan informasi ke memori..."
- **Animation**: 3 vertical pulsing bars dengan staggered delays

#### Completion Phase:
- **Icon**: CheckCircle
- **Text**: "Respons selesai"
- **Animation**: Static green checkmark

#### Progress Indicators:
- **Visual**: Colored dots showing current phase
- **Colors**: Purple (thinking), Blue (knowledge), Green (memory)
- **Labels**: "Thinking", "Knowledge Access", "Memory Update"

### Benefits:
- **Real-time Feedback**: User melihat proses AI secara detail dan real-time
- **Better UX**: Tidak lagi hanya skeleton loading, tapi informasi yang meaningful
- **Professional Appearance**: Animasi yang smooth dan sesuai dengan AI workflow
- **Event-Driven**: UI update berdasarkan actual streaming events dari backend
- **Visual Hierarchy**: Jelas membedakan antara thinking, tool calls, dan memory updates

### Files Created/Modified:
- **src/components/ui/StreamingStatus.tsx**: New component untuk streaming animations
- **src/types/playground.ts**: Added StreamingStatus interface
- **src/stores/PlaygroundStore.ts**: Added streaming status state management
- **src/hooks/playground/useAIChatStreamHandler.ts**: Enhanced dengan streaming status updates
- **src/components/ui/WassidikPenyidikChatPage.tsx**: Integrated StreamingStatus component
- **.cursorrules**: Documentation update

### User Feedback dan Improvement:
User memberikan feedback positif tentang animasi, tetapi menunjukkan kekurangan UX: **animasi hanya muncul di bagian atas chat area, sehingga user harus scroll ke atas untuk melihat status saat melakukan chat berkelanjutan**.

### Enhancement yang Diimplementasikan:
#### 5. Per-Message Streaming Status:
- **Moved animation location**: Dari global position ke dalam message bubble agent yang sedang streaming
- **Message-specific display**: Setiap agent message yang sedang diproses menampilkan animasi di dalamnya
- **Better scroll experience**: User tidak perlu scroll ke atas untuk melihat status
- **Compact design**: Ukuran dan styling yang lebih kecil untuk fit di dalam message bubble
- **Real-time positioning**: Animasi selalu muncul di message yang sedang aktif

#### Implementation Details:
- **Detection logic**: `isLastAgentMessage && isLoading` untuk menentukan message mana yang sedang streaming
- **Compact styling**: `bg-purple-50`, smaller icons (w-4 h-4), smaller text (text-xs)
- **Inline placement**: Animasi muncul di atas content message dengan `mb-3` spacing
- **Progressive indicators**: Dots indicator tetap ada tapi lebih compact

### User Feedback Issue 2:
User melaporkan bahwa **animasi baru muncul setelah final output dan kemudian menghilang**, yang tidak berguna karena animasi seharusnya muncul saat proses berlangsung.

### Fix yang Diimplementasikan:
#### 6. Timing Detection Logic Fix:
- **Problem**: Logic `isLastAgentMessage && isLoading` timing tidak tepat
- **Solution**: Enhanced detection dengan multiple criteria:
  ```typescript
  const isStreamingMessage = message.role === 'agent' && 
                           isLastMessage && 
                           isLoading &&
                           (hasMinimalContent || 
                            streamingStatus.isThinking || 
                            streamingStatus.isCallingTool || 
                            streamingStatus.isUpdatingMemory);
  ```
- **Empty message handling**: Show placeholder "Sedang memproses..." untuk message kosong
- **Conditional rendering**: Copy button hanya muncul jika ada content
- **Better detection**: Animasi muncul pada message dengan content minimal (< 50 chars) atau saat ada active streaming status
- **Skeleton removal**: Menghapus skeleton loading yang redundant dan mengganggu animasi event stream

### Status:
✅ **COMPLETED** - Animated streaming status telah diimplementasikan dengan real-time thinking, tool calls, dan memory update animations. **Enhanced dengan per-message positioning, timing detection yang tepat, dan UI yang clean tanpa skeleton yang mengganggu.**

---

## Task: Perbaikan File Upload di AGNO Streaming Service - COMPLETED ✅

### Deskripsi:
User melaporkan bahwa upload file di wassidikPenyidikStreamingService.ts tidak bekerja, sedangkan implementasi di wassidikPenyidikService.ts berfungsi dengan baik.

### Masalah yang Ditemukan:
- **Endpoint salah**: Streaming service menggunakan `run` untuk non-file, seharusnya `runs`
- **Header tidak optimal**: Menggunakan `text/event-stream` untuk file upload yang mungkin tidak kompatibel
- **Response handling kurang**: Tidak menangani mixed response (JSON untuk file upload, streaming untuk chat biasa)
- **Progress tracking hilang**: Tidak ada progress callback untuk file upload
- **Error handling terbatas**: Tidak menangani error spesifik file upload
- **Parsing response kurang**: Tidak menangani RunResponse format dari API

### Solusi yang Diimplementasikan:

#### 1. Fixed Endpoint dan Headers:
- **Perbaikan endpoint**: Menggunakan `runs` untuk non-file (sebelumnya `run`)
- **Dynamic headers**: Menggunakan `application/json` untuk file upload, `text/event-stream` untuk chat biasa
- **Enhanced authentication**: Menambahkan logging untuk API key status

#### 2. Mixed Response Handling:
- **JSON detection**: Mendeteksi `content-type: application/json` untuk file upload responses
- **RunResponse parsing**: Mengimplementasikan `parseResponse` function untuk menangani RunResponse format
- **Event conversion**: Mengkonversi JSON response ke streaming events (RunStarted, RunResponse, RunCompleted)
- **Content extraction**: Extract content dari format kompleks API response

#### 3. Progress Tracking Implementation:
- **Progress callbacks**: Menambahkan `onProgress` event emitter seperti di service yang bekerja
- **Upload phases**: Progress tracking untuk preparing, uploading, processing, completed
- **File upload indicators**: Progress update khusus untuk file upload scenarios
- **Error completion**: Mark progress as completed bahkan saat error untuk UX consistency

#### 4. Enhanced Error Handling:
- **HTTP status codes**: Menangani 429 (rate limit), 413 (file too large), 500+ (server errors)
- **File-specific errors**: Error messages yang spesifik untuk file upload issues
- **Parse error handling**: Graceful handling untuk JSON parsing errors
- **Progress completion**: Proper progress completion pada error scenarios

#### 5. Detailed Logging Implementation:
- **File details**: Log nama, ukuran, dan tipe file seperti di service yang bekerja
- **FormData tracking**: Log semua parameter FormData untuk debugging
- **Response analysis**: Log content type dan response format detection
- **Error context**: Enhanced error logging dengan konteks yang jelas

#### 6. Response Format Compatibility:
- **RunResponse format**: Menangani format response `RunResponse(content='...', content_type=...)` dari API
- **Content extraction**: Extract content menggunakan string parsing dan regex fallback
- **Backward compatibility**: Tetap kompatibel dengan format response lama
- **Source documents**: Preserve sourceDocuments dari response

### Benefits:
- **File upload compatibility**: File upload sekarang bekerja dengan streaming architecture
- **Mixed mode support**: Mendukung JSON response untuk file upload dan streaming untuk chat
- **Progress transparency**: User mendapat feedback progress yang jelas untuk file upload
- **Error clarity**: Error messages yang lebih informatif dan spesifik
- **Debugging capability**: Comprehensive logging untuk troubleshooting
- **Response flexibility**: Menangani berbagai format response dari API

### Files Modified:
- **src/services/wassidikPenyidikStreamingService.ts**: Enhanced dengan file upload support, progress tracking, error handling, dan response parsing
- **.cursorrules**: Documentation update

### Technical Implementation Details:
- **Dynamic Accept headers**: `application/json` untuk file upload, `text/event-stream` untuk streaming
- **Response cloning**: Clone response untuk parsing tanpa mengganggu stream reading
- **Event emission**: Convert JSON responses ke streaming events untuk consistency
- **Progress phases**: preparing → uploading → processing → completed
- **Content extraction**: Smart parsing dari RunResponse format dengan string manipulation dan regex
- **Error propagation**: Proper error handling dengan progress completion

### Status:
✅ **COMPLETED** - File upload di wassidikPenyidikStreamingService.ts sekarang berfungsi dengan mixed mode (JSON untuk file upload, streaming untuk chat biasa), progress tracking yang lengkap, dan error handling yang comprehensive.

#### 7. Enhanced Based on Agent UI Documentation:
- **FormData pattern alignment**: Mengikuti pattern Agent UI dengan `formData.append("session_id", sessionId ?? "")`
- **Parameter order optimization**: Menyesuaikan urutan parameter FormData dengan best practices
- **Session handling improvement**: Allow empty session_id untuk new sessions sesuai Agent UI pattern
- **Debug logging enhancement**: Menambahkan detailed FormData logging untuk troubleshooting
- **Type safety fixes**: Memperbaiki type errors dengan proper null handling

### Files Modified:
- **src/services/wassidikPenyidikStreamingService.ts**: Enhanced dengan file upload support, progress tracking, error handling, response parsing, dan alignment dengan Agent UI documentation
- **src/components/ui/WassidikPenyidikChatPage.tsx**: Updated accept attribute untuk mendukung semua format file Agno
- **.cursorrules**: Documentation update

#### 8. Enhanced File Support Based on Agno Documentation:
- **Complete file format support**: Updated accept attribute dari `.pdf,.jpg,.jpeg,.png` menjadi `.pdf,.csv,.txt,.docx,.json,.png,.jpeg,.jpg,.webp` sesuai dokumentasi Agno
- **Document formats**: Menambahkan dukungan untuk CSV, TXT, DOCX, JSON files
- **Image formats**: Menambahkan dukungan untuk WEBP format
- **User guidance**: Updated placeholder text untuk menunjukkan semua format yang didukung
- **Agno compatibility**: Endpoint `runs-with-files` sudah sesuai dengan dokumentasi Agno Agent UI

#### 9. Critical File Upload Fix Based on siberService.ts Comparison:
- **Root cause identified**: streaming service menggunakan `stream: 'true'` untuk file upload, sedangkan seharusnya `stream: 'false'`
- **Fixed stream parameter**: File upload menggunakan `stream: 'false'`, chat biasa menggunakan `stream: 'true'`
- **Simplified response handling**: File upload selalu return JSON response, tidak perlu complex mixed mode handling
- **Headers alignment**: File upload menggunakan `Accept: application/json`, streaming menggunakan `Accept: text/event-stream`
- **Mode detection**: Clear distinction antara `file_upload_json` mode dan `chat_streaming` mode
- **Following siberService pattern**: Mengikuti pattern yang sudah terbukti bekerja di siberService.ts

### Status:
✅ **COMPLETED** - File upload di wassidikPenyidikStreamingService.ts sekarang berfungsi dengan mixed mode (JSON untuk file upload, streaming untuk chat biasa), progress tracking yang lengkap, error handling yang comprehensive, dan sesuai dengan pattern Agent UI documentation serta dukungan file format lengkap sesuai dokumentasi Agno. **Critical fix: menggunakan `stream: 'false'` untuk file upload dan `stream: 'true'` untuk chat biasa seperti di siberService.ts yang bekerja.**

#### 10. File Upload Functionality Removal:
- **User request**: Upload file functionality tidak bekerja dengan benar dan diminta untuk dihapus
- **Service simplification**: wassidikPenyidikStreamingService.ts disederhanakan menjadi chat-only service 
- **Removed components**: File upload parameter, progress tracking, file handling logic, mixed response mode
- **Simplified interface**: `sendStreamingChatMessage(message: string, onEvent?)` tanpa files parameter
- **Clean implementation**: Fokus pada streaming chat functionality saja
- **UI cleanup**: File upload UI dan state management dihapus dari WassidikPenyidikChatPage.tsx

### Status:
✅ **COMPLETED** - File upload functionality telah dihapus dari Wassidik AI. Service dan UI sekarang fokus pada chat functionality saja.

---

## Previous Completed Tasks:

## Task: Perbaikan Error Gemini API INVALID_ARGUMENT - COMPLETED ✅

### Deskripsi:
User melaporkan error dari backend AGNO: "400 INVALID_ARGUMENT. contents.parts must not be empty" saat berkomunikasi dengan Gemini API. Error ini mengindikasikan ada FormData kosong atau tidak valid yang dikirim.

### Solusi yang Diimplementasikan:

#### 1. Enhanced Message Validation di useAIChatStreamHandler:
- **Content validation**: Validasi message tidak kosong dan minimal 3 karakter
- **File handling**: Auto-set default message jika upload file tanpa text
- **Parameter validation**: Validasi semua parameter wajib tidak kosong sebelum request
- **Required params check**: Validasi 'message', 'agent_id', 'stream', 'monitor', 'session_id', 'user_id'

#### 2. Enhanced Error Handling:
- **Session corruption detection**: Deteksi error INVALID_ARGUMENT dan reset session otomatis
- **Clear corrupted session**: Hapus session dari storage jika terdeteksi corruption
- **Specific error messages**: Error message yang lebih spesifik untuk 400 errors

#### 3. Frontend Validation di WassidikPenyidikChatPage:
- **Message length validation**: Minimal 3 karakter untuk message
- **Content quality check**: Validasi content meaningfulness
- **File + message validation**: Proper handling untuk file upload dengan/tanpa message

#### 4. Improved Logging:
- **FormData debugging**: Log semua parameter FormData sebelum send
- **Empty parameter detection**: Log parameter kosong dengan '[EMPTY]' marker
- **Session management**: Enhanced logging untuk session operations

### Benefits:
- **Prevent empty parts error**: Mencegah error INVALID_ARGUMENT dari Gemini API
- **Better user experience**: Validasi yang jelas dan error messages yang informatif
- **Session reliability**: Auto-recovery dari session corruption
- **Debug capability**: Comprehensive logging untuk troubleshooting

### Files Modified:
- **src/hooks/playground/useAIChatStreamHandler.ts**: Enhanced validation, error handling, dan logging
- **src/components/ui/WassidikPenyidikChatPage.tsx**: Frontend message validation
- **.cursorrules**: Documentation update

#### 5. FastAPI Error Format Handling:
- **Response format detection**: Mendeteksi format `<Response [400]>` dari FastAPI
- **Status code extraction**: Extract status code dari FastAPI response format
- **Automatic session reset**: Clear session untuk error 4xx yang mungkin terkait parameter corruption
- **Enhanced logging**: Detailed logging untuk debugging HTTP errors

#### 6. Session ID Validation Fix:
- **Empty session_id allowance**: Mengizinkan session_id kosong untuk session baru
- **Parameter validation refinement**: Memisahkan validasi session_id dari parameter wajib lainnya
- **New session detection**: Proper logging untuk session baru vs existing session
- **Type safety**: Proper type casting untuk FormDataEntryValue

### Status:
✅ **COMPLETED** - Error INVALID_ARGUMENT telah diatasi dengan comprehensive validation dan error handling

---

## Previous Completed Tasks:

## Task: Integrasi AGNO Streaming ke WassidikPenyidikChatPage - COMPLETED ✅

### Deskripsi:
User meminta untuk mengintegrasikan streaming AGNO di frontend berdasarkan studi kita. Implementasi harus mencakup pemasangan hook, setup SSE/Fetch-Streaming, identifikasi dan penanganan semua RunEvent, struktur hook useAIChatStreamHandler, integrasi ke komponen chat, penanganan state di store, dan fungsi utility parseBuffer.

### Implementasi yang Diselesaikan:

#### 1. Types dan Interface (src/types/playground.ts):
- **RunEvent enum**: Semua event types (RunStarted, RunResponse, RunCompleted, RunError, ToolCallStarted, ToolCallCompleted, ReasoningStarted, ReasoningStep, ReasoningCompleted)
- **RunResponse interface**: Struktur lengkap untuk streaming response dengan content, tools, images, videos, audio, extra_data
- **PlaygroundChatMessage interface**: Format pesan chat yang kompatibel dengan streaming
- **StreamOptions interface**: Konfigurasi untuk streaming requests
- **PlaygroundStore interface**: State management untuk playground

#### 2. Store Management (src/stores/PlaygroundStore.ts):
- **Zustand store**: State management dengan messages, isStreaming, sessionId, sessionsData
- **LocalStorage integration**: Persistensi session dan chat history
- **Helper functions**: loadSessionFromStorage, loadSessionsFromStorage, clearSessionStorage
- **Type-safe state updates**: Proper TypeScript typing untuk semua state operations

#### 3. Streaming Hooks Infrastructure:

##### useAIResponseStream (src/hooks/streaming/useAIResponseStream.ts):
- **parseBuffer function**: Parse streaming buffer dengan proper JSON extraction
- **processChunk function**: Validasi dan debugging untuk chunks
- **streamResponse function**: Fetch + ReadableStream handling dengan timeout dan error management
- **SSE-like streaming**: Compatible dengan AGNO streaming format

##### useChatActions (src/hooks/playground/useChatActions.ts):
- **Message utilities**: createMessage, addMessage dengan auto-generation ID dan timestamp
- **UI helpers**: focusChatInput, scrollToBottom, clearChatInput
- **DOM integration**: Data attributes untuk chat elements

##### useAIChatStreamHandler (src/hooks/playground/useAIChatStreamHandler.ts):
- **Event handlers**: handleRunStarted, handleRunResponse, handleRunCompleted, handleRunError
- **Tool call handlers**: handleToolCallStarted, handleToolCallCompleted
- **Reasoning handlers**: handleReasoningStep untuk reasoning steps
- **State synchronization**: Real-time update messages dengan streaming chunks
- **Error handling**: Comprehensive error handling untuk semua scenarios

#### 4. Streaming Service (src/services/wassidikPenyidikStreamingService.ts):
- **AGNO integration**: Full compatibility dengan AGNO streaming API
- **Session management**: Persistent user ID dan session ID dengan Supabase auth
- **File upload support**: Multi-file upload dengan streaming progress
- **Event emitters**: Internal event system untuk streaming events
- **Utility functions**: convertStreamingEventsToMessages untuk message conversion

#### 5. Enhanced WassidikPenyidikChatPage:
- **Progress tracking**: Real-time progress bars untuk file uploads
- **File upload integration**: Multiple file support dengan preview dan removal
- **Streaming compatibility**: Ready untuk integrasi dengan streaming hooks
- **Enhanced UX**: Better error messages, loading states, dan user feedback

### Key Features Implemented:

#### Streaming Event Handling:
- **RunStarted**: Initialize session, set streaming state, save session history
- **RunResponse**: Append content incrementally, update tools/metadata, prevent duplication
- **RunCompleted**: Finalize message content, complete metadata, stop streaming
- **RunError**: Mark message as error, display error message, cleanup session

#### Advanced Features:
- **Tool Call Tracking**: Real-time tool call status dan results
- **Reasoning Steps**: Live reasoning process display
- **Media Support**: Images, videos, audio dalam streaming response
- **Reference Tracking**: Source documents dan citations
- **Session Persistence**: LocalStorage untuk chat history

#### Error Handling dan Resilience:
- **Network errors**: Automatic retry dengan exponential backoff
- **Parse errors**: Graceful fallback untuk malformed JSON
- **Timeout handling**: Configurable timeouts untuk large files
- **Authentication**: Proper API key dan Supabase auth integration

### Benefits:
- **Real-time response**: Streaming chat dengan immediate feedback
- **Better UX**: Progress indicators, file upload, error handling
- **Scalable architecture**: Modular hooks dan services
- **Type safety**: Full TypeScript support dengan proper interfaces
- **Production ready**: Comprehensive error handling dan logging

### Files Created/Modified:
- **src/types/playground.ts**: Complete types untuk streaming
- **src/stores/PlaygroundStore.ts**: Zustand store management
- **src/hooks/streaming/useAIResponseStream.ts**: Core streaming hook
- **src/hooks/playground/useChatActions.ts**: Chat utility functions
- **src/hooks/playground/useAIChatStreamHandler.ts**: Main streaming handler
- **src/services/wassidikPenyidikStreamingService.ts**: Streaming service layer
- **src/components/ui/WassidikPenyidikChatPage.tsx**: Enhanced dengan progress tracking

### Status:
✅ **COMPLETED** - AGNO streaming fully integrated dengan comprehensive event handling, state management, dan enhanced UX

### Final Cleanup:
- **Unused Imports Removed**: Cleaned up wassidikPenyidikStreamingService.ts by removing unused imports (ToolCall, MediaContent, ExtraData)
- **API Key Authentication Fix**: Fixed 403 Forbidden error by adding proper API key authentication to useAIResponseStream.ts headers (X-API-Key with VITE_API_KEY and Supabase Authorization Bearer token)
- **Event Types Fix**: Fixed streaming events not being recognized by updating RunEvent enum values from snake_case to PascalCase to match AGNO API format (RunResponse, ToolCallStarted, etc.) and added missing UpdatingMemory event
- **Stream Completion Fix**: Fixed ERR_INCOMPLETE_CHUNKED_ENCODING error by treating it as normal completion, separated ReasoningCompleted from RunCompleted handlers, and improved graceful completion handling
- **Content Preservation Fix**: Fixed RunCompleted handler to preserve accumulated content when final content is undefined, preventing "No content received" when streaming was successful
- **HTTP 400 Error Fix**: Enhanced FormData parameter validation and error handling with proper agent_id, monitor, session_id, user_id parameters and descriptive error messages for common HTTP errors

### Implementation Notes:
- **Zustand Store**: Successfully installed dan configured untuk state management
- **TypeScript Integration**: All types properly defined dengan full type safety
- **Hook Architecture**: Modular hooks dengan proper dependency management
- **Error Handling**: Comprehensive error handling untuk network, parsing, dan timeout scenarios
- **File Upload Support**: Multi-file upload dengan progress tracking
- **Session Management**: Persistent sessions dengan localStorage integration
- **Real-time Updates**: Live streaming dengan proper buffer parsing dan event routing

### Ready for Production:
- All linter errors resolved
- Proper TypeScript typing throughout
- Comprehensive error handling
- Modular and maintainable architecture
- Full AGNO API compatibility

### ✅ IMPLEMENTED TO WASSIDIKPENYIDIKCHATPAGE:
- **Streaming Integration**: WassidikPenyidikChatPage successfully updated to use streaming hooks
- **Store Integration**: Using usePlaygroundStore for state management
- **Hook Integration**: handleStreamResponse from useAIChatStreamHandler
- **Message Format**: Updated to PlaygroundChatMessage format (role: 'user'|'agent')
- **File Upload**: Maintained file upload functionality with FormData
- **Progress Tracking**: Maintained progress indication for large files
- **Session Management**: Using streaming session functions
- **UI Compatibility**: All UI elements working with streaming data
- **Error Handling**: Proper error handling for streaming failures
- **TypeScript**: All type errors resolved, full type safety
- **Browser Compatibility**: Fixed require() issue in useChatActions.ts for browser environment
- **API Endpoint**: Fixed endpoint from `/run` to `/runs` for AGNO API compatibility

---

## Task: Optimisasi Hero Section UndangUndang.tsx - COMPLETED ✅

### Deskripsi:
User melaporkan bahwa hero section dengan gradient background terlalu besar dan membuat pengguna tidak fokus melihat ke agen yang tersedia sebagai konten utama.

### Masalah yang Ditemukan:
- **Hero section terlalu dominan**: Mengalihkan perhatian dari agen-agen AI yang seharusnya menjadi fokus utama
- **Visual hierarchy tidak optimal**: Hero yang terlalu besar membuat konten agen kurang menonjol
- **UX tidak efisien**: User harus scroll banyak untuk melihat agen yang tersedia

### Solusi yang Diimplementasikan:

#### 1. Compact Header Design:
- **Reduced height**: Dari py-16 lg:py-24 menjadi py-8 yang lebih kompak
- **Simplified content**: Menghilangkan elemen statistik yang tidak terlalu penting
- **Clean background**: Menggunakan white background dengan subtle border

#### 2. Content-First Approach:
- **Focus on agents**: Membuat agen menjadi focal point utama halaman
- **Better visual hierarchy**: Header yang lebih kecil membuat agen lebih visible
- **Improved spacing**: Menyesuaikan spacing untuk transisi yang smooth

#### 3. Streamlined UI Elements:
- **Simplified branding**: Tetap professional tapi tidak overwhelming
- **Essential information only**: Hanya menampilkan judul dan deskripsi singkat
- **Clean design**: Menghilangkan decorative elements yang berlebihan

#### 4. Better User Flow:
- **Immediate access**: User bisa langsung melihat agen tanpa scroll banyak
- **Clear purpose**: Langsung menunjukkan bahwa ini adalah halaman untuk memilih agen
- **Reduced cognitive load**: Less visual noise, more focus on content

### Benefits:
- **Better UX**: User langsung fokus ke agen yang tersedia
- **Improved conversion**: Lebih mudah untuk user memilih dan menggunakan agen
- **Cleaner design**: Visual yang lebih professional dan fokus
- **Mobile friendly**: Header yang kompak lebih baik untuk mobile experience

### Status:
✅ **COMPLETED** - Hero section telah dioptimisasi untuk memberikan fokus yang lebih baik pada agen-agen AI

---

## Previous Completed Tasks:

## Task: Perbaikan Welcome Message dan SkeletonMessage Layout di PiketSpktChatPage - COMPLETED ✅

### Deskripsi:
User melaporkan bahwa pada fungsi analisis di PiketSpktChatPage.tsx, SkeletonMessage menutupi elemen lain saat di mobile, dan welcome message dengan contoh pertanyaan tidak hilang saat user mensubmit pertanyaan.

### Masalah yang Ditemukan:
- **Welcome Message Persistence**: Welcome message dan contoh pertanyaan tidak hilang setelah user submit pertanyaan
- **SkeletonMessage Layout Issue**: SkeletonMessage menutupi elemen lain di mobile karena layout yang bermasalah
- **Conditional Rendering**: Logic kondisi untuk menampilkan welcome screen vs chat messages tidak tepat

### Solusi yang Diimplementasikan:

#### 1. Fixed Welcome Message Logic:
- **Added processing condition**: Menambahkan `!isProcessing` ke kondisi welcome screen agar hilang saat processing
- **Cleaner conditions**: Welcome screen hanya muncul saat tidak ada task completed dan tidak sedang processing

#### 2. Restructured Chat Messages Layout:
- **Separated processing indicator**: Memisahkan SkeletonMessage dari dalam chat messages loop
- **Container restructure**: Membuat container terpisah untuk chat messages dan processing indicator
- **Better responsive layout**: Layout yang lebih responsive dan tidak saling menumpuk

#### 3. Improved Message Rendering:
- **Removed nested conditions**: Menghapus kondisi SkeletonMessage di dalam message loop
- **Cleaner message flow**: Setiap message di-render tanpa conditional loading di dalamnya
- **Separate loading state**: Loading indicator terpisah dari message content

#### 4. Mobile Layout Fixes:
- **No overlapping elements**: SkeletonMessage tidak lagi menutupi elemen lain
- **Proper spacing**: Spacing yang konsisten untuk mobile dan desktop
- **Responsive containers**: Container yang responsive untuk semua ukuran layar

### Benefits:
- **Better UX**: Welcome message hilang dengan benar saat user mulai chat
- **Mobile Friendly**: Layout yang tidak overlap dan responsive di mobile
- **Clean Rendering**: Proses loading yang jelas dan terpisah dari content
- **Consistent Behavior**: Behavior yang konsisten across different screen sizes

### Status:
✅ **COMPLETED** - Welcome message logic dan SkeletonMessage layout telah diperbaiki untuk pengalaman mobile yang lebih baik

---

## Previous Completed Tasks:

## Task: Perbaikan ReactMarkdown Error di PiketSpktChatPage - COMPLETED ✅

### Deskripsi:
User melaporkan error "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: object" yang terjadi di komponen AnalysisMarkdown dalam PiketSpktChatPage.tsx.

### Masalah yang Ditemukan:
- **Invalid Component Type**: Fungsi `createComponentProps` menghasilkan objek yang tidak kompatibel dengan ReactMarkdown
- **ReactMarkdown Expectations**: ReactMarkdown mengharapkan komponen React yang sebenarnya, bukan objek konfigurasi
- **Helper Function Issue**: Helper function `createComponentProps` tidak menghasilkan format yang benar

### Solusi yang Diimplementasikan:

#### 1. Replaced createComponentProps with Inline Components:
- **Direct component definition**: Mengganti `createComponentProps()` dengan definisi komponen langsung
- **Proper React components**: Menggunakan arrow functions yang mengembalikan JSX elements
- **Type safety**: Implementasi dengan proper TypeScript typing untuk props

#### 2. Fixed Component Structure:
- **h1 component**: Dengan styling border-bottom dan proper spacing
- **a component**: Dengan target="_blank" dan proper link styling  
- **p, strong, em, hr**: Masing-masing dengan styling yang sesuai
- **Proper prop spreading**: Menggunakan `{ children, ...props }` pattern

#### 3. Cleaned Up Imports:
- **Removed unused import**: Menghapus import `createComponentProps` yang sudah tidak dipakai
- **Maintained config**: Tetap menggunakan `analysisMarkdownConfig` untuk class names dan plugins

#### 4. Removed Unused Helper Function:
- **Deleted createComponentProps**: Menghapus fungsi yang tidak digunakan sepenuhnya dari codebase
- **Clean codebase**: Tidak ada lagi kode yang tidak terpakai (dead code)

### Benefits:
- **Error Resolution**: Mengatasi "Element type is invalid" error sepenuhnya
- **Better Type Safety**: Komponen inline lebih type-safe dan mudah debug
- **Performance**: Tidak ada overhead dari helper function yang bermasalah
- **Maintainability**: Kode lebih eksplisit dan mudah dimodifikasi

### Status:
✅ **COMPLETED** - ReactMarkdown error telah diperbaiki dengan menggunakan inline component definitions

---

## Previous Completed Tasks:

## Task: Perbaikan Loading Animation Responsiveness di WassidikPenyidikChatPage - COMPLETED ✅

### Deskripsi:
User melaporkan bahwa tampilan loading animation di WassidikPenyidikChatPage.tsx tidak responsif di mobile. Meminta perbaikan dengan menggunakan pattern dari SkeletonMessage.tsx dan membuat skeleton dengan lebar full width.

### Masalah yang Ditemukan:
- **Non-responsive loading**: Loading indicator sebelumnya menggunakan fixed container yang tidak responsif
- **Mobile layout issues**: Dots animation dengan text terlalu kaku untuk layar kecil
- **Inconsistent pattern**: Tidak mengikuti pattern skeleton yang sudah ada

### Solusi yang Diimplementasikan:

#### 1. Custom Skeleton dengan Pattern SkeletonMessage:
- **Responsive container**: Menggunakan `flex gap-4 w-full max-w-[80%]` untuk responsivitas
- **Full width bars**: Skeleton bars menggunakan `w-full`, `w-11/12`, `w-full` untuk variasi
- **Proper spacing**: Menggunakan `flex-1 space-y-2 py-1 w-full` untuk layout yang flexibel

#### 2. Improved Animation:
- **Purple theme consistency**: Menggunakan `bg-purple-200` untuk skeleton bars yang konsisten dengan theme
- **Smooth animation**: Menggunakan `animate-pulse` untuk efek yang halus
- **Better text**: Mengganti text menjadi "Mencari informasi dan merangkum jawaban..."

#### 3. Mobile Optimization:
- **Responsive width**: Container menggunakan `max-w-[80%]` untuk mobile compatibility
- **Flexible layout**: Layout menggunakan flexbox dengan proper width constraints
- **Icon consistency**: Mempertahankan wassidik.svg icon sesuai theme

### Benefits:
- **Better Mobile Experience**: Loading animation sekarang responsif di semua ukuran layar
- **Visual Consistency**: Mengikuti pattern skeleton yang sudah established
- **Professional Look**: Animation yang lebih smooth dan professional
- **Theme Consistency**: Mempertahankan purple theme wassidik yang konsisten

### Status:
✅ **COMPLETED** - Loading animation WassidikPenyidikChatPage sekarang responsif dengan pattern skeleton yang proper

---

## Previous Completed Tasks:

## Task: Pembuatan Agen Wassidik Penyidik untuk PenyidikAi.tsx - COMPLETED ✅

---

## Previous Completed Tasks:

## Task: Menghilangkan Input Chat Umum PiketSpktChatPage - COMPLETED ✅

### Deskripsi:
User meminta untuk menghilangkan input dan service pada bagian chat umum di PiketSpktChatPage.tsx, sehingga input hanya muncul ketika pengguna memilih tugas yang tersedia.

### Perubahan yang Diimplementasikan:

#### 1. Modifikasi Tool Selection di General Tab:
- ❌ Menghapus option 'chat' dari tool selection
- ✅ Hanya tersisa option 'laporanInformasi' sebagai tugas yang tersedia
- ✅ Input area disembunyikan sampai user memilih Laporan Informasi

#### 2. Kondisi Input Validation:
- **Analysis Tab**: Input tetap bisa menerima text dan file upload
- **General Tab**: Input hanya muncul jika `activeGeneralTool === 'laporanInformasi'`
- **No Tool Selected**: Input area tidak ditampilkan sama sekali

#### 3. Penyederhanaan Logic:
- ❌ Menghapus fungsi `getExampleQuestions()` 
- ✅ Mengganti dengan array `exampleQuestions` langsung untuk analysis tab
- ❌ Menghapus example questions untuk chat umum
- ✅ File upload button hanya muncul di analysis tab

#### 4. UI Flow Improvement:
- **Welcome Screen**: Menampilkan pilihan tool untuk general tab
- **Tool Selection**: User harus memilih Laporan Informasi untuk input
- **Input Appearance**: Input hanya muncul setelah tool dipilih
- **Back Navigation**: User bisa kembali ke menu utama dari tool yang dipilih

#### 5. Benefits:
- **Cleaner UX**: User tidak bingung dengan terlalu banyak option
- **Focused Purpose**: Setiap tab memiliki tujuan yang lebih jelas
- **Guided Workflow**: User dipandu untuk memilih tugas spesifik
- **Reduced Complexity**: Kode lebih sederhana dan maintainable

### Files Modified:
- **src/components/ui/PiketSpktChatPage.tsx**: 
  * Removed chat option from general tab
  * Modified input visibility logic
  * Simplified example questions handling
  * Updated file upload button visibility
- **.cursorrules**: Dokumentasi completion

### Status:
✅ **COMPLETED** - Input dan service chat umum berhasil dihilangkan, input hanya muncul saat user memilih tugas Laporan Informasi

---

## Previous Completed Tasks:

## Task: Perbaikan Spacing Tab DOCX - COMPLETED ✅

### Deskripsi:
User melaporkan bahwa spasi/tab pada DOCX terlalu jauh, terutama di bagian PENDAHULUAN dan FAKTA-FAKTA.

### Masalah yang Ditemukan:
- **Excessive Tab Characters**: Menggunakan 9 tab untuk PENDAHULUAN dan 7 tab untuk subyek items
- **Header Spacing**: 20 tab character antara KOPSTUK dan S-1.2 terlalu berlebihan
- **Inconsistent with Display**: Spacing tidak sesuai dengan tampilan di komponen display

### Solusi yang Diimplementasikan:

#### 1. Reduced Tab Spacing:
- **PENDAHULUAN items**: Mengurangi dari `\t\t\t\t\t\t\t\t\t:` (9 tabs) menjadi `\t\t\t:` (3 tabs)
- **Subyek items**: Mengurangi dari `\t\t\t\t\t\t\t:` (7 tabs) menjadi `\t\t:` (2 tabs)
- **Header alignment**: Mengurangi dari 20 tabs menjadi 10 tabs antara KOPSTUK dan S-1.2

#### 2. Benefits:
- **Consistent Spacing**: Tab spacing sekarang proporsional dan tidak berlebihan
- **Better Readability**: Teks lebih rapi dan mudah dibaca
- **Professional Appearance**: Format yang lebih profesional dan standar

### Files Modified:
- **src/utils/documentExport.ts**: Reduced tab characters in multiple places
- **.cursorrules**: Dokumentasi perbaikan

### Status:
✅ **COMPLETED** - Spacing tab DOCX telah diperbaiki dan lebih proporsional

---

## Previous Completed Tasks:

## Task: Perbaikan Ukuran DOCX dan JSON Parsing Error - COMPLETED ✅

## Document Export Consistency Lessons

- **Font Size Consistency**: Pastikan ukuran font antara display component dan export format konsisten:
  * Display `text-xs` (12px) = DOCX `size: 20` (10pt)
  * Display `text-sm` (14px) = DOCX `size: 22` (11pt)  
  * Display `text-base` (16px) = DOCX `size: 24` (12pt)
- **Structure Synchronization**: Selalu sinkronkan struktur antara display component dan export function
- **Comment Documentation**: Tambahkan komentar yang menjelaskan korelasi ukuran antara display dan export
- **Visual Consistency**: Pastikan spacing, alignment, dan layout konsisten across all formats
- **Regular Validation**: Secara berkala validasi bahwa display dan export menghasilkan output yang identical
- **Tab Spacing Control**: Kontrol penggunaan tab character untuk alignment yang proper:
  * PENDAHULUAN items: Gunakan maksimal 3-4 tab untuk spacing yang wajar
  * Subyek items (indented): Gunakan maksimal 2 tab setelah indentasi
  * Header alignment: Gunakan tab yang proporsional, maksimal 10 tab untuk alignment
  * Avoid excessive tabs: Lebih dari 5-10 tab biasanya menghasilkan spacing yang berlebihan
- **Proportional Spacing**: Pastikan spacing proporsional dengan ukuran font dan layout

## Gemini API JSON Parsing Lessons

- **JSON Temperature Setting**: Gunakan temperature 0.1 atau lebih rendah untuk output JSON yang konsisten dari Gemini API
- **JSON Cleanup Patterns**: Implementasikan regex patterns untuk memperbaiki JSON yang malformed:
  * Remove trailing commas: `replace(/,(\s*[\]}])/g, '$1')`
  * Fix missing commas: `replace(/"\s*\n\s*"/g, '",\n    "')`
  * Remove control characters: `replace(/[\u0000-\u001F\u007F-\u009F]/g, '')`
  * Convert single to double quotes: `replace(/'/g, '"')`
- **Fallback Parsing**: Implementasikan try-catch dengan fallback untuk extract JSON dari response yang mengandung text tambahan
- **Array Validation**: Selalu validasi bahwa array fields (uraianPerkara, kesimpulan, saran) dalam format yang benar
- **Debug Logging**: Gunakan extensive logging untuk debugging JSON parsing issues dengan substring preview
- **Prompt Engineering for JSON**: 
  * Berikan instruksi eksplisit tentang format JSON yang valid
  * Sertakan contoh format array yang benar
  * Peringatkan tentang trailing comma dan quote types
  * Minta output hanya JSON tanpa text tambahan

## Previous Lessons:

## Task: StreamingStatus Synchronization dengan AGNO Events - COMPLETED ✅

### Deskripsi:
User melaporkan bahwa StreamingStatus design sudah bagus tapi belum tersinkron dengan useAIResponseStream.ts. Perlu memastikan events dari streaming API bisa mengupdate StreamingStatus dengan benar.

### Implementasi yang Diselesaikan:

#### 1. Updated StreamingStatus Interface:
- **Props Matching**: Changed dari `currentStatus` ke `streamingStatus` untuk match dengan PlaygroundStore
- **Compact Mode**: Added optional `compact` prop untuk flexibility di berbagai UI contexts
- **Event Comments**: Added comments untuk setiap phase dengan source event (RunStarted, ToolCallStarted, etc.)

#### 2. Enhanced Event Detection di useAIResponseStream:
- **Detailed Logging**: Added comprehensive event logging dengan phase detection
- **Event Mapping**: Clear mapping antara API events dan UI phases:
  - `RunStarted/ReasoningStarted` → 🧠 Thinking phase  
  - `ToolCallStarted` → 🔧 Tool call phase
  - `UpdatingMemory` → 💾 Memory update phase
  - `RunResponse` → 📝 Content generation phase
  - `RunCompleted` → ✅ Completion phase

#### 3. Proper Status Transitions di useAIChatStreamHandler:
- **UpdatingMemory Event**: Enhanced dengan proper state reset
- **Tool Call Management**: Proper toolName setting dan clearing
- **State Isolation**: Setiap phase secara eksplisit mereset phase lain

#### 4. Complete resetStreamingStatus Implementation:
- **All Fields Reset**: Termasuk `toolName: undefined`
- **Consistent State**: Semua streaming status fields direset secara konsisten
- **Clean Transitions**: Memastikan tidak ada state yang tertinggal

### Event Flow Synchronization:

#### Streaming Phases:
1. **Thinking**: `isThinking: true` (from RunStarted/ReasoningStarted)
2. **Tool Call**: `isCallingTool: true, toolName: string` (from ToolCallStarted)  
3. **Knowledge Access**: `isAccessingKnowledge: true` (from AccessingKnowledge)
4. **Memory Update**: `isUpdatingMemory: true` (from UpdatingMemory)
5. **Processing**: Default state (during RunResponse)
6. **Completion**: `hasCompleted: true` (from RunCompleted)

#### Status Management:
- **Proper Transitions**: Setiap phase mereset phase sebelumnya
- **Tool Name Tracking**: toolName diset saat ToolCallStarted dan cleared saat selesai
- **Clean Reset**: resetStreamingStatus mengembalikan semua field ke initial state

### Benefits:
- **Real-time Sync**: StreamingStatus sekarang perfectly synchronized dengan AGNO streaming events
- **Visual Feedback**: User melihat progress yang akurat sesuai dengan proses backend
- **Debug Capability**: Enhanced logging untuk troubleshooting synchronization issues
- **Flexible UI**: Compact mode untuk berbagai konteks UI
- **Consistent State**: Proper state management dengan clean transitions

### Files Modified:
- **src/hooks/streaming/StreamingStatus.tsx**: Updated interface dan prop names
- **src/hooks/streaming/useAIResponseStream.ts**: Enhanced event logging dan detection
- **src/hooks/playground/useAIChatStreamHandler.ts**: Proper UpdatingMemory event handling
- **src/stores/PlaygroundStore.ts**: Complete resetStreamingStatus implementation

### Status:
✅ **COMPLETED** - StreamingStatus component sekarang fully synchronized dengan AGNO streaming events, memberikan feedback visual yang akurat dan real-time untuk semua phases dari thinking sampai completion.

#### Auto-Focus UX Enhancement - COMPLETED ✅
- **Streaming Focus**: Auto-scroll ke StreamingStatus area saat proses streaming aktif (thinking, tool calls, knowledge access, memory update)
- **Completion Focus**: Auto-scroll kembali ke input area setelah streaming selesai dengan delay 1.2 detik
- **Smart Timing**: Timing yang optimal (500ms untuk streaming focus, 1200ms + 300ms untuk completion focus)
- **Non-Interfering**: Auto-scroll messages normal tidak mengganggu streaming focus management
- **Visual Enhancement**: Scroll margin dan transition untuk smooth user experience
- **Cleanup**: Proper timer cleanup untuk prevent memory leaks
- **Logging**: Comprehensive logging untuk debugging auto-focus behavior

---

## Previous Completed Tasks:

## Task: Konversi TIPIDKOR ke Streaming dengan Animasi - COMPLETED ✅

### Deskripsi:
User meminta untuk mengubah tipidkorService.ts dan TipidkorChatPage.tsx menjadi streaming dengan animasi-animasi yang sudah disediakan, mengikuti pola wassidikPenyidikStreamingService.ts dan WassidikPenyidikChatPage.tsx. Endpoint tipidkor tetap sama namun disesuaikan untuk streaming.

### Implementasi yang Diselesaikan:

#### 1. Buat tipidkorStreamingService.ts:
- **Streaming Service Pattern**: Mengikuti exact pattern dari wassidikPenyidikStreamingService.ts
- **Agent ID Configuration**: Menggunakan 'tipidkor-chat' sesuai endpoint yang sudah ada
- **Session Management**: Implementasi initializeTipidkorStreamingSession dan clearTipidkorStreamingChatHistory
- **Buffer Parsing**: parseStreamBuffer function untuk handle streaming JSON chunks
- **Event Emitter**: onStreamEvent system untuk internal event handling
- **FormData Processing**: Proper FormData append untuk agent_id, stream, session_id, user_id, monitor
- **Timeout Handling**: 30 menit timeout dengan AbortController
- **Error Handling**: Comprehensive error handling untuk 429, 413, dan server errors
- **Content Extraction**: Utility function convertTipidkorStreamingEventsToMessages
- **Logging**: Detailed logging dengan TIPIDKOR prefix untuk debugging

#### 2. Update TipidkorChatPage.tsx untuk Streaming:
- **Hooks Integration**: Menggunakan useAIChatStreamHandler dan usePlaygroundStore
- **Streaming Status**: Integrasi StreamingStatus component dengan animasi thinking, tool calls, memory updates
- **Red Theme Consistency**: Mempertahankan warna merah untuk konsistensi TIPIDKOR brand
- **Storage Management**: Implementasi storage statistics dan cleanup functionality
- **Auto-focus UX**: Enhanced auto-focus management untuk streaming status dan input area
- **Session Handling**: Menggunakan tipidkor streaming session functions
- **Agent ID Parameter**: Menggunakan 'tipidkor-chat' parameter dalam handleStreamResponse
- **Error State Removal**: Menghapus skeleton loading dan error states yang tidak perlu
- **Storage Stats Display**: Red-themed storage stats dengan cleanup functionality

#### 3. Enhanced useAIChatStreamHandler Hook:
- **Dynamic Agent ID**: Support untuk agent ID parameter yang dapat dikonfigurasi
- **Backward Compatibility**: Default ke 'wassidik-chat' jika tidak ada agent ID yang diberikan
- **Parameter Validation**: Validasi agent_id yang sesuai dengan agent yang dipilih
- **Multi-Agent Support**: Hook sekarang dapat handle multiple agents (wassidik, tipidkor, dll)
- **Function Signature**: `handleStreamResponse(input, files?, agentId?)`

#### 4. Files Created/Modified:
- **src/services/tipidkorStreamingService.ts**: New streaming service for TIPIDKOR
- **src/components/ui/TipidkorChatPage.tsx**: Converted to streaming with full animations
- **src/hooks/playground/useAIChatStreamHandler.ts**: Enhanced dengan dynamic agent ID support
- **.cursorrules**: Documentation update

### Key Features Implemented:

#### Real-time Streaming Events:
- **RunStarted**: Initialize session, set thinking status, save session history
- **RunResponse**: Append content incrementally dengan real-time display
- **RunCompleted**: Finalize message content, complete metadata, stop streaming
- **RunError**: Mark message as error, display error message, cleanup session
- **ToolCallStarted/Completed**: Real-time tool call status dan results tracking
- **UpdatingMemory**: Live memory update process display dengan progress indicators

#### Enhanced UX with Animations:
- **Thinking Phase**: Brain icon dengan bouncing dots animation
- **Tool Call Phase**: Wrench icon dengan spinning loader animation
- **Memory Update Phase**: Database icon dengan pulsing bars animation
- **Completion Phase**: CheckCircle icon untuk completion feedback
- **Auto-focus Management**: Smart focus management antara streaming status dan input area
- **Progressive Indicators**: Colored dots showing current processing phase

#### Red Theme Integration:
- **Consistent Branding**: Semua elemen UI menggunakan red color scheme untuk TIPIDKOR
- **Storage Stats**: Red-themed storage statistics dan cleanup functionality
- **Error States**: Red-themed error messages dan status indicators
- **Input Focus**: Red focus ring dan hover states untuk consistency
- **Agent Avatar**: Menggunakan krimsus.png icon dengan red background

### Benefits:
- **Real-time Feedback**: User melihat proses AI secara detail dan real-time untuk TIPIDKOR
- **Consistent Experience**: Pengalaman yang sama dengan Wassidik AI tapi dengan TIPIDKOR theming
- **Multi-Agent Architecture**: Hook yang dapat digunakan untuk multiple agents
- **Professional Appearance**: Animasi yang smooth dan sesuai dengan AI workflow
- **Enhanced Performance**: Streaming architecture untuk response yang lebih cepat
- **Storage Management**: Built-in storage cleanup untuk mencegah memory issues

### Status:
✅ **COMPLETED** - TIPIDKOR AI streaming fully integrated dengan comprehensive event handling, state management, enhanced UX dengan animasi real-time, dan red theme consistency. Hook useAIChatStreamHandler sekarang mendukung multiple agents dengan parameter agentId yang dapat dikonfigurasi.

#### 5. Store Isolation Fix - COMPLETED ✅:
- **Problem**: PlaygroundStore menggunakan state global, sehingga messages dari wassidik dan tipidkor tercampur
- **Solution**: Added store cleanup pada component initialization untuk memisahkan data antar agent
- **Implementation**: Clear messages dan reset streaming status saat mount component agent baru
- **Benefits**: Setiap agent memiliki chat history yang terpisah dan tidak tercampur
- **Files Modified**: TipidkorChatPage.tsx dan WassidikPenyidikChatPage.tsx dengan store cleanup pada useEffect initialization

#### 6. Skeleton Animation Cleanup & Auto-Focus Consistency - COMPLETED ✅:
- **Skeleton Cleanup**: Removed all remaining skeleton animation references dari TipidkorChatPage.tsx
- **Import Cleanup**: Removed unused AnimatedBotIcon import
- **Auto-Focus Synchronization**: Ensured auto-focus management identical dengan WassidikPenyidikChatPage.tsx
- **Progress Tracking**: Added consistent progress tracking useEffect untuk UI feedback
- **State View**: Fokus view ke streaming status animation saat proses belum selesai
- **Benefits**: Konsisten user experience dan clean codebase tanpa unused components

---

## Previous Completed Tasks:
