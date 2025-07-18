import { userFileService, UserFile, FileUploadOptions } from './userFileManagementService';
import { s3Client, bucketConfig } from '@/config/s3';
import { env } from '@/config/env';
import { supabase } from '@/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { 
  computeFileHash, 
  getOptimalHashAlgorithm, 
  validateHashFormat,
  createDeduplicationKey,
  formatFileSize,
  estimateHashTime,
  type HashAlgorithm,
  type HashProgress 
} from '@/utils/fileHashUtils';

// ================================
// TYPES & INTERFACES
// ================================

export interface UploadProgress {
  status: 'preparing' | 'hashing' | 'checking_duplicates' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  currentFile?: string;
  fileIndex?: number;
  totalFiles?: number;
  error?: string;
  eta?: number; // Estimated time remaining in seconds
  speed?: number; // Upload speed in bytes/second
  hashProgress?: HashProgress; // Progress for hash computation
  duplicateDetected?: boolean; // If file is duplicate
  isDuplicate?: boolean; // If file was found to be duplicate
}

export interface UploadSession {
  id: string;
  user_id: string;
  session_token: string;
  total_files: number;
  completed_files: number;
  failed_files: number;
  total_size: number;
  uploaded_size: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  upload_metadata: Record<string, any>;
  client_info: Record<string, any>;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface DuplicateFileInfo {
  file_id: string;
  user_id: string;
  original_filename: string;
  s3_key: string;
  s3_url: string;
  created_at: string;
  reference_count: number;
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  hash: string;
  algorithm: HashAlgorithm;
  duplicateFile?: DuplicateFileInfo;
  referenceFileId?: string; // ID of the new reference file created
}

export interface EnhancedUploadOptions extends FileUploadOptions {
  // Progress tracking
  onProgress?: (progress: UploadProgress) => void;
  onFileComplete?: (file: UserFile, index: number) => void;
  onAllComplete?: (files: UserFile[]) => void;
  onError?: (error: string, fileIndex?: number) => void;
  onDuplicateDetected?: (file: File, duplicateInfo: DuplicateFileInfo) => void;
  
  // Upload behavior
  usePresignedUrl?: boolean; // Default: true for better performance
  chunkSize?: number; // For large file uploads (future feature)
  maxRetries?: number; // Default: 3
  timeout?: number; // Upload timeout in milliseconds
  
  // Deduplication settings
  enableDeduplication?: boolean; // Default: true for storage efficiency
  hashAlgorithm?: HashAlgorithm; // Default: auto-select based on file size
  skipDuplicateUpload?: boolean; // Default: true - create reference instead of upload
  
  // File processing
  generateThumbnails?: boolean; // Auto-generate thumbnails for images/videos
  extractMetadata?: boolean; // Extract detailed file metadata
  virusScan?: boolean; // Enable virus scanning (future feature)
  
  // Chat integration
  chatContext?: {
    sessionId: string;
    agentType: string;
    messageId?: string;
  };
}

export interface PresignedUploadData {
  uploadUrl: string;
  s3Key: string;
  fileId: string;
  fields?: Record<string, string>; // For multipart uploads
}

// ================================
// ENHANCED UPLOAD SERVICE CLASS
// ================================

export class EnhancedUploadService {
  private activeUploads: Map<string, AbortController> = new Map();
  private uploadSessions: Map<string, UploadSession> = new Map();
  private progressCallbacks: Map<string, (progress: UploadProgress) => void> = new Map();

  // ================================
  // SESSION MANAGEMENT
  // ================================

  /**
   * Create upload session untuk tracking progress
   */
  private async createUploadSession(
    userId: string,
    files: File[],
    options: EnhancedUploadOptions = {}
  ): Promise<{ success: boolean; session?: UploadSession; error?: string }> {
    try {
      const sessionToken = uuidv4();
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      const clientInfo = {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        fileCount: files.length,
        totalSize: totalSize,
        chatContext: options.chatContext
      };

      const { data: session, error } = await supabase
        .from('upload_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          total_files: files.length,
          total_size: totalSize,
          status: 'pending',
          max_retries: options.maxRetries || 3,
          upload_metadata: {
            options: options,
            fileDetails: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
          },
          client_info: clientInfo
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create upload session:', error);
        return { success: false, error: 'Failed to create upload session' };
      }

      this.uploadSessions.set(sessionToken, session);
      console.log('📋 Upload session created:', { 
        sessionToken, 
        files: files.length, 
        totalSize: this.formatBytes(totalSize)
      });

      return { success: true, session };

    } catch (error) {
      console.error('Create upload session error:', error);
      return { success: false, error: 'Failed to create session' };
    }
  }

