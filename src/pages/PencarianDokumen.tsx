import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, ArrowLeft, Filter, Calendar, Tag, ExternalLink, Eye, Download, AlertCircle, Loader2, Database, UploadCloud, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AutosizeTextarea from '../components/AutosizeTextarea';
import { DotBackground } from '../components/ui/DotBackground';
import { Button } from '../components/ui/button';
import { searchLegalDocuments, paperlessService } from '../services/paperlessService';
import { env } from '../config/env';

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

interface DocumentResult {
  id: string;
  title: string;
  nomor: string;
  tahun: number;
  tentang: string;
  status: 'berlaku' | 'dicabut' | 'direvisi';
  tags?: number[]; // Array of tag IDs from API
  document_type?: number; // Document type ID from API
  page_count?: number; // Number of pages
  tanggal_upload: string; // Use 'added' date from API
  bidang: string[];
  ringkasan: string;
  file_url?: string;
  thumbnail_url?: string;
  link_external?: string;
  relevansi_score: number;
  _debug?: any; // For debugging API response
}

// Add interfaces for Paperless metadata
interface PaperlessTag {
  id: number;
  name: string;
  colour: number;
  text_colour: string;
}

interface PaperlessDocumentType {
  id: number;
  name: string;
}

const PencarianDokumen = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DocumentResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    tagId: 'all',
    documentTypeId: 'all',
  });

  // Add state for Paperless metadata
  const [availableTags, setAvailableTags] = useState<PaperlessTag[]>([]);
  const [availableDocumentTypes, setAvailableDocumentTypes] = useState<PaperlessDocumentType[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'berlaku', label: 'Berlaku' },
    { value: 'dicabut', label: 'Dicabut / Diubah' }
  ];

  const bidangOptions = [
    { value: 'all', label: 'Semua Bidang' },
    { value: 'pidana', label: 'Hukum Pidana' },
    { value: 'perdata', label: 'Hukum Perdata' },
    { value: 'tata-usaha', label: 'Hukum Tata Usaha Negara' },
    { value: 'tata-negara', label: 'Hukum Tata Negara' },
    { value: 'ekonomi', label: 'Hukum Ekonomi' },
    { value: 'lingkungan', label: 'Hukum Lingkungan' },
    { value: 'teknologi', label: 'Hukum Teknologi' },
    { value: 'kesehatan', label: 'Hukum Kesehatan' }
  ];

  // Load Paperless metadata on component mount
  useEffect(() => {
    const loadPaperlessMetadata = async () => {
      try {
        setIsLoadingMetadata(true);
        console.log('🏷️ Loading Paperless metadata...');
        
        const [tagsResponse, documentTypesResponse] = await Promise.all([
          paperlessService.getTags(),
          paperlessService.getDocumentTypes()
        ]);
        
        setAvailableTags(tagsResponse);
        setAvailableDocumentTypes(documentTypesResponse);
        
        console.log('🏷️ Paperless metadata loaded:', {
          tags: tagsResponse.length,
          documentTypes: documentTypesResponse.length,
          tagDetails: tagsResponse.map(tag => ({ id: tag.id, name: tag.name })),
          documentTypeDetails: documentTypesResponse.map(dt => ({ id: dt.id, name: dt.name }))
        });
      } catch (error) {
        console.error('❌ Failed to load Paperless metadata:', error);
      } finally {
        setIsLoadingMetadata(false);
      }
    };
    
    loadPaperlessMetadata();
  }, []);

  const fetchAutocompleteSuggestions = useCallback(
    debounce(async (term: string) => {
      if (term.length > 2) {
        try {
          const result = await paperlessService.autocomplete(term, 8);
          setAutocompleteSuggestions(result);
        } catch (error) {
          console.error("Autocomplete fetch failed:", error);
          setAutocompleteSuggestions([]);
        }
      } else {
        setAutocompleteSuggestions([]);
      }
    }, 300),
    []
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    fetchAutocompleteSuggestions(value);
  };

  const handleSearch = async (loadMore = false) => {
    if (!query.trim()) return;

    // If it's a new search, reset everything
    if (!loadMore) {
      setSearchResults([]);
      setCurrentPage(1);
      setHasMore(false);
      setHasSearched(true);
    }

    try {
      setError(null);
      setIsSearching(true);

      // Check Paperless service health only on new search
      if (!loadMore) {
        console.log('🔍 Checking Paperless NGX service status...');
        const healthCheck = await paperlessService.ping();
        console.log('📊 Health check result:', healthCheck);
        
        if (healthCheck.status === 'error') {
          throw new Error('Paperless NGX service tidak tersedia. Pastikan server berjalan di ' + (env.paperlessUrl || 'http://localhost:8000'));
        }
      }

      // Search using Paperless NGX API
      const pageToFetch = loadMore ? currentPage + 1 : 1;
      console.log(`🔍 Searching documents with query: "${query.trim()}", page: ${pageToFetch}`);
      console.log('📋 Applied filters:', selectedFilters);
      
      const paperlessResponse = await searchLegalDocuments(query.trim(), {
        tagId: selectedFilters.tagId,
        documentTypeId: selectedFilters.documentTypeId,
        page: pageToFetch,
        page_size: 20
      });

      console.log('📄 Paperless API response:', {
        total: paperlessResponse.count,
        resultsCount: paperlessResponse.results.length,
        hasNext: !!paperlessResponse.next
      });

      // Convert Paperless documents to our DocumentResult format
      const newResults: DocumentResult[] = paperlessResponse.results.map(paperlessDoc => 
        paperlessService.convertToDocumentResult(paperlessDoc)
      );

      console.log('✅ Converted new results:', newResults.length);
      
      setSearchResults(prev => loadMore ? [...prev, ...newResults] : newResults);
      setHasMore(!!paperlessResponse.next);
      if (loadMore) {
        setCurrentPage(pageToFetch);
      }
      
    } catch (error: any) {
      console.error('❌ Search error:', error);
      
      // Provide specific error messages
      let errorMessage = 'Terjadi kesalahan saat melakukan pencarian.';
      
      if (error.message?.includes('Paperless NGX service tidak tersedia')) {
        errorMessage = error.message;
      } else if (error.message?.includes('API request failed')) {
        errorMessage = 'Gagal menghubungi API Paperless NGX. Periksa konfigurasi dan pastikan server berjalan.';
      } else if (error.message?.includes('unauthorized') || error.message?.includes('401')) {
        errorMessage = 'Token API tidak valid. Periksa konfigurasi VITE_PAPERLESS_API_TOKEN di file .env';
      } else if (error.message?.includes('403')) {
        errorMessage = 'Akses ditolak. Periksa permissions token API Paperless NGX.';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Endpoint tidak ditemukan. Periksa URL Paperless NGX di konfigurasi.';
      } else if (!navigator.onLine) {
        errorMessage = 'Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.';
      } else if (error.message?.includes('fetch')) {
        errorMessage = 'Gagal terhubung ke server Paperless NGX. Pastikan server berjalan dan dapat diakses.';
      }
      
      setError(errorMessage);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    console.log('🔄 Resetting search form and results');
    
    // Clear form inputs
    setQuery('');
    setSelectedFilters({
      tagId: 'all',
      documentTypeId: 'all',
    });
    
    // Clear results and states
    setSearchResults([]);
    setError(null);
    setHasSearched(false);
    setIsSearching(false);
    
    console.log('✅ Reset completed - form and results cleared');
  };

  // Enhanced status functions using actual API tags
  const getStatusColor = (tagId: number): string => {
    if (availableTags.length === 0) {
      return 'bg-gray-100 text-gray-800 border-gray-300';
    }
    const tagData = availableTags.find(tag => tag.id === tagId);
    
    if (tagData) {
      const tagName = tagData.name.toLowerCase();
      if (tagName.includes('berlaku') || tagName.includes('aktif') || tagName.includes('valid')) {
        return 'bg-green-100 text-green-800 border-green-300';
      }
      if (tagName.includes('dicabut') || tagName.includes('dibatalkan') || tagName.includes('tidak berlaku')) {
        return 'bg-red-100 text-red-800 border-red-300';
      }
      if (tagName.includes('diubah') || tagName.includes('direvisi') || tagName.includes('amandemen')) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      }
      if (tagName.includes('draft') || tagName.includes('rancangan')) {
        return 'bg-blue-100 text-blue-800 border-blue-300';
      }
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Function to get document type name
  const getDocumentTypeName = (documentTypeId?: number): string => {
    if (!documentTypeId || availableDocumentTypes.length === 0) {
      return 'Tipe Dokumen Tidak Diketahui';
    }
    
    const docType = availableDocumentTypes.find(dt => dt.id === documentTypeId);
    return docType ? docType.name : `Type ID: ${documentTypeId}`;
  };

  // Handle authenticated download
  const handleDownload = async (event: React.MouseEvent, documentId: string, filename?: string) => {
    event.preventDefault(); // Prevent any default behavior
    event.stopPropagation(); // Stop event bubbling
    
    try {
      console.log('📥 Starting download for document:', documentId);
      setIsSearching(true); // Show loading state
      
      const blob = await paperlessService.downloadDocument(parseInt(documentId));
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `document-${documentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log('✅ Download completed for document:', documentId);
    } catch (error) {
      console.error('❌ Download failed:', error);
      setError('Gagal mengunduh dokumen. ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSearching(false);
    }
  };

  // Handle authenticated preview
  const handlePreview = async (event: React.MouseEvent, documentId: string) => {
    event.preventDefault(); // Prevent any default behavior
    event.stopPropagation(); // Stop event bubbling
    
    try {
      console.log('👁️ Opening preview for document:', documentId);
      
      const blob = await paperlessService.getPreview(parseInt(documentId));
      
      // Create preview URL
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Cleanup after a delay (optional, browser handles it, but good practice)
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
      console.log('✅ Preview opened for document:', documentId);
    } catch (error) {
      console.error('❌ Preview failed:', error);
      setError('Gagal membuka preview. ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const DocumentThumbnail = ({ docId }: { docId: string }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const target = ref.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !thumbnailUrl && !isLoading && !error) {
                    setIsLoading(true);
                    paperlessService.getThumbnail(parseInt(docId))
                        .then(blob => {
                            const url = URL.createObjectURL(blob);
                            setThumbnailUrl(url);
                        })
                        .catch(err => {
                            console.error(`Failed to load thumbnail for doc ${docId}`, err);
                            setError(true);
                        })
                        .finally(() => {
                            setIsLoading(false);
                        });
                    observer.unobserve(target); // Unobserve after trying to fetch
                }
            },
            { rootMargin: '200px' } // Load images 200px before they enter the viewport
        );

        observer.observe(target);

        return () => {
            if (target) {
                observer.unobserve(target);
            }
            // Clean up blob url if component unmounts
            if (thumbnailUrl) {
              URL.revokeObjectURL(thumbnailUrl);
            }
        };
    }, [docId, thumbnailUrl, isLoading, error]);

    return (
        <div ref={ref} className="w-28 h-40 flex-shrink-0 bg-gray-200 rounded-lg shadow-sm">
            {isLoading && <div className="w-full h-full bg-gray-200 rounded-lg animate-pulse" />}
            {thumbnailUrl && !isLoading && (
                <img
                    src={thumbnailUrl}
                    alt={`Thumbnail for document ${docId}`}
                    className="w-full h-full object-cover rounded-lg"
                />
            )}
            {error && !isLoading && (
                 <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-center p-2">
                    <span className="text-xs text-red-500">Gagal memuat thumbnail</span>
                 </div>
            )}
            {!thumbnailUrl && !isLoading && !error && (
                 <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-400" />
                 </div>
            )}
        </div>
    );
  };

  return (
    <DotBackground className="min-h-screen bg-gray-50">
      <div className="relative z-10 w-full overflow-x-hidden">
        <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Kembali ke Beranda</span>
            </Button>
          </div>

          {/* Title Section */}
          <header className="text-center space-y-4 sm:space-y-6 py-6 sm:py-8">
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Database className="w-5 h-5 sm:w-6 sm:w-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  Pencarian Dokumen Hukum
                </h1>
                <p className="text-base sm:text-lg text-gray-600 mt-1">
                  Sistem pencarian dokumen peraturan perundang-undangan
                </p>
              </div>
            </div>
            <p className="text-base text-gray-600 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
              Temukan dokumen hukum yang Anda butuhkan dengan pencarian semantik yang canggih.
            </p>
          </header>

          {/* Search Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 backdrop-blur-sm">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              {/* Search Input */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-800">
                  Kata Kunci Pencarian
                </label>
                <div className="relative">
                  <AutosizeTextarea
                    value={query}
                    onChange={handleQueryChange}
                    placeholder="Contoh: undang-undang tentang pidana, peraturan pemerintah keamanan data, keppres ekonomi digital..."
                    className="w-full p-4 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 bg-gray-50/50 focus:bg-white"
                    minRows={3}
                    maxRows={6}
                  />
                  <Search className="absolute right-4 top-4 w-5 h-5 text-gray-400" />
                </div>
                {autocompleteSuggestions.length > 0 && (
                  <div className="relative">
                    <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-60 overflow-auto">
                      {autocompleteSuggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setQuery(suggestion);
                            setAutocompleteSuggestions([]);
                            handleSearch(false);
                          }}
                        >
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Filters */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Filter Pencarian
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Status Dokumen
                    </label>
                    <select
                      value={selectedFilters.tagId}
                      onChange={(e) => setSelectedFilters(prev => ({ ...prev, tagId: e.target.value }))}
                      className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-colors"
                      disabled={isLoadingMetadata}
                    >
                      <option value="all">Semua Status</option>
                      {availableTags.map(tag => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Jenis Peraturan
                    </label>
                    <select
                      value={selectedFilters.documentTypeId}
                      onChange={(e) => setSelectedFilters(prev => ({ ...prev, documentTypeId: e.target.value }))}
                      className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-colors"
                      disabled={isLoadingMetadata}
                    >
                      <option value="all">Semua Jenis</option>
                      {availableDocumentTypes.map(docType => (
                        <option key={docType.id} value={docType.id}>
                          {docType.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSearching}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  Reset Filter
                </Button>
                <Button
                  onClick={() => handleSearch(false)}
                  disabled={isSearching || !query.trim()}
                  className="flex items-center justify-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mencari Dokumen...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Cari Dokumen
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isSearching && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60 backdrop-blur-sm">
              <div className="p-8 lg:p-12 text-center space-y-6">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                  <Database className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">Mencari Dokumen Hukum</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Sedang menganalisis dan mencari dokumen yang relevan dengan kata kunci Anda...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 mb-1">Terjadi Kesalahan</h3>
                  <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-6">
              {/* Results Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Hasil Pencarian
                      </h2>
                      <p className="text-sm text-gray-600">
                        Ditemukan {searchResults.length} dokumen yang relevan
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      Diurutkan berdasarkan relevansi
                    </p>
                  </div>
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid gap-6">
                {searchResults.map((doc, index) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200/60 hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="p-6 lg:p-8 space-y-6">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <a 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handleDownload(e, doc.id, `${doc.title.substring(0, 50)}.pdf`);
                              }}
                              className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline leading-tight transition-colors"
                              title={`Unduh "${doc.title}"`}
                            >
                              {doc.title}
                            </a>
                            {doc.tentang && (
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                {doc.tentang}
                              </p>
                            )}
                          </div>
                        </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm pt-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">Nomor:</span>
                          <span className="text-gray-600 truncate" title={doc.nomor || 'N/A'}>{doc.nomor || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-700">Halaman:</span>
                          <span className="text-gray-600">{doc.page_count || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UploadCloud className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-700">Tgl Upload:</span>
                          <span className="text-gray-600">
                            {new Date(doc.tanggal_upload).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                        {/* Summary Section with Thumbnail */}
                        <div className="mt-4 flex flex-col sm:flex-row items-start gap-4">
                          <DocumentThumbnail docId={doc.id} />
                          <div className="flex-1 bg-gray-50/50 border border-gray-200/60 rounded-lg p-3 sm:p-4 self-stretch w-full">
                            <h4 className="font-medium text-gray-900 mb-2">Ringkasan & Highlight:</h4>
                            <div
                              className="text-sm text-gray-700 leading-relaxed break-words prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: doc._debug?.searchHit?.highlights
                                  ? paperlessService.cleanHighlights(doc._debug.searchHit.highlights)
                                  : doc.ringkasan,
                              }}
                            />
                          </div>
                        </div>

                        {/* Document Tags from API */}
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="pt-4">
                            <div className="flex flex-wrap gap-2">
                              {doc.tags.map((tagId) => {
                                const tagData = availableTags.find(t => t.id === tagId);
                                if (!tagData) return null;

                                let tagClassName = "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full";
                                if (tagId === 1) {
                                  tagClassName += " bg-green-100 text-green-800";
                                } else if (tagId === 2) {
                                  tagClassName += " bg-red-100 text-red-800";
                                } else {
                                  tagClassName += " bg-gray-100 text-gray-700";
                                }

                                return (
                                  <span
                                    key={tagId}
                                    className={tagClassName}
                                  >
                                    <Tag className="w-3 h-3" />
                                    {tagData.name}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      {/* Action Buttons Removed */}
                      <div className="flex items-center justify-between border-t border-gray-200/60 mt-4 pt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                           {/* Placeholder for any future bottom-left actions */}
                        </div>
                      </div>

                      {/* Debug Info (only in development) */}
                      {doc._debug && import.meta.env.DEV && (
                        <div className="mt-4 p-3 bg-gray-100 rounded-lg border-l-4 border-gray-400">
                          <details className="text-xs text-gray-600">
                            <summary className="cursor-pointer font-medium">Debug Info</summary>
                            <div className="mt-2 space-y-1">
                              <p><span className="font-medium">Document ID:</span> {doc._debug.documentId}</p>
                              <p><span className="font-medium">Score:</span> {doc.relevansi_score}%</p>
                              <p><span className="font-medium">Has Highlights:</span> {doc._debug.searchHit?.highlights ? 'Yes' : 'No'}</p>
                              {doc._debug.searchHit && (
                                <p><span className="font-medium">API Score:</span> {doc._debug.searchHit.score}</p>
                              )}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && !isSearching && (
                <div className="text-center pt-6">
                  <Button
                    variant="outline"
                    onClick={() => handleSearch(true)}
                    disabled={isSearching}
                    className="flex items-center justify-center gap-2 px-8 py-3 text-gray-700 border-gray-300 hover:bg-gray-50"
                  >
                    <Loader2 className="w-4 h-4" />
                    Muat Lebih Banyak
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* No Results Message */}
          {!isSearching && hasSearched && searchResults.length === 0 && !error && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/60">
              <div className="text-center py-16 px-8">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Tidak Ada Dokumen Ditemukan
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Tidak dapat menemukan dokumen yang sesuai dengan kata kunci dan filter yang Anda gunakan.
                    Coba ubah kata kunci atau sesuaikan filter pencarian.
                  </p>
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="flex items-center gap-2 mx-auto"
                    >
                      <Filter className="w-4 h-4" />
                      Reset dan Coba Lagi
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DotBackground>
  );
};

export default PencarianDokumen; 