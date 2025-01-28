import { z } from 'zod';

// Define environment schema with most fields optional
const envSchema = z.object({
  // Perkaba API settings
  perkabaApiUrl: z.string().default('http://147.79.70.246:3086'),
  perkabaApiKey: z.string().optional(),

  // Supabase settings
  supabaseUrl: z.string().optional(),
  supabaseAnonKey: z.string().optional(),

  // API settings
  openaiApiKey: z.string().optional(),
  apiKey: z.string().optional(),
  apiUrl: z.string().optional(),
  apiBaseUrl: z.string().optional(),

  // Google/Gemini settings
  geminiApiKey: z.string().optional(),
  projectId: z.string().optional(),
  googleApiKey: z.string().optional(),
  googleModelName: z.string().default('gemini-pro'),
});

const processEnv = {
  perkabaApiUrl: import.meta.env.VITE_PERKABA_API_URL,
  perkabaApiKey: import.meta.env.VITE_PERKABA_API_KEY,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
  apiKey: import.meta.env.VITE_API_KEY,
  apiUrl: import.meta.env.VITE_API_URL,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
  projectId: import.meta.env.VITE_GCP_PROJECT_ID,
  googleApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  googleModelName: import.meta.env.VITE_GOOGLE_MODEL_NAME,
};

// Parse and validate environment variables
const parsed = envSchema.safeParse(processEnv);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
} else {
  console.log('✅ Environment variables loaded successfully');
}

// Export the environment, with at least the default values
export const env = parsed.success ? parsed.data : envSchema.parse({
  perkabaApiUrl: 'http://147.79.70.246:3086',
  googleModelName: 'gemini-pro'
});