  /**
   * Update upload session progress
   */
  private async updateUploadSession(
    sessionToken: string,
    updates: Partial<UploadSession>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('upload_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('session_token', sessionToken);

      if (error) {
        console.error('Failed to update upload session:', error);
      } else {
        // Update local session cache
        const localSession = this.uploadSessions.get(sessionToken);
        if (localSession) {
          Object.assign(localSession, updates);
        }
      }

    } catch (error) {
      console.error('Update session error:', error);
    }
  }

  // ================================
  // PRESIGNED URL OPERATIONS
  // ================================

  /**
   * Generate presigned URLs untuk multiple files
   */
  private async generatePresignedUrls(
    files: File[],
    userId: string,
    options: EnhancedUploadOptions = {}
  ): Promise<{ success: boolean; uploads?: PresignedUploadData[]; error?: string }> {
    try {
      const uploads: PresignedUploadData[] = [];

      for (const file of files) {
        const category = options.category || this.getFileCategory(file.type);
        
        // Generate presigned URL
        const result = await userFileService.generatePresignedUploadUrl(
          file.name,
          file.type,
          userId,
          category
        );

        if (!result.success || !result.uploadUrl || !result.s3Key) {
          return { success: false, error: `Failed to generate upload URL for ${file.name}` };
        }

        // Create file record in database (dengan status uploading)
        const { data: fileRecord, error: dbError } = await supabase
          .from('user_files')
          .insert({
            user_id: userId,
            original_filename: file.name,
            stored_filename: `${uuidv4()}-${this.sanitizeFilename(file.name)}`,
            file_path: `users/${userId}/${category}/${file.name}`,
            file_size: file.size,
            file_type: file.type,
            file_extension: file.name.split('.').pop() || '',
            s3_bucket: bucketConfig.name,
            s3_key: result.s3Key,
            s3_url: `${env.s3Endpoint}/${bucketConfig.name}/${result.s3Key}`,
            category: category,
            folder_path: options.folder_path || '/',
            tags: options.tags || [],
            description: options.description,
            upload_status: 'uploading',
            processing_status: 'pending',
            is_public: options.is_public || false,
            access_level: options.access_level || 'private',
            password_protected: !!options.password,
            metadata: {
              original_name: file.name,
              mime_type: file.type,
              size_formatted: this.formatBytes(file.size),
              upload_timestamp: new Date().toISOString(),
              presigned_upload: true
            }
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error creating file record:', dbError);
          return { success: false, error: `Failed to create record for ${file.name}` };
        }

        uploads.push({
          uploadUrl: result.uploadUrl,
          s3Key: result.s3Key,
          fileId: fileRecord.id
        });
      }

      console.log('🔗 Generated presigned URLs:', { count: uploads.length });
      return { success: true, uploads };

    } catch (error) {
      console.error('Generate presigned URLs error:', error);
      return { success: false, error: 'Failed to generate upload URLs' };
    }
  }

  // ================================
  // DIRECT S3 UPLOAD WITH PROGRESS
  // ================================

  /**
   * Upload file directly ke S3 menggunakan presigned URL dengan progress tracking
   */
  private async uploadFileToS3(
    file: File,
    uploadData: PresignedUploadData,
    sessionToken: string,
    fileIndex: number,
    totalFiles: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const startTime = Date.now();
      let lastProgressTime = startTime;
      let lastUploadedBytes = 0;

      // Create abort controller untuk cancellation
      const abortController = new AbortController();
      this.activeUploads.set(`${sessionToken}-${fileIndex}`, abortController);

      // Create XMLHttpRequest untuk detailed progress tracking
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        const xhr = new XMLHttpRequest();

        // Progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const now = Date.now();
            const timeDiff = (now - lastProgressTime) / 1000; // seconds
            const bytesDiff = event.loaded - lastUploadedBytes;
            const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
            const eta = speed > 0 ? (event.total - event.loaded) / speed : 0;

            const progress: UploadProgress = {
              status: 'uploading',
              percent: Math.round((event.loaded / event.total) * 100),
              uploadedBytes: event.loaded,
              totalBytes: event.total,
              currentFile: file.name,
              fileIndex: fileIndex,
              totalFiles: totalFiles,
              speed: speed,
              eta: eta
            };

            // Update session progress
            this.updateUploadSession(sessionToken, {
              uploaded_size: event.loaded,
              progress_percentage: progress.percent
            });

            onProgress?.(progress);

            lastProgressTime = now;
            lastUploadedBytes = event.loaded;
          }
        });

