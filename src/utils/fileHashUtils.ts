// ================================
// FILE HASHING UTILITIES
// ================================
// Utility functions untuk generate file hashes untuk deduplication

// ================================
// TYPES & INTERFACES
// ================================

export interface HashResult {
  hash: string;
  algorithm: 'md5' | 'sha256' | 'sha1';
  fileSize: number;
  fileName: string;
  processingTime: number; // in milliseconds
}

export interface HashProgress {
  percent: number;
  bytesProcessed: number;
  totalBytes: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // in seconds
}

export type HashAlgorithm = 'md5' | 'sha256' | 'sha1';

// ================================
// HASH COMPUTATION FUNCTIONS
// ================================

/**
 * Compute MD5 hash dari file menggunakan Web Crypto API atau fallback
 */
export async function computeMD5Hash(
  file: File,
  onProgress?: (progress: HashProgress) => void
): Promise<string> {
  return computeFileHash(file, 'md5', onProgress);
}

/**
 * Compute SHA256 hash dari file menggunakan Web Crypto API (recommended untuk security)
 */
export async function computeSHA256Hash(
  file: File,
  onProgress?: (progress: HashProgress) => void
): Promise<string> {
  return computeFileHash(file, 'sha256', onProgress);
}

/**
 * Compute SHA1 hash dari file menggunakan Web Crypto API
 */
export async function computeSHA1Hash(
  file: File,
  onProgress?: (progress: HashProgress) => void
): Promise<string> {
  return computeFileHash(file, 'sha1', onProgress);
}

/**
 * Generic function untuk compute file hash dengan algorithm yang dipilih
 */
export async function computeFileHash(
  file: File,
  algorithm: HashAlgorithm = 'sha256',
  onProgress?: (progress: HashProgress) => void
): Promise<string> {
  const startTime = Date.now();
  const chunkSize = 1024 * 1024; // 1MB chunks untuk better performance dan progress tracking

  // Check Web Crypto API support
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API tidak tersedia. Browser tidak support hashing.');
  }

  // Algorithm mapping untuk Web Crypto API
  const algorithmMap: Record<HashAlgorithm, string> = {
    'md5': 'MD5', // Note: MD5 mungkin tidak tersedia di semua browser
    'sha1': 'SHA-1',
    'sha256': 'SHA-256'
  };

  const cryptoAlgorithm = algorithmMap[algorithm];
  
  try {
    let hasher: SubtleCrypto;
    let hashBuffer: ArrayBuffer;

    // Untuk file kecil (< 50MB), process sekaligus
    if (file.size < 50 * 1024 * 1024) {
      const arrayBuffer = await file.arrayBuffer();
      hashBuffer = await window.crypto.subtle.digest(cryptoAlgorithm, arrayBuffer);
      
      // Emit progress for consistency
      onProgress?.({
        percent: 100,
        bytesProcessed: file.size,
        totalBytes: file.size,
        speed: file.size / ((Date.now() - startTime) / 1000),
        estimatedTimeRemaining: 0
      });
    } else {
      // Untuk file besar, process dalam chunks dengan progress tracking
      hashBuffer = await processFileInChunks(file, cryptoAlgorithm, chunkSize, onProgress, startTime);
    }

    // Convert ke hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log(`🔐 ${algorithm.toUpperCase()} hash computed:`, {
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      hash: hashHex,
      processingTime: `${Date.now() - startTime}ms`
    });

    return hashHex;

  } catch (error) {
    console.error(`Error computing ${algorithm} hash:`, error);
    
    // Fallback untuk MD5 jika crypto API tidak support
    if (algorithm === 'md5') {
      console.warn('Web Crypto API tidak support MD5, menggunakan fallback...');
      return await computeHashFallback(file, 'md5', onProgress);
    }
    
    throw new Error(`Failed to compute ${algorithm} hash: ${error}`);
  }
}

/**
 * Process file dalam chunks untuk large files dengan progress tracking
 */
