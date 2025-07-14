import { z } from 'zod';

// Define environment schema dengan S3 dan file management settings
const envVars = {
  nodeEnv: import.meta.env.MODE || 'development',
  apiUrl: import.meta.env.VITE_API_BASE_URL,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  apiKey: import.meta.env.VITE_API_KEY,
  perkabaApiKey: import.meta.env.VITE_PERKABA_API_KEY,
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  s3AccessKeyId: import.meta.env.VITE_S3_ACCESS_KEY_ID,
  s3SecretAccessKey: import.meta.env.VITE_S3_SECRET_ACCESS_KEY,
  s3Endpoint: import.meta.env.VITE_S3_ENDPOINT,
  s3Region: import.meta.env.VITE_S3_REGION,
  s3BucketName: import.meta.env.VITE_S3_BUCKET_NAME,
  paperlessUrl: import.meta.env.VITE_PAPERLESS_URL,
  paperlessApiToken: import.meta.env.VITE_PAPERLESS_API_TOKEN,
};

const envSchema = z.object({
  // Existing API settings (untuk api.reserse.id)
  apiKey: z.string(), // tanpa default, wajib dari .env
  apiUrl: z.string().default('https://api.reserse.id'),

  // Perkaba API settings (untuk flow.reserse.id)
  perkabaApiUrl: z.string().default('https://flow.reserse.id'),
  perkabaApiKey: z.string().default('kzeL0g3LzjRzG9a0-jgbay441zTkAaGgC1mu0jVs330'),

  // OpenAI settings
  openaiApiKey: z.string().optional(),

  // Gemini API settings
  geminiApiKey: z.string().optional(),

  // Supabase settings
  supabaseUrl: z.string().default('https://cckuzygknaeqsnmnzfku.supabase.co'),
  supabaseAnonKey: z.string().optional(),
  supabaseServiceKey: z.string().optional(),

  // Contabo S3 Object Storage Configuration
  s3AccessKeyId: z.string(),
  s3SecretAccessKey: z.string(),
  s3Endpoint: z.string().default('https://eu2.contabostorage.com'),
  s3Region: z.string().default('eu-central-1'),
  s3BucketName: z.string().default('dokumen'),
  s3BucketId: z.string().default('318bfdb9958e4c35af7fe3dd417e7386'),
  s3CdnUrl: z.string().optional(),

  // File Upload Limits
  maxFileSize: z.number().default(52428800), // 50MB
  maxFilesPerUser: z.number().default(1000),
  userStorageQuota: z.number().default(1073741824), // 1GB

  // File sharing settings
  shareTokenExpiryHours: z.number().default(24),
  maxSharesPerFile: z.number().default(10),

  // File retention settings
  fileRetentionDays: z.number().default(365),

  // Paperless NGX settings
  paperlessUrl: z.string().default('http://localhost:8000'),
  paperlessApiToken: z.string().optional(),
});

// Parse environment variables dengan type safety
const parsedEnv = envSchema.parse({
  // Existing API settings
  apiKey: envVars.apiKey,
  apiUrl: envVars.apiUrl,
  
  // Perkaba API
  perkabaApiUrl: import.meta.env.VITE_PERKABA_API_URL,
  perkabaApiKey: envVars.perkabaApiKey,
  
  // OpenAI
  openaiApiKey: envVars.openaiApiKey,
  
  // Gemini
  geminiApiKey: envVars.geminiApiKey,
  
  // Supabase
  supabaseUrl: envVars.supabaseUrl,
  supabaseAnonKey: envVars.supabaseAnonKey,
  supabaseServiceKey: import.meta.env.VITE_SUPABASE_SERVICE_KEY,

  // Contabo S3 Configuration
  s3AccessKeyId: envVars.s3AccessKeyId,
  s3SecretAccessKey: envVars.s3SecretAccessKey,
  s3Endpoint: envVars.s3Endpoint,
  s3Region: envVars.s3Region,
  s3BucketName: envVars.s3BucketName,
  s3BucketId: import.meta.env.S3_BUCKET_ID,
  s3CdnUrl: import.meta.env.S3_CDN_URL,

  // File management settings
  maxFileSize: parseInt(import.meta.env.MAX_FILE_SIZE || '52428800'),
  maxFilesPerUser: parseInt(import.meta.env.MAX_FILES_PER_USER || '1000'),
  userStorageQuota: parseInt(import.meta.env.USER_STORAGE_QUOTA || '1073741824'),
  
  // File sharing
  shareTokenExpiryHours: parseInt(import.meta.env.SHARE_TOKEN_EXPIRY_HOURS || '24'),
  maxSharesPerFile: parseInt(import.meta.env.MAX_SHARES_PER_FILE || '10'),
  
  // File retention
  fileRetentionDays: parseInt(import.meta.env.FILE_RETENTION_DAYS || '365'),

  // Paperless
  paperlessUrl: envVars.paperlessUrl,
  paperlessApiToken: envVars.paperlessApiToken,
});

// Export the environment configuration
export const env = parsedEnv;

// Helper untuk format file size
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Helper untuk validate file type
export const isAllowedFileType = (fileName: string): boolean => {
  const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp'];
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
};

// Export environment info untuk debugging
export const getEnvInfo = () => ({
  isProduction: envVars.isProduction,
  isDevelopment: envVars.isDevelopment,
  s3Configured: !!(env.s3AccessKeyId && env.s3SecretAccessKey),
  supabaseConfigured: !!env.supabaseUrl,
  paperlessConfigured: !!env.paperlessApiToken,
  maxFileSize: formatFileSize(env.maxFileSize),
  userQuota: formatFileSize(env.userStorageQuota),
});