        // Success handler
        xhr.addEventListener('load', async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Update file status ke completed
            await supabase
              .from('user_files')
              .update({
                upload_status: 'completed',
                processing_status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', uploadData.fileId);

            // Update storage usage
            await supabase.rpc('update_storage_usage', {
              p_user_id: await this.getCurrentUserId(),
              p_file_size: file.size,
              p_operation: 'add'
            });

            console.log('✅ File uploaded successfully:', { 
              filename: file.name, 
              fileId: uploadData.fileId,
              duration: `${(Date.now() - startTime) / 1000}s`
            });

            resolve({ success: true });
          } else {
            console.error('S3 upload failed:', { status: xhr.status, response: xhr.responseText });
            
            // Update file status ke failed
            await supabase
              .from('user_files')
              .update({
                upload_status: 'failed',
                processing_status: 'failed'
              })
              .eq('id', uploadData.fileId);

            resolve({ success: false, error: `Upload failed: ${xhr.status}` });
          }

          // Cleanup
          this.activeUploads.delete(`${sessionToken}-${fileIndex}`);
        });

        // Error handler
        xhr.addEventListener('error', async () => {
          console.error('S3 upload error for file:', file.name);
          
          await supabase
            .from('user_files')
            .update({
              upload_status: 'failed',
              processing_status: 'failed'
            })
            .eq('id', uploadData.fileId);

          resolve({ success: false, error: 'Network error during upload' });
          this.activeUploads.delete(`${sessionToken}-${fileIndex}`);
        });

        // Abort handler
        xhr.addEventListener('abort', async () => {
          console.log('Upload cancelled for file:', file.name);
          
          await supabase
            .from('user_files')
            .update({
              upload_status: 'failed',
              processing_status: 'failed'
            })
            .eq('id', uploadData.fileId);

          resolve({ success: false, error: 'Upload cancelled' });
          this.activeUploads.delete(`${sessionToken}-${fileIndex}`);
        });

        // Setup abort signal
        abortController.signal.addEventListener('abort', () => {
          xhr.abort();
        });

