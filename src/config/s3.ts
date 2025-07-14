import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

// Contabo S3 Configuration
export const s3Config = {
  region: env.s3Region,
  endpoint: env.s3Endpoint,
  credentials: {
    accessKeyId: env.s3AccessKeyId,
    secretAccessKey: env.s3SecretAccessKey,
  },
  forcePathStyle: true, // Required for Contabo S3 compatibility
  apiVersion: '2006-03-01',
};

// Create S3 Client instance
export const s3Client = new S3Client(s3Config);

// Bucket configuration berdasarkan setup Contabo
export const bucketConfig = {
  name: env.s3BucketName,
  bucketId: env.s3BucketId,
  endpoint: env.s3Endpoint,
  region: env.s3Region,
  cdnUrl: env.s3CdnUrl,
  
  // User-specific folder structure untuk organized storage
  userFolders: {
    documents: 'users/{userId}/documents/', // PDF, DOC, TXT files
    images: 'users/{userId}/images/',       // JPG, PNG, WEBP files
    analysis: 'users/{userId}/analysis/',   // AI analysis results
    shared: 'users/{userId}/shared/',       // Shared files dengan users lain
    temp: 'users/{userId}/temp/',           // Temporary files (auto-cleanup)
    archive: 'users/{userId}/archive/',     // Archived old files
  },
  
  // System folders untuk aplikasi
  system: {
    templates: 'system/templates/',         // Document templates
    backups: 'system/backups/',            // System backups
    logs: 'system/logs/',                  // Application logs
    thumbnails: 'system/thumbnails/',      // Generated thumbnails
  },
  
  // File type mappings
  fileTypeCategories: {
    documents: ['pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx', 'rtf'],
    images: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'],
    analysis: ['json', 'xml', 'html'], // AI analysis outputs
  },
  
  // Presigned URL settings
  presignedUrlExpiry: 3600, // 1 hour default
  downloadUrlExpiry: 3600,  // 1 hour default
  uploadUrlExpiry: 3600,    // 1 hour default
};

// Helper functions untuk S3 operations
export const generateS3Key = (
  userId: string,
  category: keyof typeof bucketConfig.userFolders,
  fileId: string,
  originalFileName: string
): string => {
  const folder = bucketConfig.userFolders[category].replace('{userId}', userId);
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sanitizedFileName = sanitizeFileName(originalFileName);
  
  return `${folder}${timestamp}/${fileId}_${sanitizedFileName}`;
};

export const sanitizeFileName = (fileName: string): string => {
  // Remove/replace invalid characters for S3 keys
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
};

export const extractFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

export const categorizeFileByExtension = (fileName: string): keyof typeof bucketConfig.userFolders => {
  const extension = extractFileExtension(fileName);
  
  if (bucketConfig.fileTypeCategories.documents.includes(extension)) {
    return 'documents';
  } else if (bucketConfig.fileTypeCategories.images.includes(extension)) {
    return 'images';
  } else if (bucketConfig.fileTypeCategories.analysis.includes(extension)) {
    return 'analysis';
  }
  
  return 'documents'; // Default fallback
};

export const generatePublicUrl = (s3Key: string): string => {
  if (env.s3CdnUrl) {
    return `${env.s3CdnUrl}/${s3Key}`;
  }
  return `${env.s3Endpoint}/${env.s3BucketName}/${s3Key}`;
};

// S3 Client health check
export const testS3Connection = async (): Promise<{
  success: boolean;
  message: string;
  config?: any;
}> => {
  try {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    const command = new ListObjectsV2Command({
      Bucket: bucketConfig.name,
      MaxKeys: 1,
    });
    
    const response = await s3Client.send(command);
    
    return {
      success: true,
      message: 'S3 connection successful',
      config: {
        bucket: bucketConfig.name,
        region: bucketConfig.region,
        endpoint: bucketConfig.endpoint,
        keyCount: response.KeyCount || 0,
        hasObjects: (response.KeyCount || 0) > 0,
      },
    };
  } catch (error: any) {
    console.error('S3 Connection Test Failed:', error);
    
    return {
      success: false,
      message: `S3 connection failed: ${error.message || 'Unknown error'}`,
      config: {
        bucket: bucketConfig.name,
        region: bucketConfig.region,
        endpoint: bucketConfig.endpoint,
        error: error.code || 'UNKNOWN_ERROR',
      },
    };
  }
};

// Validate S3 environment configuration
export const validateS3Config = (): {
  valid: boolean;
  issues: string[];
  config: any;
} => {
  const issues: string[] = [];
  
  if (!env.s3AccessKeyId) {
    issues.push('S3_ACCESS_KEY_ID is missing');
  }
  
  if (!env.s3SecretAccessKey) {
    issues.push('S3_SECRET_ACCESS_KEY is missing');
  }
  
  if (!env.s3BucketName) {
    issues.push('S3_BUCKET_NAME is missing');
  }
  
  if (!env.s3Endpoint) {
    issues.push('S3_ENDPOINT is missing');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    config: {
      endpoint: env.s3Endpoint,
      region: env.s3Region,
      bucket: env.s3BucketName,
      bucketId: env.s3BucketId,
      cdnConfigured: !!env.s3CdnUrl,
      credentialsConfigured: !!(env.s3AccessKeyId && env.s3SecretAccessKey),
    },
  };
};

// Export default client dan config untuk easy import
export default {
  client: s3Client,
  config: bucketConfig,
  helpers: {
    generateS3Key,
    sanitizeFileName,
    extractFileExtension,
    categorizeFileByExtension,
    generatePublicUrl,
  },
  utils: {
    testConnection: testS3Connection,
    validateConfig: validateS3Config,
  },
}; 