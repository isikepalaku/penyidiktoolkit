import { z } from 'zod';

// Define environment schema dengan apiKey wajib dari env
const envSchema = z.object({
  // API settings (untuk api.reserse.id)
  apiKey: z.string(), // tanpa default, wajib dari .env
  apiUrl: z.string().default('https://api.reserse.id'),

  // Perkaba API settings (untuk flow.reserse.id)
  perkabaApiUrl: z.string().default('https://flow.reserse.id'),
  perkabaApiKey: z.string().default('kzeL0g3LzjRzG9a0-jgbay441zTkAaGgC1mu0jVs330'),

  // OpenAI settings
  openaiApiKey: z.string().optional(),

  // Supabase settings
  supabaseUrl: z.string().default('https://cckuzygknaeqsnmnzfku.supabase.co'),
  supabaseAnonKey: z.string().optional(),
  supabaseServiceKey: z.string().optional(),

  // Google/Gemini settings
  geminiApiKey: z.string().optional(),
  projectId: z.string().default('reserseapp'),
  googleModelName: z.string().default('gemini-2.0-flash-exp'),

  // Paperless NGX settings - development akan menggunakan proxy
  paperlessUrl: z.string().default(
    import.meta.env.DEV 
      ? '/paperless'  // Proxy untuk development
      : 'https://dokumen.reserse.id'  // Direct URL untuk production
  ),
  paperlessApiToken: z.string().optional(),
});

const processEnv = {
  apiKey: import.meta.env.VITE_API_KEY,
  apiUrl: import.meta.env.VITE_API_URL,
  perkabaApiUrl: import.meta.env.VITE_PERKABA_API_URL,
  perkabaApiKey: import.meta.env.VITE_PERKABA_API_KEY,
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  supabaseServiceKey: import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
  projectId: import.meta.env.VITE_GCP_PROJECT_ID,
  googleModelName: import.meta.env.VITE_GOOGLE_MODEL_NAME,
  // Override paperlessUrl untuk development mode agar selalu gunakan proxy
  paperlessUrl: import.meta.env.DEV 
    ? '/paperless' 
    : (import.meta.env.VITE_PAPERLESS_URL || 'https://dokumen.reserse.id'),
  paperlessApiToken: import.meta.env.VITE_PAPERLESS_API_TOKEN,
};

// Parse and validate environment variables
const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
} else {
  console.log('✅ Environment variables loaded successfully');
}

// Export the environment tanpa fallback apiKey agar tidak bocor
export const env = parsed.success ? parsed.data : envSchema.parse({
  // apiKey: ... // JANGAN ADA
  apiUrl: 'https://api.reserse.id',
  perkabaApiUrl: 'https://flow.reserse.id',
  perkabaApiKey: 'kzeL0g3LzjRzG9a0-jgbay441zTkAaGgC1mu0jVs330',
  supabaseUrl: 'https://cckuzygknaeqsnmnzfku.supabase.co',
  projectId: 'reserseapp',
  googleModelName: 'gemini-2.0-flash-exp',
  paperlessUrl: import.meta.env.DEV ? '/paperless' : 'https://dokumen.reserse.id'
});

// Logging untuk debug
console.log('Environment config:', {
  apiKey: '[REDACTED]',
  apiUrl: env.apiUrl,
  perkabaApiUrl: env.perkabaApiUrl,
  paperlessUrl: env.paperlessUrl,
  isDev: import.meta.env.DEV
});