        // Start upload
        xhr.open('PUT', uploadData.uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

    } catch (error) {
      console.error('Upload file to S3 error:', error);
      return { success: false, error: 'Upload failed' };
    }
  }

  // ================================
  // DEDUPLICATION OPERATIONS
  // ================================

  /**
   * Compute file hash untuk deduplication check
   */
  private async computeFileHashWithProgress(
    file: File,
    algorithm?: HashAlgorithm,
    fileIndex: number = 0,
    totalFiles: number = 1,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; hash?: string; algorithm?: HashAlgorithm; error?: string }> {
    try {
      const selectedAlgorithm = algorithm || getOptimalHashAlgorithm(file.size, 'deduplication');
      const estimatedTime = estimateHashTime(file.size, selectedAlgorithm);
      
      console.log(`🔐 Computing ${selectedAlgorithm.toUpperCase()} hash for file:`, {
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        estimatedTime: `${estimatedTime}ms`,
        fileIndex: fileIndex + 1,
        totalFiles
      });

      // Emit initial hash progress
      onProgress?.({
        status: 'hashing',
        percent: 0,
        uploadedBytes: 0,
        totalBytes: file.size,
        currentFile: file.name,
        fileIndex: fileIndex,
        totalFiles: totalFiles,
        hashProgress: {
          percent: 0,
          bytesProcessed: 0,
          totalBytes: file.size,
          speed: 0,
          estimatedTimeRemaining: estimatedTime / 1000
        }
      });

      const hash = await computeFileHash(file, selectedAlgorithm, (hashProgress) => {
        // Update progress dengan hash computation details
        onProgress?.({
          status: 'hashing',
          percent: Math.round((hashProgress.percent * 0.3)), // Hash is 30% of total process
          uploadedBytes: 0,
          totalBytes: file.size,
          currentFile: file.name,
          fileIndex: fileIndex,
          totalFiles: totalFiles,
          hashProgress: hashProgress
        });
      });

      console.log(`✅ Hash computed successfully:`, {
        fileName: file.name,
        algorithm: selectedAlgorithm,
        hash: hash,
        hashLength: hash.length
      });

      return { success: true, hash, algorithm: selectedAlgorithm };

    } catch (error) {
      console.error('Error computing file hash:', error);
      return { success: false, error: `Hash computation failed: ${error}` };
    }
  }

  /**
   * Check if file is duplicate dan return duplicate info
   */
  private async checkForDuplicate(
    hash: string,
    fileSize: number,
    userId: string,
    fileIndex: number = 0,
    totalFiles: number = 1,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; isDuplicate?: boolean; duplicateFile?: DuplicateFileInfo; error?: string }> {
    try {
      // Emit duplicate check progress
      onProgress?.({
        status: 'checking_duplicates',
        percent: Math.round(30 + (fileIndex / totalFiles) * 10), // 30-40% range
        uploadedBytes: 0,
        totalBytes: fileSize,
        fileIndex: fileIndex,
        totalFiles: totalFiles
      });

      // Query database untuk find duplicate
      const { data: duplicates, error } = await supabase.rpc('find_duplicate_file', {
        p_file_hash: hash,
        p_file_size: fileSize,
        p_exclude_user_id: userId
      });

      if (error) {
        console.error('Error checking for duplicates:', error);
        return { success: false, error: 'Failed to check for duplicates' };
      }

      if (duplicates && duplicates.length > 0) {
        const duplicateFile = duplicates[0] as DuplicateFileInfo;
        console.log('🔄 Duplicate file detected:', {
          originalFile: duplicateFile.original_filename,
          originalOwner: duplicateFile.user_id,
          s3Key: duplicateFile.s3_key,
          referenceCount: duplicateFile.reference_count
        });

        return { 
          success: true, 
          isDuplicate: true, 
          duplicateFile: duplicateFile 
        };
      }

      console.log('✨ No duplicate found, file is unique');
      return { success: true, isDuplicate: false };

    } catch (error) {
      console.error('Error in duplicate check:', error);
      return { success: false, error: `Duplicate check failed: ${error}` };
    }
  }

  /**
   * Create file reference untuk duplicate file
   */
  private async createFileReference(
    originalFileId: string,
    userId: string,
    newFilename: string,
    options: EnhancedUploadOptions = {},
    fileIndex: number = 0,
    totalFiles: number = 1,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      console.log('📎 Creating file reference:', {
        originalFileId,
        newFilename,
        userId,
        folderPath: options.folder_path || '/',
        tags: options.tags || []
      });

      // Emit reference creation progress
      onProgress?.({
        status: 'processing',
        percent: Math.round(40 + (fileIndex / totalFiles) * 50), // 40-90% range
        uploadedBytes: 0,
        totalBytes: 0,
        currentFile: newFilename,
        fileIndex: fileIndex,
        totalFiles: totalFiles,
        isDuplicate: true
      });

      // Call database function to create reference
      const { data: referenceFileId, error } = await supabase.rpc('create_file_reference', {
        p_original_file_id: originalFileId,
        p_new_user_id: userId,
        p_new_filename: newFilename,
        p_folder_path: options.folder_path || '/',
        p_tags: options.tags || [],
        p_description: options.description || `Reference to duplicate file - ${new Date().toISOString()}`
      });

      if (error) {
        console.error('Error creating file reference:', error);
        return { success: false, error: 'Failed to create file reference' };
      }

      console.log('✅ File reference created successfully:', {
        referenceFileId: referenceFileId,
        originalFileId: originalFileId
      });

      // Emit completion progress
      onProgress?.({
        status: 'completed',
        percent: Math.round(90 + (fileIndex / totalFiles) * 10), // 90-100%
        uploadedBytes: 0,
        totalBytes: 0,
        currentFile: newFilename,
        fileIndex: fileIndex,
        totalFiles: totalFiles,
        isDuplicate: true
      });

      return { success: true, fileId: referenceFileId };

    } catch (error) {
      console.error('Error creating file reference:', error);
      return { success: false, error: `Reference creation failed: ${error}` };
    }
  }

  /**
   * Process file dengan deduplication check
   */
  private async processFileWithDeduplication(
    file: File,
    userId: string,
    options: EnhancedUploadOptions = {},
    fileIndex: number = 0,
    totalFiles: number = 1
  ): Promise<{ success: boolean; result?: DeduplicationResult; error?: string }> {
    try {
      const enableDeduplication = options.enableDeduplication !== false; // Default: true
      
      if (!enableDeduplication) {
        return { 
          success: true, 
          result: { 
            isDuplicate: false, 
            hash: '', 
            algorithm: 'sha256' as HashAlgorithm 
          } 
        };
      }

      // Step 1: Compute file hash
      const hashResult = await this.computeFileHashWithProgress(
        file, 
        options.hashAlgorithm, 
        fileIndex, 
        totalFiles, 
        options.onProgress
      );

      if (!hashResult.success || !hashResult.hash || !hashResult.algorithm) {
        return { success: false, error: hashResult.error || 'Hash computation failed' };
      }

      // Step 2: Check for duplicates
      const duplicateCheck = await this.checkForDuplicate(
        hashResult.hash,
        file.size,
        userId,
        fileIndex,
        totalFiles,
        options.onProgress
      );

      if (!duplicateCheck.success) {
        return { success: false, error: duplicateCheck.error || 'Duplicate check failed' };
      }

      const result: DeduplicationResult = {
        isDuplicate: duplicateCheck.isDuplicate || false,
        hash: hashResult.hash,
        algorithm: hashResult.algorithm,
        duplicateFile: duplicateCheck.duplicateFile
      };

      // Step 3: Handle duplicate if found
      if (result.isDuplicate && result.duplicateFile && options.skipDuplicateUpload !== false) {
        // Notify about duplicate detection
        options.onDuplicateDetected?.(file, result.duplicateFile);

        // Create file reference instead of uploading
        const referenceResult = await this.createFileReference(
          result.duplicateFile.file_id,
          userId,
          file.name,
          options,
          fileIndex,
          totalFiles,
          options.onProgress
        );

        if (!referenceResult.success) {
          return { success: false, error: referenceResult.error || 'Reference creation failed' };
        }

        result.referenceFileId = referenceResult.fileId;
        
        console.log('🎯 Deduplication completed - file reference created:', {
          originalFile: result.duplicateFile.original_filename,
          newFilename: file.name,
          referenceFileId: result.referenceFileId,
          storageSpaceSaved: formatFileSize(file.size)
        });
      }

      return { success: true, result };

    } catch (error) {
      console.error('Error in deduplication process:', error);
      return { success: false, error: `Deduplication failed: ${error}` };
    }
  }

  // ================================
  // MAIN UPLOAD METHODS
  // ================================

  /**
   * Enhanced file upload dengan progress tracking dan presigned URLs
   */
  async uploadFiles(
    files: File[],
    userId: string,
    options: EnhancedUploadOptions = {}
  ): Promise<{ 
    success: boolean; 
    files?: UserFile[]; 
    session?: UploadSession; 
    failedFiles?: string[];
    error?: string 
  }> {
    try {
      console.log('🚀 Starting enhanced upload:', { 
        fileCount: files.length,
        totalSize: this.formatBytes(files.reduce((sum, f) => sum + f.size, 0)),
        usePresignedUrl: options.usePresignedUrl !== false
      });

      // Create upload session
      const sessionResult = await this.createUploadSession(userId, files, options);
      if (!sessionResult.success || !sessionResult.session) {
        return { success: false, error: sessionResult.error };
      }

      const session = sessionResult.session;
      const sessionToken = session.session_token;

      // Setup progress callback
      if (options.onProgress) {
        this.progressCallbacks.set(sessionToken, options.onProgress);
      }

      // Update session status to uploading
      await this.updateUploadSession(sessionToken, {
        status: 'uploading',
        started_at: new Date().toISOString()
      });

      // Initial progress
      options.onProgress?.({
        status: 'preparing',
        percent: 0,
        uploadedBytes: 0,
        totalBytes: files.reduce((sum, f) => sum + f.size, 0),
        totalFiles: files.length
      });

      let uploadedFiles: UserFile[] = [];
      let failedFiles: string[] = [];

      if (options.usePresignedUrl !== false) {
        // Use presigned URL approach (recommended)
        const presignedResult = await this.generatePresignedUrls(files, userId, options);
        if (!presignedResult.success || !presignedResult.uploads) {
          return { success: false, error: presignedResult.error };
        }

        const uploads = presignedResult.uploads;

        // Process each file with deduplication check
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          try {
            // Step 1: Check for deduplication
            const dedupResult = await this.processFileWithDeduplication(
              file,
              userId,
              options,
              i,
              files.length
            );

            if (!dedupResult.success) {
              console.error(`Deduplication failed for ${file.name}:`, dedupResult.error);
              failedFiles.push(file.name);
              continue;
            }

            const { result: dedupInfo } = dedupResult;
            let fileRecord: UserFile;

            if (dedupInfo?.isDuplicate && dedupInfo.referenceFileId) {
              // File is duplicate - get reference file record
              console.log(`📎 File ${file.name} is duplicate, using reference: ${dedupInfo.referenceFileId}`);
              
              const { data: refFileRecord } = await supabase
                .from('user_files')
                .select('*')
                .eq('id', dedupInfo.referenceFileId)
                .single();

              if (refFileRecord) {
                fileRecord = refFileRecord;
              } else {
                console.error(`Failed to get reference file record for ${file.name}`);
                failedFiles.push(file.name);
                continue;
              }
            } else {
              // File is unique - proceed with upload
              console.log(`✨ File ${file.name} is unique, proceeding with S3 upload`);
              
              const uploadData = uploads[i];
              
              // Add hash to file metadata before upload
              if (dedupInfo?.hash) {
                await supabase
                  .from('user_files')
                  .update({
                    file_hash: dedupInfo.hash,
                    metadata: {
                      ...uploadData.fields,
                      hash_algorithm: dedupInfo.algorithm,
                      deduplication_checked: true,
                      computed_at: new Date().toISOString()
                    }
                  })
                  .eq('id', uploadData.fileId);
              }

              const uploadResult = await this.uploadFileToS3(
                file,
                uploadData,
                sessionToken,
                i,
                files.length,
                options.onProgress
              );

              if (uploadResult.success) {
                // Get updated file record
                const { data: updatedFileRecord } = await supabase
                  .from('user_files')
                  .select('*')
                  .eq('id', uploadData.fileId)
                  .single();

                if (updatedFileRecord) {
                  fileRecord = updatedFileRecord;
                } else {
                  console.error(`Failed to get updated file record for ${file.name}`);
                  failedFiles.push(file.name);
                  continue;
                }
              } else {
                console.error(`Upload failed for ${file.name}:`, uploadResult.error);
                failedFiles.push(file.name);
                await this.updateUploadSession(sessionToken, {
                  failed_files: session.failed_files + 1
                });
                continue;
              }
            }

            // File processed successfully (either as duplicate reference or unique upload)
            if (fileRecord) {
              uploadedFiles.push(fileRecord);
              options.onFileComplete?.(fileRecord, i);

              // Update session
              await this.updateUploadSession(sessionToken, {
                completed_files: i + 1,
                progress_percentage: Math.round(((i + 1) / files.length) * 100)
              });
            }

          } catch (error) {
            console.error(`Upload failed for file ${file.name}:`, error);
            failedFiles.push(file.name);
          }
        }

      } else {
        // Fallback to direct upload through service
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          options.onProgress?.({
            status: 'uploading',
            percent: Math.round((i / files.length) * 100),
            uploadedBytes: 0,
            totalBytes: file.size,
            currentFile: file.name,
            fileIndex: i,
            totalFiles: files.length
          });

          const uploadResult = await userFileService.uploadFile(file, userId, options);
          
          if (uploadResult.success && uploadResult.file) {
            uploadedFiles.push(uploadResult.file);
            options.onFileComplete?.(uploadResult.file, i);
          } else {
            failedFiles.push(file.name);
          }
        }
      }

      // Final session update
      const finalStatus = failedFiles.length === files.length ? 'failed' : 
                          failedFiles.length > 0 ? 'completed' : 'completed';

      await this.updateUploadSession(sessionToken, {
        status: finalStatus,
        completed_at: new Date().toISOString(),
        progress_percentage: 100
      });

      // Final progress callback
      options.onProgress?.({
        status: uploadedFiles.length > 0 ? 'completed' : 'failed',
        percent: 100,
        uploadedBytes: files.reduce((sum, f) => sum + f.size, 0),
        totalBytes: files.reduce((sum, f) => sum + f.size, 0),
        totalFiles: files.length
      });

      // Completion callback
      if (uploadedFiles.length > 0) {
        options.onAllComplete?.(uploadedFiles);
      }

      // Error callback untuk failed files
      if (failedFiles.length > 0) {
        options.onError?.(`Failed to upload ${failedFiles.length} files: ${failedFiles.join(', ')}`);
      }

      console.log('📁 Upload completed:', { 
        successful: uploadedFiles.length,
        failed: failedFiles.length,
        sessionToken
      });

      return {
        success: uploadedFiles.length > 0,
        files: uploadedFiles,
        session: session,
        failedFiles: failedFiles.length > 0 ? failedFiles : undefined,
        error: failedFiles.length === files.length ? 'All uploads failed' : undefined
      };

    } catch (error) {
      console.error('Enhanced upload error:', error);
      options.onError?.('Upload failed due to system error');
      return { success: false, error: 'Upload failed' };
    }
  }

  /**
   * Upload single file dengan enhanced features
   */
  async uploadSingleFile(
    file: File,
    userId: string,
    options: EnhancedUploadOptions = {}
  ): Promise<{ success: boolean; file?: UserFile; error?: string }> {
    const result = await this.uploadFiles([file], userId, options);
    
    return {
      success: result.success,
      file: result.files?.[0],
      error: result.error
    };
  }

  // ================================
  // UPLOAD CONTROL METHODS
  // ================================

  /**
   * Cancel ongoing upload
   */
  async cancelUpload(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Abort all active uploads for this session
      for (const [key, controller] of this.activeUploads.entries()) {
        if (key.startsWith(sessionToken)) {
          controller.abort();
          this.activeUploads.delete(key);
        }
      }

      // Update session status
      await this.updateUploadSession(sessionToken, {
        status: 'cancelled'
      });

      // Cleanup
      this.progressCallbacks.delete(sessionToken);
      this.uploadSessions.delete(sessionToken);

      console.log('❌ Upload cancelled:', sessionToken);
      return { success: true };

    } catch (error) {
      console.error('Cancel upload error:', error);
      return { success: false, error: 'Failed to cancel upload' };
    }
  }

  /**
   * Get upload session status
   */
  async getUploadSession(sessionToken: string): Promise<{ success: boolean; session?: UploadSession; error?: string }> {
    try {
      // Check local cache first
      const localSession = this.uploadSessions.get(sessionToken);
      if (localSession) {
        return { success: true, session: localSession };
      }

      // Query database
      const { data: session, error } = await supabase
        .from('upload_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();

      if (error) {
        return { success: false, error: 'Session not found' };
      }

      return { success: true, session };

    } catch (error) {
      console.error('Get upload session error:', error);
      return { success: false, error: 'Failed to get session' };
    }
  }

  // ================================
  // CHAT INTEGRATION METHODS
  // ================================

  /**
   * Upload files dalam context chat session
   */
  async uploadForChat(
    files: File[],
    userId: string,
    chatContext: {
      sessionId: string;
      agentType: string;
      messageId?: string;
    },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; files?: UserFile[]; error?: string }> {
    const options: EnhancedUploadOptions = {
      chatContext,
      onProgress,
      category: 'document', // Default untuk chat uploads
      tags: ['chat-upload', chatContext.agentType],
      description: `Uploaded via ${chatContext.agentType} chat`,
      generateThumbnails: true,
      extractMetadata: true
    };

    const result = await this.uploadFiles(files, userId, options);
    
    if (result.success && result.files) {
      // Log chat upload untuk analytics
      console.log('💬 Chat upload completed:', {
        chatContext,
        fileCount: result.files.length,
        totalSize: this.formatBytes(result.files.reduce((sum, f) => sum + f.file_size, 0))
      });
    }

    return {
      success: result.success,
      files: result.files,
      error: result.error
    };
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private getFileCategory(mimeType: string): 'document' | 'image' | 'video' | 'audio' | 'other' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || '';
  }

  /**
   * Cleanup expired sessions and old upload records
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up local caches
      this.activeUploads.clear();
      this.progressCallbacks.clear();
      this.uploadSessions.clear();

      console.log('🧹 Enhanced upload service cleaned up');

    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// ================================
// EXPORT SINGLETON INSTANCE
// ================================

export const enhancedUploadService = new EnhancedUploadService();
export default enhancedUploadService; 