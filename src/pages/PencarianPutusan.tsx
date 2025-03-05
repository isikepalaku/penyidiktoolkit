import { useState } from 'react';
import { Search, BookOpen, FileText, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AutosizeTextarea from '../components/AutosizeTextarea';
import { searchPutusan } from '../services/searchPutusanService';
import type { SearchResult, LegalDocument } from '../types';
import ProgressSteps from '../components/ProgressSteps';
import { Modal } from '../components/ui/Modal';
import { DotBackground } from '../components/ui/DotBackground';

const PencarianPutusan = () => {
  const navigate = useNavigate();
  const [kronologi, setKronologi] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const steps = [
    'Mulai pencarian putusan',
    'Menganalisis kronologi kasus',
    'Mencari putusan yang relevan',
    'Menampilkan hasil pencarian'
  ];

  const handleSearch = async () => {
    try {
      setHasSearched(true);
      setError(null);
      setIsSearching(true);
      setCurrentStep(1);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStep(2);
      
      const results = await searchPutusan(kronologi);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep(3);
      setSearchResults(results);
      setKronologi('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mencari putusan');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setKronologi('');
    setSearchResults([]);
    setError(null);
    setCurrentStep(0);
    setHasSearched(false);
  };

  const renderMatchedContent = (content: string) => (
    <div dangerouslySetInnerHTML={{ __html: content }} />
  );

  return (
    <DotBackground className="min-h-screen">
      <div className="relative z-10 w-full overflow-x-hidden">
        <div className="container mx-auto max-w-5xl px-2 md:px-6 space-y-4 md:space-y-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700 mt-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Kembali</span>
          </button>

          <header>
            <div className="px-6 py-8">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Pencarian Putusan Pengadilan</h1>
                </div>
                <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 ml-11">
                  Agen ai pencarian semantik, putusan pengadilan berdasarkan kronologi kasus. (Beta)
                </p>
              </div>
            </div>
          </header>

          {/* Input Card */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-md p-3 md:p-6 w-full border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 text-gray-700 dark:text-gray-200" />
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Pencarian Putusan Pengadilan</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                  Masukkan Kronologi Kasus
                </label>
                <AutosizeTextarea
                  value={kronologi}
                  onChange={setKronologi}
                  placeholder="Deskripsikan kronologi kasus Anda di sini..."
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm min-h-[150px]"
                  minRows={5}
                  maxRows={15}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                  disabled={isSearching || !kronologi}
                >
                  Reset
                </button>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !kronologi}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <>Mencari...</>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Cari Putusan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          {isSearching && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <ProgressSteps steps={steps} currentStep={currentStep} isSearching={isSearching} />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-md p-3 md:p-6 space-y-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-gray-700 dark:text-gray-200" />
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Hasil Pencarian</h2>
              </div>
              <h3 className="font-semibold mb-4 text-sm md:text-base">
                Ditemukan {searchResults.length} Putusan Relevan:
              </h3>
              {searchResults.map((result, index) => (
                <div key={index} 
                  onClick={() => {
                    setSelectedDocument(result.document);
                    setIsOpen(true);
                  }}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-sm border p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-600 flex items-center gap-2 text-sm md:text-base">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span>{result.document.title}</span>
                      </h4>
                      
                      {result.document.metadata && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-gray-600 dark:text-gray-300">
                          {result.document.metadata.nomor_putusan && (
                            <div>
                              <span className="font-medium">Nomor Putusan:</span>{' '}
                              {result.document.metadata.nomor_putusan}
                            </div>
                          )}
                          {result.document.metadata.tanggal_putusan && (
                            <div>
                              <span className="font-medium">Tanggal:</span>{' '}
                              {new Date(result.document.metadata.tanggal_putusan).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 text-xs md:text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        {result.matchedSegments.map((segment, idx) => (
                          <div key={idx} className="mb-2">
                            {renderMatchedContent(segment)}
                          </div>
                        ))}
                      </div>

                      {result.document.tags && result.document.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 md:gap-2">
                          {result.document.tags.map((tag, idx) => (
                            <span key={idx} 
                              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-2 py-0.5 rounded-md text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col items-center md:items-end gap-2">
                      <span className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs font-medium px-2 py-1 rounded">
                        {result.relevanceScore}% relevan
                      </span>
                      
                      {(result.document.file_url || result.document.link_gdrive) && (
                        <div className="flex md:flex-col gap-2">
                          {result.document.file_url && (
                            <a
                              href={result.document.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs md:text-sm text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-400"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Lihat PDF</span>
                            </a>
                          )}
                          {result.document.link_gdrive && (
                            <a
                              href={result.document.link_gdrive}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs md:text-sm text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-400"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Drive</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results Message */}
          {!isSearching && hasSearched && searchResults.length === 0 && !error && (
            <div className="text-center text-gray-600 dark:text-gray-300 text-sm md:text-base">
              Tidak ditemukan putusan yang relevan. Coba ubah kata kunci pencarian Anda.
            </div>
          )}
        </div>
      </div>

      {selectedDocument && isOpen && (
        <Modal
          document={selectedDocument}
          onClose={() => {
            setSelectedDocument(null);
            setIsOpen(false);
          }}
        />
      )}
    </DotBackground>
  );
};

export default PencarianPutusan;