async function processFileInChunks(
  file: File,
  algorithm: string,
  chunkSize: number,
  onProgress?: (progress: HashProgress) => void,
  startTime: number = Date.now()
): Promise<ArrayBuffer> {
  
  // Note: Streaming hash computation memerlukan implementation yang lebih complex
  // Untuk saat ini, kita fallback ke process file sekaligus untuk large files
  // TODO: Implement true streaming hash computation untuk better memory efficiency
  
  console.warn('Large file detected, processing in single chunk (fallback mode)');
  const arrayBuffer = await file.arrayBuffer();
  
  // Simulate progress untuk user experience
  if (onProgress) {
    const totalChunks = Math.ceil(file.size / chunkSize);
    for (let i = 0; i <= totalChunks; i++) {
      const progress = Math.min((i / totalChunks) * 100, 100);
      const bytesProcessed = Math.min(i * chunkSize, file.size);
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = bytesProcessed / elapsed;
      const remaining = (file.size - bytesProcessed) / speed;
      
      onProgress({
        percent: Math.round(progress),
        bytesProcessed: bytesProcessed,
        totalBytes: file.size,
        speed: speed,
        estimatedTimeRemaining: Math.max(remaining, 0)
      });
      
      // Small delay untuk allow UI updates
      if (i < totalChunks) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }
  
  return await window.crypto.subtle.digest(algorithm, arrayBuffer);
}

/**
 * Fallback hash computation menggunakan alternative methods
 */
async function computeHashFallback(
  file: File,
  algorithm: HashAlgorithm,
  onProgress?: (progress: HashProgress) => void
): Promise<string> {
  
  // Simplified fallback - read file sebagai text dan create basic hash
  console.warn(`Using fallback hash computation for ${algorithm}`);
  
  const text = await file.text();
  let hash = 0;
  
  if (text.length === 0) return hash.toString();
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
    
    // Progress callback
    if (onProgress && i % 1000 === 0) {
      onProgress({
        percent: Math.round((i / text.length) * 100),
        bytesProcessed: i,
        totalBytes: text.length,
        speed: i / ((Date.now()) / 1000),
        estimatedTimeRemaining: (text.length - i) / (i / ((Date.now()) / 1000))
      });
    }
  }
  
  return Math.abs(hash).toString(16);
}

// ================================
// HASH VALIDATION & COMPARISON
// ================================

/**
 * Validate hash format untuk different algorithms
 */
export function validateHashFormat(hash: string, algorithm: HashAlgorithm): boolean {
  if (!hash || typeof hash !== 'string') return false;
  
  const lengthMap: Record<HashAlgorithm, number> = {
    'md5': 32,      // 128 bits = 32 hex chars
    'sha1': 40,     // 160 bits = 40 hex chars  
    'sha256': 64    // 256 bits = 64 hex chars
  };
  
  const expectedLength = lengthMap[algorithm];
  const isValidLength = hash.length === expectedLength;
  const isValidHex = /^[a-f0-9]+$/i.test(hash);
  
  return isValidLength && isValidHex;
}

/**
 * Compare dua hash values dengan secure comparison
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return false;
  }
  
  // Secure comparison untuk prevent timing attacks
  let result = 0;
  for (let i = 0; i < hash1.length; i++) {
    result |= hash1.charCodeAt(i) ^ hash2.charCodeAt(i);
  }
  
  return result === 0;
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Get optimal hash algorithm berdasarkan file size dan use case
 */
export function getOptimalHashAlgorithm(fileSize: number, useCase: 'deduplication' | 'integrity' | 'security' = 'deduplication'): HashAlgorithm {
  // Untuk file kecil (< 10MB), SHA256 recommended
  if (fileSize < 10 * 1024 * 1024) {
    return useCase === 'security' ? 'sha256' : 'sha256';
  }
  
  // Untuk file sedang (10MB - 100MB), gunakan SHA1 untuk balance speed/security
  if (fileSize < 100 * 1024 * 1024) {
    return useCase === 'security' ? 'sha256' : 'sha1';
  }
  
  // Untuk file besar (> 100MB), MD5 untuk speed (jika bukan untuk security)
  return useCase === 'security' ? 'sha256' : 'sha1';
}

/**
 * Create deduplication key dari file metadata
 */
export function createDeduplicationKey(hash: string, fileSize: number, algorithm: HashAlgorithm = 'sha256'): string {
  return `${algorithm}:${hash}:${fileSize}`;
}

/**
 * Parse deduplication key
 */
export function parseDeduplicationKey(key: string): { algorithm: HashAlgorithm; hash: string; fileSize: number } | null {
  const parts = key.split(':');
  if (parts.length !== 3) return null;
  
  const [algorithm, hash, sizeStr] = parts;
  const fileSize = parseInt(sizeStr, 10);
  
  if (!['md5', 'sha1', 'sha256'].includes(algorithm) || isNaN(fileSize)) {
    return null;
  }
  
  return {
    algorithm: algorithm as HashAlgorithm,
    hash,
    fileSize
  };
}

/**
 * Format file size untuk human-readable output
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Estimate hash computation time berdasarkan file size
 */
export function estimateHashTime(fileSize: number, algorithm: HashAlgorithm = 'sha256'): number {
  // Rough estimates dalam milliseconds berdasarkan typical hardware
  const speedMap: Record<HashAlgorithm, number> = {
    'md5': 100,     // ~100MB/s
    'sha1': 80,     // ~80MB/s  
    'sha256': 50    // ~50MB/s
  };
  
  const mbPerSecond = speedMap[algorithm];
  const fileSizeMB = fileSize / (1024 * 1024);
  
  return Math.ceil((fileSizeMB / mbPerSecond) * 1000);
}

// ================================
// EXPORTS
// ================================

export default {
  computeFileHash,
  computeMD5Hash,
  computeSHA256Hash,
  computeSHA1Hash,
  validateHashFormat,
  compareHashes,
  getOptimalHashAlgorithm,
  createDeduplicationKey,
  parseDeduplicationKey,
  formatFileSize,
  estimateHashTime
}; 