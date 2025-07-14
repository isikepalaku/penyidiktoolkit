// ================================
// SIMPLE DATABASE-DRIVEN UPLOAD SERVICE
// ================================
// Service yang menggunakan database functions untuk otomatis mendeteksi dan mengelola duplikasi file

import { supabase } from '@/supabaseClient';
import { s3Client, bucketConfig } from '@/config/s3';
import { computeFileHash } from '@/utils/fileHashUtils';
import { v4 as uuidv4 } from 'uuid';

// ================================
// TYPES & INTERFACES
// ================================

export interface SimpleUploadProgress {
  status: 'hashing' | 'checking' | 'uploading' | 'saving' | 'completed' | 'failed';
  percent: number;
  currentFile: string;
  fileIndex: number;
  totalFiles: number;
  isDuplicate?: boolean;
  spaceSaved?: number;
  message?: string;
  error?: string;
}

export interface SimpleUploadResult {
  success: boolean;
  fileId: string;
  isDuplicate: boolean;
  spaceSaved: number;
  message: string;
  originalFileId: string;
  error?: string;
}

export interface DeduplicationSummary {
  totalFiles: number;
  uniqueFiles: number;
  referencedFiles: number;
  totalSize: number;
  actualSize: number;
  spaceSaved: number;
  spaceSavedPercent: number;
}

export interface SimpleUploadOptions {
  onProgress?: (progress: SimpleUploadProgress) => void;
  onFileComplete?: (result: SimpleUploadResult) => void;
  onAllComplete?: (summary: DeduplicationSummary) => void;
  generateThumbnails?: boolean;
  folder?: string;
  category?: string;
  description?: string;
}

// ================================
// SIMPLE DATABASE UPLOAD SERVICE
// ================================

export class SimpleDatabaseUploadService {
  
  // ================================
  // UTILITY FUNCTIONS
  // ================================
  
