export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
  apiKey: import.meta.env.VITE_API_KEY,
  apiUrl: import.meta.env.VITE_API_URL,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
} as const;
