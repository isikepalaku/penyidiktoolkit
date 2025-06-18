import { useCallback } from 'react';
import { 
  RunEvent, 
  RunResponse, 
  PlaygroundChatMessage 
} from '@/types/playground';
import useAIResponseStream from '@/hooks/streaming/useAIResponseStream';
import useChatActions from '@/hooks/playground/useChatActions';
import { env } from '@/config/env';
import { supabase } from '@/supabaseClient';
import { usePlaygroundStore } from '@/stores/PlaygroundStore';

/**
 * Hook utama untuk menangani streaming chat dengan AGNO API
 * Mengelola semua event RunEvent dan memperbarui state secara real-time
 */
export default function useAIChatStreamHandler() {
  const {
    setMessages,
    setIsStreaming,
    setStreamingErrorMessage,
    setSessionId,
    setSessionsData,
    sessionId,
    hasStorage,
    setStreamingStatus,
    resetStreamingStatus,
    setCurrentChunk
  } = usePlaygroundStore();
  
  const { streamResponse } = useAIResponseStream();
  const { addMessage, focusChatInput } = useChatActions();

  /**
   * handleRunStarted: Di-trigger saat backend mengirim event RunStarted.
   * Menyimpan session_id dan menginisialisasi state streaming.
   */
  const handleRunStarted = useCallback((chunk: RunResponse) => {
    console.log('Run started:', {
      session_id: chunk.session_id,
      agent_id: chunk.agent_id,
      created_at: chunk.created_at
    });

    // Update session ID jika ada
    if (chunk.session_id) {
      setSessionId(chunk.session_id);
      
      // Tambahkan ke sessions data jika storage tersedia
      if (hasStorage && chunk.session_id) {
        setSessionsData((prevSessions) => {
          if (prevSessions?.some((s) => s.session_id === chunk.session_id)) {
            return prevSessions;
          }
          
          const newSession = {
            session_id: chunk.session_id!,
            title: 'New Chat Session',
            created_at: chunk.created_at || Math.floor(Date.now() / 1000)
          };
          
          return [newSession, ...(prevSessions ?? [])];
        });
      }
    }

    // Set streaming state
    setIsStreaming(true);
    setStreamingErrorMessage(null);
    
    // Start thinking phase
    setStreamingStatus({ isThinking: true });
  }, [setSessionId, hasStorage, setSessionsData, setIsStreaming, setStreamingErrorMessage, setStreamingStatus]);

  /**
   * handleRunResponse: Di-trigger saat backend mengirim event RunResponse.
   * Append chunk.content (fragmen token) ke pesan agent terakhir,
   * serta update metadata tools/extra_data/images/videos/audio.
   */
  const handleRunResponse = useCallback((chunk: RunResponse, lastContent: { current: string }) => {
    console.log('Run response chunk received:', {
      content_length: typeof chunk.content === 'string' ? chunk.content.length : 'non-string',
      has_tools: chunk.tools && chunk.tools.length > 0,
      has_extra_data: !!chunk.extra_data
    });

    setMessages((prevMessages: PlaygroundChatMessage[]) => {
      const newMessages = [...prevMessages];
      const lastMessage = newMessages[newMessages.length - 1];

      if (lastMessage && lastMessage.role === 'agent' && typeof chunk.content === 'string') {
        // Hitung unique content untuk menghindari duplikasi
        const uniqueContent = chunk.content.replace(lastContent.current, '');
        
        console.log('Accumulating content:', {
          chunk_length: chunk.content.length,
          unique_length: uniqueContent.length,
          total_accumulated: lastMessage.content.length + uniqueContent.length
        });
        
        const updatedMessage: PlaygroundChatMessage = {
          ...lastMessage,
          content: lastMessage.content + uniqueContent,
          tool_calls: chunk.tools && chunk.tools.length > 0 
            ? [...chunk.tools] 
            : lastMessage.tool_calls,
          images: chunk.images ?? lastMessage.images,
          videos: chunk.videos ?? lastMessage.videos,
          audio: chunk.audio ?? lastMessage.audio,
          response_audio: chunk.response_audio ?? lastMessage.response_audio,
          created_at: chunk.created_at ?? lastMessage.created_at,
          extra_data: {
            ...lastMessage.extra_data,
            reasoning_steps: chunk.extra_data?.reasoning_steps ?? lastMessage.extra_data?.reasoning_steps,
            references: chunk.extra_data?.references ?? lastMessage.extra_data?.references,
            metadata: {
              ...lastMessage.extra_data?.metadata,
              ...chunk.extra_data?.metadata
            }
          }
        };

        newMessages[newMessages.length - 1] = updatedMessage;
        lastContent.current = chunk.content;
      }

      return newMessages;
    });
  }, [setMessages]);

  /**
   * handleRunCompleted: Di-trigger saat backend mengirim event RunCompleted.
   * Menggabungkan content final dan menyalin metadata terakhir,
   * menghentikan mode streaming.
   */
  const handleRunCompleted = useCallback((chunk: RunResponse) => {
    console.log('Run completed:', {
      final_content_type: typeof chunk.content,
      final_content_length: typeof chunk.content === 'string' ? chunk.content.length : 'non-string',
      has_final_tools: chunk.tools && chunk.tools.length > 0,
      has_extra_data: !!chunk.extra_data,
      has_references: !!chunk.extra_data?.references,
      references_count: chunk.extra_data?.references?.length || 0,
      full_extra_data: chunk.extra_data
    });

    // Extract knowledge base references/citations immediately when RunCompleted
    let extractedCitations: any[] = [];
    let citationsCount = 0;
    
    // Primary: Extract from extra_data.references (Agno Agentic RAG pattern)
    if (chunk.extra_data?.references && chunk.extra_data.references.length > 0) {
      console.log('📚 Extracting citations from extra_data.references:', chunk.extra_data.references.length);
      extractedCitations = chunk.extra_data.references.map((ref: any, index: number) => ({
        id: `kb-citation-${index}`,
        title: ref.title || `Knowledge Base Reference ${index + 1}`,
        url: ref.url,
        source: ref.url ? new URL(ref.url).hostname : 'Knowledge Base',
        excerpt: ref.content || ref.text,
        metadata: ref.metadata
      }));
      citationsCount = extractedCitations.length;
      
      // Set citations immediately to streaming status
      setStreamingStatus({
        citations: extractedCitations,
        citationsCount: citationsCount,
        references: chunk.extra_data.references
      });
    }
    
    // Log detailed citation info
    console.log('📚 Final citations extraction result:', {
      extracted_count: extractedCitations.length,
      citations_preview: extractedCitations.slice(0, 2),
      has_streaming_citations: extractedCitations.length > 0
    });

    setMessages((prevMessages: PlaygroundChatMessage[]) => {
      return prevMessages.map((msg, index) => {
        if (index === prevMessages.length - 1 && msg.role === 'agent') {
          let finalContent: string;
          
          if (typeof chunk.content === 'string' && chunk.content.trim()) {
            // Gunakan final content dari RunCompleted jika ada dan tidak kosong
            finalContent = chunk.content;
          } else if (chunk.content && typeof chunk.content === 'object') {
            // Jika content adalah object, coba extract text content atau convert ke JSON
            try {
              finalContent = JSON.stringify(chunk.content, null, 2);
            } catch {
              finalContent = String(chunk.content);
            }
          } else {
            // Jika RunCompleted tidak memiliki content, TETAP GUNAKAN content yang sudah terakumulasi
            finalContent = msg.content;
            
            if (!finalContent || finalContent.trim() === '') {
              // Jika benar-benar tidak ada content sama sekali, beri pesan yang berguna
              finalContent = 'Tidak ada konten yang diterima. Silakan coba lagi atau hubungi administrator.';
              console.warn('No content accumulated during streaming session');
            } else {
              console.log('RunCompleted without final content, keeping accumulated content:', finalContent.length, 'chars');
            }
          }

          // Enhanced extra_data with citations
          const enhancedExtraData = {
            reasoning_steps: chunk.extra_data?.reasoning_steps ?? msg.extra_data?.reasoning_steps,
            references: chunk.extra_data?.references ?? msg.extra_data?.references,
            metadata: {
              ...msg.extra_data?.metadata,
              ...chunk.extra_data?.metadata,
              // Add citation metadata
              citations_count: citationsCount,
              knowledge_base_used: citationsCount > 0
            }
          };

          return {
            ...msg,
            content: finalContent,
            tool_calls: chunk.tools && chunk.tools.length > 0 
              ? [...chunk.tools] 
              : msg.tool_calls,
            images: chunk.images ?? msg.images,
            videos: chunk.videos ?? msg.videos,
            audio: chunk.audio ?? msg.audio,
            response_audio: chunk.response_audio ?? msg.response_audio,
            created_at: chunk.created_at ?? msg.created_at,
            extra_data: enhancedExtraData
          };
        }
        return msg;
      });
    });

    // Stop streaming and mark as completed with citations
    setIsStreaming(false);
    setStreamingStatus({ 
      hasCompleted: true,
      isThinking: false,
      isCallingTool: false,
      isAccessingKnowledge: false,
      isMemoryUpdateStarted: false,
      // Keep citations and references in final state
      citations: extractedCitations,
      citationsCount: citationsCount,
      references: chunk.extra_data?.references
    });
  }, [setMessages, setIsStreaming, setStreamingStatus]);

  /**
   * handleRunError: Di-trigger saat backend mengirim event RunError.
   * Menandai pesan agent terakhir sebagai error dan menampilkan pesan error.
   */
  const handleRunError = useCallback((chunk: RunResponse | Error) => {
    console.error('🚨 Run error received:', {
      type: chunk instanceof Error ? 'Error object' : 'RunResponse',
      content: chunk instanceof Error ? chunk.message : chunk.content,
      event: chunk instanceof Error ? 'N/A' : chunk.event,
      session_id: chunk instanceof Error ? 'N/A' : (chunk as any).session_id,
      created_at: chunk instanceof Error ? 'N/A' : (chunk as any).created_at
    });

    let errorMessage: string;
    let shouldClearSession = false;
    
    if (chunk instanceof Error) {
      errorMessage = chunk.message;
    } else {
      const rawContent = chunk.content as string;
      
      // Parse detailed error messages for common HTTP errors
      // Handle FastAPI format: <Response [400]>, <Response [401]>, etc.
      if (rawContent?.includes('<Response [400]>') || rawContent?.includes('[400]')) {
        // Khusus untuk error 400 yang mungkin terkait empty parts atau parameter validation
        if (rawContent.includes('contents.parts must not be empty') || 
            rawContent.includes('INVALID_ARGUMENT')) {
          errorMessage = 'Format pesan tidak valid. Session akan direset untuk mencegah error berulang.';
          shouldClearSession = true;
        } else {
          errorMessage = 'Permintaan tidak valid. Periksa format pesan Anda dan coba lagi.';
          console.error('HTTP 400 Error Details:', rawContent);
          // Clear session untuk mencegah error berulang dari parameter rusak
          shouldClearSession = true;
        }
      } else if (rawContent?.includes('<Response [401]>') || rawContent?.includes('[401]')) {
        errorMessage = 'Unauthorized: API key tidak valid. Silakan hubungi administrator.';
      } else if (rawContent?.includes('<Response [403]>') || rawContent?.includes('[403]')) {
        errorMessage = 'Forbidden: Akses ditolak. Silakan periksa kredensial Anda.';
      } else if (rawContent?.includes('<Response [429]>') || rawContent?.includes('[429]')) {
        errorMessage = 'Terlalu banyak permintaan. Silakan tunggu beberapa saat dan coba lagi.';
      } else if (rawContent?.includes('<Response [500]>') || rawContent?.includes('[500]')) {
        errorMessage = 'Kesalahan server internal. Silakan coba lagi dalam beberapa menit.';
      } else if (rawContent?.includes('<Response [')) {
        // Generic FastAPI Response error format
        const statusMatch = rawContent.match(/<Response \[(\d+)\]>/);
        const statusCode = statusMatch ? statusMatch[1] : 'unknown';
        errorMessage = `Server error (${statusCode}). Silakan coba lagi atau hubungi administrator.`;
        console.error('HTTP Error Details:', rawContent);
        
        // Clear session untuk error 4xx yang mungkin terkait parameter
        if (statusCode.startsWith('4')) {
          shouldClearSession = true;
        }
      } else {
        errorMessage = rawContent || chunk.error || 'Terjadi kesalahan yang tidak diketahui';
      }
    }

    // Tandai pesan terakhir sebagai error
    setMessages((prevMessages: PlaygroundChatMessage[]) => {
      const newMessages = [...prevMessages];
      const lastMessage = newMessages[newMessages.length - 1];
      
      if (lastMessage && lastMessage.role === 'agent') {
        lastMessage.streamingError = true;
        lastMessage.content = `❌ ${errorMessage}`;
      }
      
      return newMessages;
    });

    setStreamingErrorMessage(errorMessage);
    setIsStreaming(false);

    // Hapus session dari storage jika error terjadi saat run started atau jika perlu clear session
    if (hasStorage && sessionId && shouldClearSession) {
      console.log('🧹 Clearing corrupted session due to error:', {
        sessionId,
        errorType: chunk instanceof Error ? 'Error' : 'RunResponse',
        content: chunk instanceof Error ? chunk.message : chunk.content
      });
      setSessionsData((prev) => 
        prev?.filter((s) => s.session_id !== sessionId) ?? null
      );
      
      // Reset session ID untuk memaksa session baru
      setSessionId(null);
      
      // Tambahkan notifikasi user bahwa session direset
      setTimeout(() => {
        setStreamingErrorMessage(
          errorMessage + ' Session telah direset untuk mencegah error berulang.'
        );
      }, 1000);
    }
  }, [setMessages, setStreamingErrorMessage, setIsStreaming, hasStorage, sessionId, setSessionsData, setSessionId]);

  /**
   * handleToolCallStarted: Di-trigger saat tool call dimulai.
   * Menampilkan indikator bahwa tool sedang dipanggil.
   */
  const handleToolCallStarted = useCallback((chunk: RunResponse) => {
    console.log('Tool call started:', {
      tools: chunk.tools?.map(tool => tool.function?.name).join(', ')
    });

    // Update streaming status for tool call
    const toolName = chunk.tools?.[0]?.function?.name || '';
    setStreamingStatus({ 
      isThinking: false, 
      isCallingTool: true, 
      toolName: toolName 
    });
  }, [setStreamingStatus]);

  /**
   * handleToolCallCompleted: Di-trigger saat tool call selesai.
   * Menampilkan hasil tool jika diperlukan.
   */
  const handleToolCallCompleted = useCallback((chunk: RunResponse) => {
    console.log('Tool call completed:', {
      tools_count: chunk.tools?.length || 0,
      has_results: chunk.tools?.some(tool => tool.result) || false
    });

    // Update streaming status - tool call completed
    setStreamingStatus({ isCallingTool: false });

    // Update tool results in the last message
    setMessages((prevMessages: PlaygroundChatMessage[]) => {
      const newMessages = [...prevMessages];
      const lastMessage = newMessages[newMessages.length - 1];
      
      if (lastMessage && lastMessage.role === 'agent' && chunk.tools) {
        lastMessage.tool_calls = [...chunk.tools];
      }
      
      return newMessages;
    });
  }, [setMessages, setStreamingStatus]);

  /**
   * handleReasoningStep: Di-trigger saat reasoning step diterima.
   * Menampilkan progress reasoning di UI.
   */
  const handleReasoningStep = useCallback((chunk: RunResponse) => {
    console.log('Reasoning step:', {
      reasoning_steps: chunk.extra_data?.reasoning_steps?.length || 0
    });

    // Update reasoning steps in real-time
    setMessages((prevMessages: PlaygroundChatMessage[]) => {
      const newMessages = [...prevMessages];
      const lastMessage = newMessages[newMessages.length - 1];
      
      if (lastMessage && lastMessage.role === 'agent' && chunk.extra_data?.reasoning_steps) {
        lastMessage.extra_data = {
          ...lastMessage.extra_data,
          reasoning_steps: chunk.extra_data.reasoning_steps
        };
      }
      
      return newMessages;
    });
  }, [setMessages]);

  /**
   * Fungsi untuk menandai error di pesan agent terakhir
   */
  const updateMessagesWithErrorState = useCallback(() => {
    setMessages((prevMessages: PlaygroundChatMessage[]) => {
      const newMessages = [...prevMessages];
      const lastMessage = newMessages[newMessages.length - 1];
      
      if (lastMessage && lastMessage.role === 'agent') {
        lastMessage.streamingError = true;
      }
      
      return newMessages;
    });
  }, [setMessages]);

  /**
   * Fungsi utama untuk menangani streaming response
   * @param input - Input string atau FormData yang akan dikirim ke API
   * @param files - Optional files to upload
   * @param agentId - Optional agent ID override (default: 'wassidik-chat')
   */
  const handleStreamResponse = useCallback(async (input: string | FormData, files?: File[], agentId?: string) => {
    console.log('Starting stream response handling');
    
    setIsStreaming(true);
    setStreamingErrorMessage(null);
    
    // Reset streaming status
    resetStreamingStatus();

    // Siapkan FormData - gunakan yang sudah ada atau buat baru
    const formData = input instanceof FormData ? input : new FormData();
    if (typeof input === 'string') {
      formData.append('message', input);
    }
    
    // Validasi message tidak kosong dan memadai
    const messageContent = formData.get('message') as string;
    const hasFiles = formData.getAll('files').length > 0;
    
    // Pastikan ada content yang memadai
    if (!messageContent || messageContent.trim() === '') {
      if (!hasFiles) {
        console.error('Message content is empty and no files provided');
        setStreamingErrorMessage('Pesan tidak boleh kosong');
        setIsStreaming(false);
        return;
      } else {
        // Jika ada file tapi message kosong, set default message
        formData.set('message', 'Tolong analisis file yang saya kirimkan.');
        console.log('Empty message with files, setting default message');
      }
    } else if (messageContent.trim().length < 3) {
      // Pastikan message minimal 3 karakter untuk menghindari input yang terlalu pendek
      console.error('Message content too short');
      setStreamingErrorMessage('Pesan terlalu pendek. Minimal 3 karakter.');
      setIsStreaming(false);
      return;
    }

    // Hapus pesan user + agent terakhir jika ada error sebelumnya
    setMessages((prevMessages: PlaygroundChatMessage[]) => {
      if (prevMessages.length >= 2) {
        const lastMessage = prevMessages[prevMessages.length - 1];
        const secondLastMessage = prevMessages[prevMessages.length - 2];
        
        if (lastMessage.role === 'agent' && 
            lastMessage.streamingError && 
            secondLastMessage.role === 'user') {
          return prevMessages.slice(0, -2);
        }
      }
      return prevMessages;
    });

    // Tambah pesan user
    const userMessage = formData.get('message') as string;
    console.log('📤 Adding user message:', userMessage.substring(0, 50) + '...');
    addMessage({
      role: 'user',
      content: userMessage,
    });

    // Tambah placeholder pesan agent kosong
    console.log('🤖 Adding empty agent placeholder');
    addMessage({
      role: 'agent',
      content: '',
      tool_calls: [],
      streamingError: false,
    });

    let lastContent = { current: '' };

    try {
      // Setup API endpoint
      const API_BASE_URL = env.apiUrl || 'https://api.reserse.id';
      const currentAgentId = agentId || 'wassidik-chat';
      const playgroundRunUrl = `${API_BASE_URL}/v1/playground/agents/${currentAgentId}/runs`;
      
      // Pastikan parameter wajib ada (sesuai dengan wassidikPenyidikService.ts)
      // Cek apakah parameter sudah ada untuk mencegah duplikasi
      if (!formData.has('agent_id')) {
        formData.append('agent_id', currentAgentId);
      }
      if (!formData.has('stream')) {
        formData.append('stream', 'true');  // untuk streaming
      }
      if (!formData.has('monitor')) {
        formData.append('monitor', 'false');
      }
      
      // Session ID (boleh kosong untuk session baru)
      const currentSessionId = sessionId || '';
      if (!formData.has('session_id')) {
        formData.append('session_id', currentSessionId);
      }
      
      console.log('📝 Session ID info:', {
        sessionId_from_store: sessionId,
        currentSessionId_to_send: currentSessionId,
        is_new_session: !sessionId || sessionId.trim() === ''
      });
      
      // User ID dari Supabase auth
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || `anon_${Date.now()}`;
      if (!formData.has('user_id')) {
        formData.append('user_id', userId);
      }
      
      console.log('🔧 Request parameters:', {
        agent_id: currentAgentId,
        stream: 'true',
        monitor: 'false',
        session_id: currentSessionId,
        user_id: userId,
        endpoint: playgroundRunUrl
      });

      // Validasi akhir: pastikan semua parameter wajib tidak kosong
      // Note: session_id boleh kosong untuk session baru
      const requiredParams = ['message', 'agent_id', 'stream', 'monitor', 'user_id'];
      for (const param of requiredParams) {
        const value = formData.get(param);
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          console.error(`❌ Required parameter '${param}' is empty or missing`);
          setStreamingErrorMessage(`Parameter wajib '${param}' kosong. Silakan coba lagi.`);
          setIsStreaming(false);
          return;
        }
      }
      
      // Validasi khusus session_id (boleh kosong untuk session baru)
      const sessionIdParam = formData.get('session_id');
      if (sessionIdParam === null || sessionIdParam === undefined) {
        console.error(`❌ session_id parameter is missing`);
        setStreamingErrorMessage(`Parameter session_id tidak ada. Silakan coba lagi.`);
        setIsStreaming(false);
        return;
      }
      
      // Extra validation untuk FastAPI compatibility
      const messageValue = formData.get('message') as string;
      const agentIdValue = formData.get('agent_id') as string;
      const streamValue = formData.get('stream') as string;
      const sessionIdValue = sessionIdParam as string;
      
      console.log('🔍 Final parameter validation:', {
        message_length: messageValue?.length || 0,
        agent_id_valid: agentIdValue === currentAgentId,
        stream_value: streamValue,
        session_id: sessionIdValue || '[EMPTY - NEW SESSION]',
        is_new_session: !sessionIdValue || (typeof sessionIdValue === 'string' && sessionIdValue.trim() === ''),
        total_form_entries: Array.from(formData.entries()).length
      });

      // Debug FormData yang dikirim
      console.log('Sending stream request to:', playgroundRunUrl);
      console.log('FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value || '[EMPTY]'}`);
        }
      }

      await streamResponse({
        apiUrl: playgroundRunUrl,
        requestBody: formData,
        onChunk: (chunk: RunResponse) => {
          // Route chunks berdasarkan event type
          switch (chunk.event) {
            case RunEvent.RunStarted:
              handleRunStarted(chunk);
              // Extract model information from RunResponseStartedEvent
              if (chunk.model || chunk.model_provider) {
                setStreamingStatus({
                  currentModel: chunk.model,
                  modelProvider: chunk.model_provider
                });
              }
              break;
              
            case RunEvent.ReasoningStarted:
              handleRunStarted(chunk);
              setStreamingStatus({
                isReasoningActive: true,
                isThinking: false
              });
              break;
              
            case RunEvent.RunResponse:
            case RunEvent.RunResponseContent:
              console.log('🔄 RunResponse received:', typeof chunk.content, chunk.content?.length || 0, 'chars');
              
              // Enhanced debug logging for citations
              console.log('🔍 Debug - Full chunk data:', {
                event: chunk.event,
                hasCitations: !!chunk.citations,
                hasExtraData: !!chunk.extra_data,
                hasReferences: !!chunk.extra_data?.references,
                citationsType: chunk.citations ? (Array.isArray(chunk.citations) ? 'array' : 'object') : 'none',
                citationsValue: chunk.citations,
                extraDataReferences: chunk.extra_data?.references,
                fullChunk: chunk // Full chunk structure for debugging
              });
              
              handleRunResponse(chunk, lastContent);
              
              // Update current chunk for real-time preview
              if (typeof chunk.content === 'string' && chunk.content.trim()) {
                setCurrentChunk(chunk.content);
              }
              
              // Extract enhanced information from RunResponseContentEvent
              if (chunk.event === RunEvent.RunResponseContent) {
                setStreamingStatus({
                  contentType: chunk.content_type,
                  citationsCount: Array.isArray(chunk.citations) 
                    ? chunk.citations.length 
                    : chunk.citations?.count || chunk.citations?.sources?.length,
                  hasImages: !!chunk.images?.length,
                  hasVideos: !!chunk.videos?.length, 
                  hasAudio: !!chunk.audio?.length
                });
              }
              
              // Extract citations information from RunResponse
              let extractedCitations: any[] = [];
              let citationsCount = 0;
              
              if (chunk.citations) {
                console.log('📚 Citations received:', {
                  type: Array.isArray(chunk.citations) ? 'array' : 'object',
                  count: Array.isArray(chunk.citations) 
                    ? chunk.citations.length 
                    : (chunk.citations as any).count || (chunk.citations as any).sources?.length || 0,
                  rawData: chunk.citations
                });
                
                if (Array.isArray(chunk.citations)) {
                  // Direct array of citations
                  extractedCitations = chunk.citations;
                  citationsCount = chunk.citations.length;
                } else if ((chunk.citations as any).sources) {
                  // Object with sources array
                  const citationObj = chunk.citations as any;
                  extractedCitations = citationObj.sources.map((source: any, index: number) => ({
                    id: `citation-${index}`,
                    title: source.title,
                    url: source.url,
                    source: source.url ? new URL(source.url).hostname : undefined,
                    excerpt: source.content,
                    metadata: source.metadata
                  }));
                  citationsCount = citationObj.sources.length;
                } else if ((chunk.citations as any).count) {
                  // Object with count only
                  citationsCount = (chunk.citations as any).count;
                }
              }
              
              // Fallback: Extract citations from extra_data.references if no direct citations
              if (extractedCitations.length === 0 && chunk.extra_data?.references) {
                console.log('📚 Fallback: Using references as citations:', chunk.extra_data.references.length);
                extractedCitations = chunk.extra_data.references.map((ref: any, index: number) => ({
                  id: `ref-citation-${index}`,
                  title: ref.title || 'Knowledge Base Reference',
                  url: ref.url,
                  source: ref.url ? new URL(ref.url).hostname : 'Knowledge Base',
                  excerpt: ref.content,
                  metadata: ref.metadata
                }));
                citationsCount = extractedCitations.length;
              }
              
              // Additional fallback: Extract from any vector chunk data in content or metadata
              if (extractedCitations.length === 0) {
                // Check if chunk contains vector data or chunk metadata
                const chunkData = chunk.content || (chunk as any).metadata || chunk;
                
                // Look for vector chunks in various possible formats
                if (typeof chunkData === 'string') {
                  try {
                    // Try to parse if it contains JSON with vector data
                    const parsed = JSON.parse(chunkData);
                    if (parsed.chunks || parsed.vector_chunks || parsed.sources) {
                      console.log('📚 Vector Fallback: Found vector chunks in content');
                      const vectorSources = parsed.chunks || parsed.vector_chunks || parsed.sources;
                      if (Array.isArray(vectorSources)) {
                        extractedCitations = vectorSources.map((chunk: any, index: number) => ({
                          id: `vector-${index}`,
                          title: chunk.title || `Document Chunk ${index + 1}`,
                          excerpt: chunk.content || chunk.text || chunk.chunk,
                          source: 'Knowledge Base',
                          metadata: chunk.meta_data || chunk.metadata
                        }));
                        citationsCount = extractedCitations.length;
                      }
                    }
                  } catch (e) {
                    // Not JSON, continue with other checks
                  }
                }
                
                // Check for vector data in chunk properties
                if (extractedCitations.length === 0 && (chunk as any).vector_chunks) {
                  console.log('📚 Vector Fallback: Found vector_chunks property');
                  const vectorChunks = (chunk as any).vector_chunks;
                  if (Array.isArray(vectorChunks)) {
                    extractedCitations = vectorChunks.map((vectorChunk: any, index: number) => ({
                      id: `vector-chunk-${index}`,
                      title: vectorChunk.title || `Vector Chunk ${index + 1}`,
                      excerpt: vectorChunk.content || vectorChunk.text,
                      source: 'Vector Database',
                      metadata: vectorChunk.metadata || vectorChunk.meta_data
                    }));
                    citationsCount = extractedCitations.length;
                  }
                }
              }
              
              // Set citations if we have any
              if (extractedCitations.length > 0 || citationsCount > 0) {
                console.log('✅ Setting citations:', { count: citationsCount, citations: extractedCitations });
                setStreamingStatus({
                  citations: extractedCitations,
                  citationsCount: citationsCount
                });
              }
              
              // Extract extra_data information from RunResponse
              if (chunk.extra_data) {
                console.log('📋 Extra data received:', {
                  references: chunk.extra_data.references?.length || 0,
                  reasoning_steps: chunk.extra_data.reasoning_steps?.length || 0,
                  metadata: Object.keys(chunk.extra_data.metadata || {}).length || 0
                });
                
                setStreamingStatus({
                  references: chunk.extra_data.references,
                  reasoningMessages: chunk.extra_data.reasoning_steps?.map(step => step.content || step.description) || [],
                  metadata: chunk.extra_data.metadata
                });
              }
              break;
              
            case RunEvent.RunCompleted:
              handleRunCompleted(chunk);
              
              // Clear current chunk as response is complete
              setCurrentChunk('');
              
              // Enhanced debug logging for final citations
              console.log('🔍 Debug - RunCompleted data:', {
                event: chunk.event,
                hasCitations: !!chunk.citations,
                hasExtraData: !!chunk.extra_data,
                hasReferences: !!chunk.extra_data?.references,
                citationsType: chunk.citations ? (Array.isArray(chunk.citations) ? 'array' : 'object') : 'none',
                citationsValue: chunk.citations,
                extraDataReferences: chunk.extra_data?.references
              });
              
              // Extract final information from RunResponseCompletedEvent
              setStreamingStatus({
                hasImages: !!chunk.images?.length,
                hasVideos: !!chunk.videos?.length,
                hasAudio: !!chunk.audio?.length,
                citationsCount: Array.isArray(chunk.citations) 
                  ? chunk.citations.length 
                  : (chunk.citations as any)?.count || (chunk.citations as any)?.sources?.length,
                processingMetrics: chunk.metrics ? {
                  tokensUsed: chunk.metrics.tokens_used,
                  processingTime: chunk.metrics.processing_time
                } : undefined
              });
              
              // Extract final citations information
              let finalCitations: any[] = [];
              let finalCitationsCount = 0;
              
              if (chunk.citations) {
                console.log('📚 Final citations:', {
                  type: Array.isArray(chunk.citations) ? 'array' : 'object',
                  count: Array.isArray(chunk.citations) 
                    ? chunk.citations.length 
                    : (chunk.citations as any).count || (chunk.citations as any).sources?.length || 0,
                  rawData: chunk.citations
                });
                
                if (Array.isArray(chunk.citations)) {
                  finalCitations = chunk.citations;
                  finalCitationsCount = chunk.citations.length;
                } else if ((chunk.citations as any).sources) {
                  const citationObj = chunk.citations as any;
                  finalCitations = citationObj.sources.map((source: any, index: number) => ({
                    id: `citation-${index}`,
                    title: source.title,
                    url: source.url,
                    source: source.url ? new URL(source.url).hostname : undefined,
                    excerpt: source.content,
                    metadata: source.metadata
                  }));
                  finalCitationsCount = citationObj.sources.length;
                } else if ((chunk.citations as any).count) {
                  finalCitationsCount = (chunk.citations as any).count;
                }
              }
              
              // Fallback: Extract citations from extra_data.references if no direct citations
              if (finalCitations.length === 0 && chunk.extra_data?.references) {
                console.log('📚 Final Fallback: Using references as citations:', chunk.extra_data.references.length);
                finalCitations = chunk.extra_data.references.map((ref: any, index: number) => ({
                  id: `final-citation-${index}`,
                  title: ref.title || 'Knowledge Base Reference',
                  url: ref.url,
                  source: ref.url ? new URL(ref.url).hostname : 'Knowledge Base',
                  excerpt: ref.content,
                  metadata: ref.metadata
                }));
                finalCitationsCount = finalCitations.length;
              }
              
              // Set final citations if we have any
              if (finalCitations.length > 0 || finalCitationsCount > 0) {
                console.log('✅ Setting final citations:', { count: finalCitationsCount, citations: finalCitations });
                setStreamingStatus({
                  citations: finalCitations,
                  citationsCount: finalCitationsCount
                });
              }
              
              // Extract final extra_data information
              if (chunk.extra_data) {
                console.log('📋 Final extra data:', {
                  references: chunk.extra_data.references?.length || 0,
                  reasoning_steps: chunk.extra_data.reasoning_steps?.length || 0,
                  metadata: Object.keys(chunk.extra_data.metadata || {}).length || 0
                });
                
                setStreamingStatus({
                  references: chunk.extra_data.references,
                  reasoningMessages: chunk.extra_data.reasoning_steps?.map(step => step.content || step.description) || [],
                  metadata: chunk.extra_data.metadata
                });
              }
              break;
              
            case RunEvent.ReasoningCompleted:
              console.log('Reasoning completed:', chunk.extra_data?.reasoning_steps?.length || 0, 'steps');
              
              // Extract reasoning completion information from ReasoningCompletedEvent
              setStreamingStatus({
                isReasoningActive: false,
                currentReasoningStep: undefined,
                reasoningSteps: chunk.extra_data?.reasoning_steps
              });
              break;
              
            case RunEvent.RunError:
              handleRunError(chunk);
              
              // Extract error information from RunResponseErrorEvent
              setStreamingStatus({
                errorMessage: chunk.content || chunk.message || 'Unknown error',
                hasCompleted: false,
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: false,
                isMemoryUpdateStarted: false,
                isReasoningActive: false
              });
              break;
              
            case RunEvent.ToolCallStarted:
              handleToolCallStarted(chunk);
              break;
              
            case RunEvent.ToolCallCompleted:
              handleToolCallCompleted(chunk);
              break;
              
            case RunEvent.ReasoningStep:
              handleReasoningStep(chunk);
              
              // Extract reasoning step information from ReasoningStepEvent
              if (chunk.reasoning_content) {
                setStreamingStatus({
                  currentReasoningStep: chunk.reasoning_content,
                  isReasoningActive: true
                });
              }
              break;
              
            case RunEvent.AccessingKnowledge:
              console.log('Accessing knowledge base:', chunk.content);
              // Update streaming status for knowledge access
              setStreamingStatus({ 
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: true,
                isMemoryUpdateStarted: false,
                toolName: undefined
              });
              break;
              
            case RunEvent.UpdatingMemory:
            case RunEvent.MemoryUpdateStarted:
              console.log('Memory update started:', chunk.content);
              // Update streaming status for memory update
              setStreamingStatus({ 
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: false,
                isMemoryUpdateStarted: true,
                toolName: undefined
              });
              break;
              
            case RunEvent.MemoryUpdateCompleted:
              console.log('Memory update completed:', {
                content: chunk.content,
                has_extra_data: !!chunk.extra_data,
                has_references: !!chunk.extra_data?.references,
                references_count: chunk.extra_data?.references?.length || 0,
                full_chunk: chunk
              });
              
              // Extract citations from memory update completion (Agno pattern)
              if (chunk.extra_data?.references && chunk.extra_data.references.length > 0) {
                console.log('📚 Memory Update: Extracting citations from extra_data.references:', chunk.extra_data.references.length);
                const memoryCitations = chunk.extra_data.references.map((ref: any, index: number) => ({
                  id: `memory-citation-${index}`,
                  title: ref.title || `Memory Reference ${index + 1}`,
                  url: ref.url,
                  source: ref.url ? new URL(ref.url).hostname : 'Knowledge Base',
                  excerpt: ref.content || ref.text,
                  metadata: ref.metadata
                }));
                
                setStreamingStatus({
                  citations: memoryCitations,
                  citationsCount: memoryCitations.length,
                  references: chunk.extra_data.references
                });
                
                console.log('📚 Memory citations extracted:', {
                  count: memoryCitations.length,
                  citations_preview: memoryCitations.slice(0, 2)
                });
              }
              
              // Reset memory update status
              setStreamingStatus({ 
                isMemoryUpdateStarted: false
              });
              break;
              
            case RunEvent.RunPaused:
              console.log('Run paused:', chunk.content);
              setStreamingStatus({ 
                isPaused: true,
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: false,
                isMemoryUpdateStarted: false
              });
              break;
              
            case RunEvent.RunContinued:
              console.log('Run continued:', chunk.content);
              setStreamingStatus({ 
                isPaused: false
              });
              break;
              
            case RunEvent.RunCancelled:
              console.log('Run cancelled:', chunk.content);
              
              // Extract cancellation information from RunResponseCancelledEvent
              setStreamingStatus({ 
                isCancelled: true,
                cancelReason: chunk.reason || 'User cancelled',
                isThinking: false,
                isCallingTool: false,
                isAccessingKnowledge: false,
                isMemoryUpdateStarted: false,
                isReasoningActive: false
              });
              setIsStreaming(false);
              break;
              
            default:
              console.log('Unknown event type:', chunk.event);
              break;
          }
        },
        onError: (error: Error) => {
          console.error('Stream error:', error);
          handleRunError(error);
        },
        onComplete: () => {
          console.log('Stream completed');
          
          // Jika stream selesai tapi tidak ada RunCompleted event,
          // pastikan streaming state dihentikan
          setIsStreaming(false);
          focusChatInput();
          
          // Pastikan pesan terakhir tidak dalam state error
          setMessages((prevMessages: PlaygroundChatMessage[]) => {
            const newMessages = [...prevMessages];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage && lastMessage.role === 'agent' && lastMessage.streamingError) {
              lastMessage.streamingError = false;
            }
            
            return newMessages;
          });
        }
      });

    } catch (error) {
      console.error('Error in handleStreamResponse:', error);
      updateMessagesWithErrorState();
      setStreamingErrorMessage(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setIsStreaming(false);
      focusChatInput();
    }
  }, [
    setIsStreaming,
    setStreamingErrorMessage,
    setMessages,
    addMessage,
    sessionId,
    streamResponse,
    handleRunStarted,
    handleRunResponse,
    handleRunCompleted,
    handleRunError,
    handleToolCallStarted,
    handleToolCallCompleted,
    handleReasoningStep,
    updateMessagesWithErrorState,
    focusChatInput,
    setSessionId,
    resetStreamingStatus,
    setStreamingStatus
  ]);

  return {
    handleStreamResponse
  };
} 