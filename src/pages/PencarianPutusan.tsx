import { useState } from 'react';
import { Search, BookOpen, FileText, ExternalLink, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AutosizeTextarea from '../components/AutosizeTextarea';
import { searchPutusan } from '../services/searchPutusanService';
import type { SearchResult, LegalDocument } from '../types';
import ProgressSteps from '../components/ProgressSteps';
import { Modal } from '../components/ui/Modal';

const PencarianPutusan = () => {
  const navigate = useNavigate();
  const [kronologi, setKronologi] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    'Mulai pencarian putusan',
    'Menganalisis kronologi kasus',
    'Mencari putusan yang relevan',
    'Menampilkan hasil pencarian'
  ];

  const handleSearch = async () => {
    try {
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
  };

  const renderMatchedContent = (content: string) => (
    <div dangerouslySetInnerHTML={{ __html: content }} />
  );

  return (
    <div className="w-full overflow-x-hidden">
      <div className="container mx-auto max-w-5xl px-2 md:px-6 space-y-4 md:space-y-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 border border-gray-200 mt-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Kembali</span>
        </button>

        <header className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-2xl">
          <div className="px-6 py-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Pencarian Putusan Pengadilan</h1>
              </div>
              <p className="text-base md:text-lg text-gray-600 ml-11">
                Temukan putusan pengadilan yang relevan dengan kasus Anda
              </p>
            </div>
          </div>
        </header>

        {/* Input Card */}
        <div className="bg-white rounded-lg shadow-md p-3 md:p-6 w-full">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <BookOpen className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <h2 className="text-lg md:text-xl font-semibold">Pencarian Putusan Pengadilan</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Masukkan Kronologi Kasus
              </label>
              <AutosizeTextarea
                value={kronologi}
                onChange={setKronologi}
                placeholder="Deskripsikan kronologi kasus Anda di sini..."
                className="w-full max-w-full resize-none"
                minRows={3}
                maxRows={12}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                disabled={!kronologi || isSearching}
                className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg 
                  ${!kronologi || isSearching 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'} 
                  transition-colors`}
              >
                <span className="inline-flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>Cari Putusan Relevan</span>
                </span>
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Results Card */}
        {(isSearching || searchResults.length > 0 || error) && (
          <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
            {/* Progress Steps */}
            <ProgressSteps 
              steps={steps}
              currentStep={currentStep}
              isSearching={isSearching}
            />

            {isSearching && (
              <div className="flex flex-col items-center justify-center">
                {/* Removed ThinkingAnimation component */}
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 p-3 md:p-4 rounded-lg mb-4 text-sm md:text-base">
                {error}
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold mb-4 text-sm md:text-base">
                  Ditemukan {searchResults.length} Putusan Relevan:
                </h3>
                {searchResults.map((result, index) => (
                  <div key={index} 
                    onClick={() => {
                      setSelectedDocument(result.document);
                      setIsOpen(true);
                    }}
                    className="bg-white rounded-lg shadow-sm border p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-600 flex items-center gap-2 text-sm md:text-base">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span>{result.document.title}</span>
                        </h4>
                        
                        {result.document.metadata && (
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-gray-600">
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

                        <div className="mt-3 text-xs md:text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
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
                                className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex md:flex-col items-center md:items-end gap-2">
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                          {result.relevanceScore}% relevan
                        </span>
                        
                        {(result.document.file_url || result.document.link_gdrive) && (
                          <div className="flex md:flex-col gap-2">
                            {result.document.file_url && (
                              <a
                                href={result.document.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs md:text-sm text-blue-600 hover:text-blue-800"
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
                                className="inline-flex items-center gap-1 text-xs md:text-sm text-blue-600 hover:text-blue-800"
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

            {!isSearching && searchResults.length === 0 && !error && (
              <div className="text-center text-gray-600 text-sm md:text-base">
                Tidak ditemukan putusan yang relevan. Coba ubah kata kunci pencarian Anda.
              </div>
            )}
          </div>
        )}
        
        {selectedDocument && isOpen && (
          <Modal
            document={selectedDocument}
            onClose={() => {
              setSelectedDocument(null);
              setIsOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PencarianPutusan;