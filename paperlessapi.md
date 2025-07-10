# Integrasi Paperless NGX untuk Pencarian Dokumen Hukum

## Overview
Aplikasi ini mengintegrasikan Paperless NGX sebagai backend untuk pencarian dokumen hukum. Paperless NGX adalah sistem manajemen dokumen yang powerful dengan REST API lengkap dan fitur pencarian full-text.

## Fitur yang Digunakan

### 1. Pencarian Dokumen
- **Full-text search**: Menggunakan endpoint `/api/documents/?query={query}`
- **Search similar documents**: Menggunakan endpoint `/api/documents/?more_like_id={id}`
- **Advanced filtering**: Berdasarkan tags, document types, dan custom fields
- **Autocomplete**: Menggunakan endpoint `/api/search/autocomplete/`

### 2. Metadata dan Filtering
- **Tags**: Untuk kategorisasi bidang hukum (pidana, perdata, administrasi, dll)
- **Document Types**: Untuk jenis dokumen (UU, PP, Keppres, dll)
- **Custom Fields**: Untuk metadata spesifik (nomor, tahun, instansi, dll)
- **Correspondents**: Untuk instansi penerbit

### 3. Download dan Akses
- **Download dokumen**: Menggunakan endpoint `/api/documents/{id}/download/`
- **Thumbnail preview**: Menggunakan endpoint `/api/documents/{id}/thumb/`
- **Document details**: Menggunakan endpoint `/api/documents/{id}/`

## Setup dan Konfigurasi

### 1. Environment Variables
Tambahkan ke file `.env`:
```bash
# Paperless NGX Configuration
VITE_PAPERLESS_URL=http://localhost:8000
VITE_PAPERLESS_API_TOKEN=your-api-token-here
```

### 2. Mendapatkan API Token
1. Buka web interface Paperless NGX
2. Login dengan akun admin
3. Klik "My Profile" di user dropdown
4. Klik tombol circular arrow untuk generate/regenerate API token
5. Copy token ke file `.env`

### 3. Verifikasi Setup
```bash
# Test koneksi ke Paperless NGX
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/documents/?page_size=1
```

## Struktur Data

### Document Result Format
```typescript
interface DocumentResult {
  id: string;
  title: string;
  nomor: string;
  tahun: number;
  tentang: string;
  status: 'berlaku' | 'dicabut' | 'direvisi';
  tanggal_ditetapkan: string;
  instansi: string;
  bidang: string[];
  ringkasan: string;
  file_url?: string;
  link_external?: string;
  relevansi_score: number;
}
```

### Search Parameters
```typescript
interface PaperlessSearchParams {
  query?: string;                // Full-text search query
  more_like_id?: number;         // ID dokumen untuk search similar
  page?: number;                 // Halaman hasil (pagination)
  page_size?: number;            // Jumlah hasil per halaman
  ordering?: string;             // Sorting (-created, title, dll)
  tags__id__in?: number[];       // Filter berdasarkan tag IDs
  document_type__id?: number;    // Filter berdasarkan document type
  correspondent__id?: number;    // Filter berdasarkan correspondent
  title__icontains?: string;     // Filter berdasarkan title
  content__icontains?: string;   // Filter berdasarkan content
  custom_field_query?: string;   // Filter berdasarkan custom fields
}
```

## Penggunaan API

### 1. Pencarian Dasar
```typescript
import { searchLegalDocuments } from '@/services/paperlessService';

const results = await searchLegalDocuments('undang-undang pidana', {
  status: 'berlaku',
  tahun: '2023',
  bidang: 'pidana',
  page_size: 20
});
```

### 2. Pencarian Full-text
```typescript
import { searchFullText } from '@/services/paperlessService';

const results = await searchFullText('korupsi', {
  page: 1,
  page_size: 10,
  ordering: '-created'
});
```

### 3. Pencarian Similar
```typescript
import { searchSimilar } from '@/services/paperlessService';

const results = await searchSimilar(123, {
  page_size: 5
});
```

### 4. Autocomplete
```typescript
import { autocomplete } from '@/services/paperlessService';

const suggestions = await autocomplete('undang', 10);
```

## Error Handling

### Common Errors
1. **Service Unavailable**: Paperless NGX server tidak berjalan
2. **401 Unauthorized**: Token API tidak valid atau expired
3. **403 Forbidden**: Token tidak memiliki permissions yang cukup
4. **404 Not Found**: Endpoint tidak ditemukan (check URL)
5. **Network Error**: Koneksi ke server bermasalah

### Error Messages
```typescript
if (error.message?.includes('401')) {
  errorMessage = 'Token API tidak valid. Periksa konfigurasi VITE_PAPERLESS_API_TOKEN';
} else if (error.message?.includes('403')) {
  errorMessage = 'Akses ditolak. Periksa permissions token API';
} else if (error.message?.includes('404')) {
  errorMessage = 'Endpoint tidak ditemukan. Periksa URL Paperless NGX';
}
```

## Best Practices

### 1. Performance
- Gunakan pagination untuk hasil yang banyak
- Set page_size yang reasonable (10-20 untuk UI)
- Implement debouncing untuk autocomplete
- Cache hasil pencarian jika memungkinkan

### 2. User Experience
- Tampilkan loading states saat searching
- Provide clear error messages
- Implement search suggestions/autocomplete
- Show relevance scores untuk ranking

### 3. Security
- Jangan hardcode API tokens
- Gunakan HTTPS untuk production
- Validate dan sanitize input pencarian
- Implement rate limiting jika diperlukan

### 4. Data Management
- Organize documents dengan tags yang konsisten
- Gunakan custom fields untuk metadata terstruktur
- Implement proper document naming conventions
- Regular backup data dan indexing

## Monitoring dan Debugging

### 1. Health Check
```typescript
import { paperlessService } from '@/services/paperlessService';

const health = await paperlessService.ping();
console.log('Status:', health.status);
console.log('Version:', health.version);
```

### 2. Logging
Service sudah include comprehensive logging:
- Request/response details
- Error messages dengan context
- Performance metrics
- Search query analysis

### 3. Browser DevTools
- Network tab untuk monitor API calls
- Console untuk error messages
- Storage untuk cache debugging

## Troubleshooting

### 1. Connection Issues
```bash
# Test basic connectivity
curl http://localhost:8000/api/documents/?page_size=1

# Test with authentication
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8000/api/documents/?page_size=1
```

### 2. Search Issues
- Check document indexing status
- Verify search query syntax
- Test dengan simpler queries
- Check API version compatibility

### 3. Performance Issues
- Monitor response times
- Check server resources
- Optimize search queries
- Implement caching strategies

## Migration dari Mock Data

### 1. Data Import
- Export existing documents ke Paperless NGX
- Setup proper tags dan document types
- Configure custom fields untuk metadata
- Test search functionality

### 2. Code Migration
- Replace mock service calls dengan real API
- Update error handling
- Implement proper loading states
- Add pagination support

### 3. Testing
- Unit tests untuk service functions
- Integration tests untuk API calls
- End-to-end tests untuk search flow
- Performance testing

## Resources

- [Paperless NGX Documentation](https://docs.paperless-ngx.com/)
- [REST API Reference](https://docs.paperless-ngx.com/api/)
- [Installation Guide](https://docs.paperless-ngx.com/setup/)
- [Configuration Options](https://docs.paperless-ngx.com/configuration/)