  private getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  }

  private generateS3Key(userId: string, category: string, filename: string): string {
    const uuid = uuidv4();
    const sanitizedFilename = this.sanitizeFilename(filename);
    return `users/${userId}/${category}/${uuid}-${sanitizedFilename}`;
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  }

  // ================================
  // S3 UPLOAD FUNCTIONS
  // ================================
  
  private async uploadToS3(
    file: File, 
    s3Key: string, 
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const uploadParams = {
        Bucket: bucketConfig.name,
        Key: s3Key,
        Body: file,
        ContentType: file.type,
        Metadata: {
          'original-filename': file.name,
          'upload-timestamp': new Date().toISOString(),
        }
      };

      // Simple upload without progress tracking for now
      const result = await s3Client.send(new (await import('@aws-sdk/client-s3')).PutObjectCommand(uploadParams));
      
      const url = `${bucketConfig.endpoint}/${bucketConfig.name}/${s3Key}`;
      
      return {
        success: true,
        url: url
      };
      
    } catch (error: any) {
      console.error('S3 upload error:', error);
      return {
        success: false,
        error: error.message || 'S3 upload failed'
      };
    }
  }

  // ================================
  // DATABASE FUNCTIONS INTEGRATION
  // ================================
  
  private async callSmartFileUpload(
    userId: string,
    filename: string,
    fileSize: number,
    fileType: string,
    fileHash: string,
    s3Key?: string,
    s3Url?: string,
    folderPath: string = '/',
    category: string = 'other',
    description?: string
  ): Promise<SimpleUploadResult> {
    try {
      const { data, error } = await supabase.rpc('smart_file_upload', {
        p_user_id: userId,
        p_original_filename: filename,
        p_file_size: fileSize,
        p_file_type: fileType,
        p_file_hash: fileHash,
        p_s3_key: s3Key,
        p_s3_url: s3Url,
        p_folder_path: folderPath,
        p_category: category,
        p_description: description
      });

      if (error) {
        console.error('Smart file upload error:', error);
        return {
          success: false,
          fileId: '',
          isDuplicate: false,
          spaceSaved: 0,
          message: `Database error: ${error.message}`,
          originalFileId: '',
          error: error.message
        };
      }

      // Parse JSON result from database function
      const result = data;
      return {
        success: result.success,
        fileId: result.file_id,
        isDuplicate: result.is_duplicate,
        spaceSaved: result.space_saved || 0,
        message: result.message,
        originalFileId: result.original_file_id,
      };

    } catch (error: any) {
      console.error('Database call error:', error);
      return {
        success: false,
        fileId: '',
        isDuplicate: false,
        spaceSaved: 0,
        message: `Database call failed: ${error.message}`,
        originalFileId: '',
        error: error.message
      };
    }
  }

  // ================================
  // MAIN UPLOAD FUNCTION
  // ================================
  
  async uploadFiles(
    files: File[],
    userId: string,
    options: SimpleUploadOptions = {}
  ): Promise<{
    success: boolean;
    results: SimpleUploadResult[];
    summary: DeduplicationSummary;
    error?: string;
  }> {
    const results: SimpleUploadResult[] = [];
    let totalSpaceSaved = 0;
    let duplicateCount = 0;
    let totalSize = 0;
    let actualUploaded = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileIndex = i + 1;
        const category = options.category || this.getFileCategory(file.type);
        
        totalSize += file.size;

        // Progress: Hashing
        options.onProgress?.({
          status: 'hashing',
          percent: 0,
          currentFile: file.name,
          fileIndex,
          totalFiles: files.length,
          message: `Menghitung hash untuk ${file.name}...`
        });

        // Compute file hash
        let fileHash: string;
        try {
          fileHash = await computeFileHash(file, 'sha256');
          if (!fileHash) {
            throw new Error('Hash computation returned empty result');
          }
        } catch (error: any) {
          const errorResult: SimpleUploadResult = {
            success: false,
            fileId: '',
            isDuplicate: false,
            spaceSaved: 0,
            message: `Failed to compute hash: ${error.message}`,
            originalFileId: '',
            error: error.message
          };
          results.push(errorResult);
          options.onFileComplete?.(errorResult);
          continue;
        }

        // Progress: Checking duplicates
        options.onProgress?.({
          status: 'checking',
          percent: 25,
          currentFile: file.name,
          fileIndex,
          totalFiles: files.length,
          message: `Memeriksa duplikasi untuk ${file.name}...`
        });

        // Call smart_file_upload to check for duplicates and handle upload
        const uploadResult = await this.callSmartFileUpload(
          userId,
          file.name,
          file.size,
          file.type,
          fileHash,
          undefined, // S3 key will be generated later if needed
          undefined, // S3 URL will be generated later if needed
          options.folder || '/',
          category,
          options.description
        );

        if (!uploadResult.success) {
          results.push(uploadResult);
          options.onFileComplete?.(uploadResult);
          continue;
        }

        if (uploadResult.isDuplicate) {
          // File is duplicate - no S3 upload needed
          totalSpaceSaved += uploadResult.spaceSaved;
          duplicateCount++;

          options.onProgress?.({
            status: 'completed',
            percent: 100,
            currentFile: file.name,
            fileIndex,
            totalFiles: files.length,
            isDuplicate: true,
            spaceSaved: uploadResult.spaceSaved,
            message: `Duplikat terdeteksi - ${this.formatFileSize(uploadResult.spaceSaved)} space saved!`
          });

        } else {
          // New file - need to upload to S3
          const s3Key = this.generateS3Key(userId, category, file.name);
          
          options.onProgress?.({
            status: 'uploading',
            percent: 50,
            currentFile: file.name,
            fileIndex,
            totalFiles: files.length,
            message: `Uploading ${file.name} ke S3...`
          });

          // Upload to S3
          const s3Result = await this.uploadToS3(file, s3Key, (percent) => {
            options.onProgress?.({
              status: 'uploading',
              percent: 50 + (percent * 0.4), // 50% to 90%
              currentFile: file.name,
              fileIndex,
              totalFiles: files.length,
              message: `Uploading ${file.name}... ${percent.toFixed(0)}%`
            });
          });

          if (!s3Result.success) {
            uploadResult.success = false;
            uploadResult.error = s3Result.error;
            uploadResult.message = `S3 upload failed: ${s3Result.error}`;
            results.push(uploadResult);
            options.onFileComplete?.(uploadResult);
            continue;
          }

          // Update database with S3 info
          options.onProgress?.({
            status: 'saving',
            percent: 90,
            currentFile: file.name,
            fileIndex,
            totalFiles: files.length,
            message: `Updating database for ${file.name}...`
          });

          // Update file record with S3 info
          const { error: updateError } = await supabase
            .from('user_files')
            .update({
              s3_key: s3Key,
              s3_url: s3Result.url,
              upload_status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', uploadResult.fileId);

          if (updateError) {
            console.error('Failed to update file record:', updateError);
          }

          actualUploaded += file.size;

          options.onProgress?.({
            status: 'completed',
            percent: 100,
            currentFile: file.name,
            fileIndex,
            totalFiles: files.length,
            message: `${file.name} uploaded successfully!`
          });
        }

        results.push(uploadResult);
        options.onFileComplete?.(uploadResult);
      }

      // Generate summary
      const summary: DeduplicationSummary = {
        totalFiles: files.length,
        uniqueFiles: files.length - duplicateCount,
        referencedFiles: duplicateCount,
        totalSize,
        actualSize: actualUploaded,
        spaceSaved: totalSpaceSaved,
        spaceSavedPercent: totalSize > 0 ? (totalSpaceSaved / totalSize) * 100 : 0
      };

      options.onAllComplete?.(summary);

      return {
        success: true,
        results,
        summary
      };

    } catch (error: any) {
      console.error('Upload process error:', error);
      return {
        success: false,
        results,
        summary: {
          totalFiles: files.length,
          uniqueFiles: 0,
          referencedFiles: 0,
          totalSize,
          actualSize: 0,
          spaceSaved: 0,
          spaceSavedPercent: 0
        },
        error: error.message
      };
    }
  }

  // ================================
  // STATISTICS FUNCTIONS
  // ================================
  
  async getDeduplicationStats(userId?: string): Promise<{
    success: boolean;
    stats?: DeduplicationSummary;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_deduplication_stats', {
        p_user_id: userId || null
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Parse JSON result from database function
      const stats = data;
      return {
        success: true,
        stats: {
          totalFiles: parseInt(stats.total_files),
          uniqueFiles: parseInt(stats.unique_files),
          referencedFiles: parseInt(stats.reference_files),
          totalSize: parseInt(stats.total_size),
          actualSize: parseInt(stats.actual_size),
          spaceSaved: parseInt(stats.space_saved),
          spaceSavedPercent: parseFloat(stats.space_saved_percent)
        }
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Default export
export default SimpleDatabaseUploadService; 