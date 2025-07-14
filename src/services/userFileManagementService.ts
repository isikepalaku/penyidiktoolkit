import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, bucketConfig } from '@/config/s3';
import { env } from '@/config/env';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/supabaseClient';

// ================================
// TYPES & INTERFACES
// ================================

export interface UserFile {
  id: string;
  user_id: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  file_extension: string;
  s3_bucket: string;
  s3_key: string;
  s3_url: string;
  etag?: string;
  category: 'document' | 'image' | 'video' | 'audio' | 'other';
  folder_path: string;
  tags: string[];
  description?: string;
  upload_status: 'uploading' | 'completed' | 'failed' | 'processing';
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  thumbnail_url?: string;
  is_public: boolean;
  access_level: 'private' | 'shared' | 'public';
  password_protected: boolean;
  password_hash?: string;
  share_token?: string;
  share_expires_at?: string;
  download_count: number;
  view_count: number;
  metadata: Record<string, any>;
  processing_metadata: Record<string, any>;
  access_log: any[];
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface FileUploadOptions {
  category?: 'document' | 'image' | 'video' | 'audio' | 'other';
  folder_path?: string;
  tags?: string[];
  description?: string;
  is_public?: boolean;
  access_level?: 'private' | 'shared' | 'public';
  password?: string;
}

export interface FileSearchOptions {
  query?: string;
  category?: string;
  folder_path?: string;
  tags?: string[];
  access_level?: string;
  date_from?: string;
  date_to?: string;
  file_type?: string;
  sort_by?: 'created_at' | 'updated_at' | 'file_size' | 'download_count';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface StorageQuota {
  id: string;
  user_id: string;
  total_quota: number;
  used_storage: number;
  available_storage: number;
  max_files: number;
  current_file_count: number;
  quota_type: 'basic' | 'premium' | 'enterprise' | 'unlimited';
  is_unlimited: boolean;
  monthly_bandwidth_limit: number;
  current_monthly_bandwidth: number;
  bandwidth_reset_date: string;
  quota_warning_sent: boolean;
  quota_exceeded: boolean;
  auto_cleanup_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_calculated_at: string;
}

export interface FileShareOptions {
  share_type: 'private' | 'public' | 'password' | 'link';
  shared_with_user_id?: string;
  password?: string;
  permissions?: {
    read: boolean;
    download: boolean;
    comment: boolean;
  };
  max_downloads?: number;
  expires_at?: Date;
}

// ================================
// CONFIGURATION & CONSTANTS
// ================================

const MAX_FILE_SIZE = env.maxFileSize || 52428800; // 50MB default
const ALLOWED_FILE_TYPES = [
  'application/pdf', 'text/plain', 'text/html', 'text/css', 'text/markdown',
  'text/csv', 'text/xml', 'application/rtf', 'application/javascript',
  'text/javascript', 'application/x-javascript', 'text/x-python',
  'application/x-python', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
  'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm',
  'audio/mp3', 'audio/wav', 'audio/ogg'
];

// ================================
// UTILITY FUNCTIONS
// ================================

function getFileCategory(mimeType: string): 'document' | 'image' | 'video' | 'audio' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
  return 'other';
}

function generateS3Key(userId: string, category: string, filename: string): string {
  const uuid = uuidv4();
  
  // Map file categories to bucket folder structure
  const categoryMapping: Record<string, keyof typeof bucketConfig.userFolders> = {
    'document': 'documents',
    'image': 'images', 
    'video': 'documents', // Store videos in documents folder for now
    'audio': 'documents', // Store audio in documents folder for now
    'other': 'documents'  // Store other files in documents folder
  };
  
  // Get the correct folder key, fallback to 'documents'
  const folderKey = categoryMapping[category] || 'documents';
  
  // Get the folder path and replace placeholder
  const folderPath = bucketConfig.userFolders[folderKey].replace('{userId}', userId);
  
  return `${folderPath}${uuid}-${filename}`;
}

function generateS3Url(s3Key: string): string {
  return `${env.s3Endpoint}/${bucketConfig.name}/${s3Key}`;
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ================================
// CORE FILE MANAGEMENT CLASS
// ================================

export class UserFileManagementService {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.s3 = s3Client;
    this.bucket = bucketConfig.name;
  }

  // ================================
  // FILE UPLOAD OPERATIONS
  // ================================

  /**
   * Upload file ke S3 dengan metadata tracking
   */
  async uploadFile(
    file: File, 
    userId: string, 
    options: FileUploadOptions = {}
  ): Promise<{ success: boolean; file?: UserFile; error?: string }> {
    try {
      // Validate file
      const validation = await this.validateFile(file, userId);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate file metadata
      const category = options.category || getFileCategory(file.type);
      const sanitizedFilename = sanitizeFilename(file.name);
      const fileExtension = sanitizedFilename.split('.').pop() || '';
      const storedFilename = `${uuidv4()}-${sanitizedFilename}`;
      const s3Key = generateS3Key(userId, category, sanitizedFilename);
      const s3Url = generateS3Url(s3Key);
      const folderPath = options.folder_path || '/';

      // Create file record in database (with uploading status)
      const { data: fileRecord, error: dbError } = await supabase
        .from('user_files')
        .insert({
          user_id: userId,
          original_filename: file.name,
          stored_filename: storedFilename,
          file_path: `users/${userId}/${category}/${sanitizedFilename}`,
          file_size: file.size,
          file_type: file.type,
          file_extension: fileExtension,
          s3_bucket: this.bucket,
          s3_key: s3Key,
          s3_url: s3Url,
          category: category,
          folder_path: folderPath,
          tags: options.tags || [],
          description: options.description,
          upload_status: 'uploading',
          processing_status: 'pending',
          is_public: options.is_public || false,
          access_level: options.access_level || 'private',
          password_protected: !!options.password,
          password_hash: options.password ? await hashPassword(options.password) : null,
          metadata: {
            original_name: file.name,
            mime_type: file.type,
            size_formatted: formatFileSize(file.size),
            upload_timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error creating file record:', dbError);
        return { success: false, error: 'Failed to create file record' };
      }

      try {
        // Upload to S3
        const uploadCommand = new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: file,
          ContentType: file.type,
          Metadata: {
            'original-filename': file.name,
            'user-id': userId,
            'category': category,
            'upload-timestamp': new Date().toISOString()
          }
        });

        const result = await this.s3.send(uploadCommand);
        console.log('✅ S3 upload successful:', { s3Key, etag: result.ETag });

        // Update file status to completed
        const { data: updatedFile, error: updateError } = await supabase
          .from('user_files')
          .update({
            upload_status: 'completed',
            processing_status: 'completed',
            etag: result.ETag,
            updated_at: new Date().toISOString()
          })
          .eq('id', fileRecord.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating file status:', updateError);
        }

        // Update user storage quota
        await this.updateStorageUsage(userId, file.size, 'add');

        console.log('📁 File uploaded successfully:', {
          fileId: fileRecord.id,
          filename: file.name,
          size: formatFileSize(file.size),
          s3Key: s3Key
        });

        return { 
          success: true, 
          file: updatedFile || fileRecord 
        };

      } catch (s3Error) {
        console.error('S3 upload error:', s3Error);
        
        // Update file status to failed
        await supabase
          .from('user_files')
          .update({
            upload_status: 'failed',
            processing_status: 'failed'
          })
          .eq('id', fileRecord.id);

        return { success: false, error: 'Failed to upload file to storage' };
      }

    } catch (error) {
      console.error('Upload file error:', error);
      return { success: false, error: 'Upload failed' };
    }
  }

  /**
   * Generate presigned URL untuk direct upload ke S3
   */
  async generatePresignedUploadUrl(
    filename: string,
    fileType: string,
    userId: string,
    category: string = 'document'
  ): Promise<{ success: boolean; uploadUrl?: string; s3Key?: string; error?: string }> {
    try {
      const sanitizedFilename = sanitizeFilename(filename);
      const s3Key = generateS3Key(userId, category, sanitizedFilename);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        ContentType: fileType,
        Metadata: {
          'original-filename': filename,
          'user-id': userId,
          'category': category
        }
      });

      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 }); // 1 hour

      console.log('🔗 Generated presigned upload URL:', { s3Key, filename });

      return {
        success: true,
        uploadUrl,
        s3Key
      };

    } catch (error) {
      console.error('Error generating presigned URL:', error);
      return { success: false, error: 'Failed to generate upload URL' };
    }
  }

  // ================================
  // FILE RETRIEVAL OPERATIONS
  // ================================

  /**
   * Get user files dengan filtering dan pagination
   */
  async getUserFiles(
    userId: string, 
    options: FileSearchOptions = {}
  ): Promise<{ success: boolean; files?: UserFile[]; total?: number; error?: string }> {
    try {
      let query = supabase
        .from('user_files')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (options.category) {
        query = query.eq('category', options.category);
      }

      if (options.folder_path) {
        query = query.eq('folder_path', options.folder_path);
      }

      if (options.access_level) {
        query = query.eq('access_level', options.access_level);
      }

      if (options.file_type) {
        query = query.eq('file_type', options.file_type);
      }

      if (options.tags && options.tags.length > 0) {
        query = query.overlaps('tags', options.tags);
      }

      if (options.query) {
        query = query.or(`original_filename.ilike.%${options.query}%,description.ilike.%${options.query}%`);
      }

      if (options.date_from) {
        query = query.gte('created_at', options.date_from);
      }

      if (options.date_to) {
        query = query.lte('created_at', options.date_to);
      }

      // Apply sorting
      const sortBy = options.sort_by || 'created_at';
      const sortOrder = options.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      const { data: files, error, count } = await query;

      if (error) {
        console.error('Error fetching user files:', error);
        return { success: false, error: 'Failed to fetch files' };
      }

      console.log('📋 Retrieved user files:', { 
        userId, 
        count: files?.length || 0, 
        total: count,
        filters: options 
      });

      return {
        success: true,
        files: files || [],
        total: count || 0
      };

    } catch (error) {
      console.error('Get user files error:', error);
      return { success: false, error: 'Failed to retrieve files' };
    }
  }

  /**
   * Get file by ID dengan access control
   */
  async getFileById(
    fileId: string, 
    userId: string
  ): Promise<{ success: boolean; file?: UserFile; error?: string }> {
    try {
      const { data: file, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching file:', error);
        return { success: false, error: 'File not found' };
      }

      // Update last accessed timestamp
      await supabase
        .from('user_files')
        .update({ 
          last_accessed_at: new Date().toISOString(),
          view_count: file.view_count + 1
        })
        .eq('id', fileId);

      return { success: true, file };

    } catch (error) {
      console.error('Get file by ID error:', error);
      return { success: false, error: 'Failed to retrieve file' };
    }
  }

  // ================================
  // FILE DOWNLOAD OPERATIONS
  // ================================

  /**
   * Generate presigned download URL
   */
  async generateDownloadUrl(
    fileId: string, 
    userId: string
  ): Promise<{ success: boolean; downloadUrl?: string; filename?: string; error?: string }> {
    try {
      // Get file record
      const fileResult = await this.getFileById(fileId, userId);
      if (!fileResult.success || !fileResult.file) {
        return { success: false, error: 'File not found' };
      }

      const file = fileResult.file;

      // Generate presigned URL for download
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: file.s3_key,
        ResponseContentDisposition: `attachment; filename="${file.original_filename}"`
      });

      const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 }); // 1 hour

      // Update download count
      await supabase
        .from('user_files')
        .update({ 
          download_count: file.download_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', fileId);

      console.log('⬇️ Generated download URL:', { 
        fileId, 
        filename: file.original_filename,
        downloads: file.download_count + 1
      });

      return {
        success: true,
        downloadUrl,
        filename: file.original_filename
      };

    } catch (error) {
      console.error('Generate download URL error:', error);
      return { success: false, error: 'Failed to generate download URL' };
    }
  }

  // ================================
  // FILE DELETION OPERATIONS
  // ================================

  /**
   * Delete file dari S3 dan database
   */
  async deleteFile(
    fileId: string, 
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get file record
      const fileResult = await this.getFileById(fileId, userId);
      if (!fileResult.success || !fileResult.file) {
        return { success: false, error: 'File not found' };
      }

      const file = fileResult.file;

      // Delete from S3
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: file.s3_key
        });

        await this.s3.send(deleteCommand);
        console.log('🗑️ File deleted from S3:', file.s3_key);

      } catch (s3Error) {
        console.error('S3 deletion error:', s3Error);
        // Continue with database deletion even if S3 fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        return { success: false, error: 'Failed to delete file record' };
      }

      // Update storage quota
      await this.updateStorageUsage(userId, file.file_size, 'remove');

      console.log('✅ File deleted successfully:', {
        fileId,
        filename: file.original_filename,
        size: formatFileSize(file.file_size)
      });

      return { success: true };

    } catch (error) {
      console.error('Delete file error:', error);
      return { success: false, error: 'Failed to delete file' };
    }
  }

  /**
   * Update file sharing settings
   */
  async shareFile(
    fileId: string,
    userId: string,
    options: FileShareOptions
  ): Promise<{ success: boolean; shareUrl?: string; error?: string }> {
    try {
      // 1. Verify file ownership
      const { data: file, error: fetchError } = await supabase
        .from('user_files')
        .select('id, user_id')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !file) {
        console.error('Error fetching file or permission denied:', fetchError);
        return { success: false, error: 'File not found or permission denied.' };
      }

      // 2. Prepare update payload
      const shareToken = uuidv4();
      const passwordHash = options.password ? await hashPassword(options.password) : undefined;
      
      const updatePayload: Partial<UserFile> = {
        access_level: options.share_type === 'public' ? 'public' : 'shared',
        password_protected: !!options.password,
        password_hash: passwordHash,
        share_token: shareToken,
        share_expires_at: options.expires_at?.toISOString(),
      };

      // 3. Update the database
      const { error: updateError } = await supabase
        .from('user_files')
        .update(updatePayload)
        .eq('id', fileId);
      
      if (updateError) {
        console.error('Failed to update file sharing settings:', updateError);
        return { success: false, error: 'Could not update file settings.' };
      }

      // 4. Return shareable URL
      const shareUrl = `${window.location.origin}/share/${shareToken}`;

      return { success: true, shareUrl };

    } catch (err) {
      console.error('Unexpected error in shareFile:', err);
      return { success: false, error: 'An unexpected error occurred.' };
    }
  }

  // ================================
  // QUOTA MANAGEMENT
  // ================================

  /**
   * Get user storage quota
   */
  async getUserQuota(userId: string): Promise<{ success: boolean; quota?: StorageQuota; error?: string }> {
    try {
      const { data: quota, error } = await supabase
        .from('user_storage_quotas')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching quota:', error);
        return { success: false, error: 'Failed to fetch quota' };
      }

      return { success: true, quota };

    } catch (error) {
      console.error('Get user quota error:', error);
      return { success: false, error: 'Failed to retrieve quota' };
    }
  }

  /**
   * Update storage usage menggunakan database function
   */
  private async updateStorageUsage(
    userId: string, 
    fileSize: number, 
    operation: 'add' | 'remove'
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_storage_usage', {
        p_user_id: userId,
        p_file_size: fileSize,
        p_operation: operation
      });

      if (error) {
        console.error('Error updating storage usage:', error);
        return false;
      }

      console.log('💾 Storage usage updated:', { 
        userId, 
        operation, 
        size: formatFileSize(fileSize),
        success: data
      });

      return data;

    } catch (error) {
      console.error('Update storage usage error:', error);
      return false;
    }
  }

  /**
   * Check if user has enough quota untuk upload
   */
  async checkQuota(userId: string, fileSize: number): Promise<{ success: boolean; hasQuota?: boolean; quota?: StorageQuota; error?: string }> {
    try {
      const quotaResult = await this.getUserQuota(userId);
      if (!quotaResult.success || !quotaResult.quota) {
        return { success: false, error: 'Failed to check quota' };
      }

      const quota = quotaResult.quota;
      const hasQuota = quota.is_unlimited || (quota.available_storage >= fileSize);

      return {
        success: true,
        hasQuota,
        quota
      };

    } catch (error) {
      console.error('Check quota error:', error);
      return { success: false, error: 'Failed to check quota' };
    }
  }

  // ================================
  // FILE VALIDATION
  // ================================

  /**
   * Validate file sebelum upload
   */
  private async validateFile(file: File, userId: string): Promise<{ valid: boolean; error?: string }> {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File terlalu besar. Maksimal ${formatFileSize(MAX_FILE_SIZE)}` 
      };
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: `Format file tidak didukung: ${file.type}` 
      };
    }

    // Check quota
    const quotaCheck = await this.checkQuota(userId, file.size);
    if (!quotaCheck.success) {
      return { 
        valid: false, 
        error: 'Failed to check storage quota' 
      };
    }

    if (!quotaCheck.hasQuota) {
      return { 
        valid: false, 
        error: 'Storage quota exceeded. Please free up space or upgrade your plan.' 
      };
    }

    return { valid: true };
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Get storage statistics
   */
  async getStorageStats(userId: string): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const [quotaResult, filesResult] = await Promise.all([
        this.getUserQuota(userId),
        this.getUserFiles(userId, { limit: 1 })
      ]);

      if (!quotaResult.success || !filesResult.success) {
        return { success: false, error: 'Failed to fetch statistics' };
      }

      const quota = quotaResult.quota!;
      const stats = {
        quota: {
          total: quota.total_quota,
          used: quota.used_storage,
          available: quota.available_storage,
          percentage: quota.total_quota > 0 ? Math.round((quota.used_storage / quota.total_quota) * 100) : 0,
          formatted: {
            total: formatFileSize(quota.total_quota),
            used: formatFileSize(quota.used_storage),
            available: formatFileSize(quota.available_storage)
          }
        },
        files: {
          total: filesResult.total || 0,
          max: quota.max_files
        },
        bandwidth: {
          monthly_limit: quota.monthly_bandwidth_limit,
          current: quota.current_monthly_bandwidth,
          formatted: {
            limit: formatFileSize(quota.monthly_bandwidth_limit),
            current: formatFileSize(quota.current_monthly_bandwidth)
          }
        }
      };

      return { success: true, stats };

    } catch (error) {
      console.error('Get storage stats error:', error);
      return { success: false, error: 'Failed to get statistics' };
    }
  }
}

// ================================
// EXPORT SINGLETON INSTANCE
// ================================

export const userFileService = new UserFileManagementService();
export default userFileService; 