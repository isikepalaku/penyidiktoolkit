import React, { useState } from 'react';
import { FileText, Search, AlertCircle, Clock } from 'lucide-react';
import type { ExtendedAgent, FormData } from '../../types';
import { submitLaporanInteljenAnalysis } from '../../services/agentLaporanIntelejen';

interface IntelligenceAgentFormProps {
  agent: ExtendedAgent;
  onResult: (result: string) => void;
  onError: (error: string) => void;
}

export const IntelligenceAgentForm: React.FC<IntelligenceAgentFormProps> = ({
  onResult,
  onError
}) => {
  const [selectedMode, setSelectedMode] = useState<string>('REPORT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    mode: 'REPORT',
    issue: '',
    category: '',
    wilayahHukum: '',
    sumber: '',
    caraMendapatkanBaket: '',
    hubunganDenganSasaran: '',
    waktuMendapatkanInformasi: '',
    nilaiInformasi: ''
  });

  const handleModeChange = (mode: string) => {
    setSelectedMode(mode);
    setFormData(prev => ({ ...prev, mode }));
  };

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  // Check validation berdasarkan mode
  const getValidationMessage = () => {
    if (selectedMode === 'SEARCH') {
      const wilayahHukum = formData.wilayahHukum as string || '';
      if (!wilayahHukum.trim()) {
        return 'Wilayah Hukum wajib diisi untuk mode Pencarian Produk Intelijen';
      }
    } else {
      const issue = formData.issue as string || '';
      if (!issue.trim()) {
        return 'Pokok Permasalahan/Isu Utama wajib diisi untuk mode Laporan Intelijen';
      }
    }
    return null;
  };

  const validationMessage = getValidationMessage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationMessage || isProcessing) {
      return;
    }

    setIsProcessing(true);
    
    try {
      // Validasi berdasarkan mode
      if (selectedMode === 'SEARCH') {
        const wilayahHukum = formData.wilayahHukum as string || '';
        if (!wilayahHukum.trim()) {
          throw new Error('Wilayah Hukum wajib diisi untuk mode Pencarian Produk Intelijen');
        }
      } else {
        const issue = formData.issue as string || '';
        if (!issue.trim()) {
          throw new Error('Pokok Permasalahan/Isu Utama wajib diisi untuk mode Laporan Intelijen');
        }
      }
      
      // Format data untuk service
      const intelligenceData = {
        mode: selectedMode,
        issue: formData.issue as string || '',
        category: formData.category as string || '',
        wilayahHukum: formData.wilayahHukum as string || '',
        sumber: formData.sumber as string || '',
        caraMendapatkanBaket: formData.caraMendapatkanBaket as string || '',
        hubunganDenganSasaran: formData.hubunganDenganSasaran as string || '',
        waktuMendapatkanInformasi: formData.waktuMendapatkanInformasi as string || '',
        nilaiInformasi: formData.nilaiInformasi as string || ''
      };
      
      // Format pesan untuk service
      const intelligenceMessage = `MODE:${selectedMode}\nDATA:${JSON.stringify(intelligenceData)}`;
      const response = await submitLaporanInteljenAnalysis(intelligenceMessage);
      
      onResult(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui';
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Professional indicator bar */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600"></div>
      
      <form onSubmit={handleSubmit} className="p-6 pt-8">
        {/* Mode Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Mode Analisis *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleModeChange('REPORT')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedMode === 'REPORT'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <FileText className={`w-5 h-5 mt-0.5 ${
                  selectedMode === 'REPORT' ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <div>
                  <h3 className={`font-medium ${
                    selectedMode === 'REPORT' ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    Laporan Intelijen
                  </h3>
                  <p className={`text-sm mt-1 ${
                    selectedMode === 'REPORT' ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    Buat laporan intelijen lengkap dari isu tertentu
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('SEARCH')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedMode === 'SEARCH'
                  ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <Search className={`w-5 h-5 mt-0.5 ${
                  selectedMode === 'SEARCH' ? 'text-emerald-600' : 'text-gray-400'
                }`} />
                <div>
                  <h3 className={`font-medium ${
                    selectedMode === 'SEARCH' ? 'text-emerald-900' : 'text-gray-900'
                  }`}>
                    Pencarian Produk Intelijen
                  </h3>
                  <p className={`text-sm mt-1 ${
                    selectedMode === 'SEARCH' ? 'text-emerald-700' : 'text-gray-600'
                  }`}>
                    Cari isu potensial di wilayah hukum tertentu
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Conditional Form Fields */}
        {selectedMode === 'REPORT' ? (
          /* Laporan Intelijen Form */
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Data Input Laporan Intelijen
              </h3>
              
              {/* Issue */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pokok Permasalahan/Isu Utama *
                </label>
                <textarea
                  value={formData.issue as string || ''}
                  onChange={(e) => handleInputChange('issue', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  placeholder="Contoh: Peningkatan peredaran narkoba jenis sabu di wilayah Jakarta Selatan..."
                />
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori Isu
                </label>
                <input
                  type="text"
                  value={formData.category as string || ''}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Contoh: Narkotika, Terorisme, Kejahatan Siber, dll."
                />
              </div>
            </div>

            {/* Pendahuluan Section */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-4">
                I. Pendahuluan (Detail Laporan)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sumber Informasi (Pelapor)
                  </label>
                  <input
                    type="text"
                    value={formData.sumber as string || ''}
                    onChange={(e) => handleInputChange('sumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Pelapor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cara Mendapatkan Informasi
                  </label>
                  <input
                    type="text"
                    value={formData.caraMendapatkanBaket as string || ''}
                    onChange={(e) => handleInputChange('caraMendapatkanBaket', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Monitoring Media"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hubungan dengan Sasaran/Target
                  </label>
                  <input
                    type="text"
                    value={formData.hubunganDenganSasaran as string || ''}
                    onChange={(e) => handleInputChange('hubunganDenganSasaran', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Tidak Langsung"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waktu Mendapatkan Informasi
                  </label>
                  <input
                    type="text"
                    value={formData.waktuMendapatkanInformasi as string || ''}
                    onChange={(e) => handleInputChange('waktuMendapatkanInformasi', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Senin, 15 Januari 2024, 14:30 WIB"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nilai Informasi
                </label>
                <select
                  value={formData.nilaiInformasi as string || ''}
                  onChange={(e) => handleInputChange('nilaiInformasi', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">Pilih nilai informasi</option>
                  <option value="A1">A1 - Sumber dapat dipercaya, Informasi dikonfirmasi</option>
                  <option value="A2">A2 - Sumber dapat dipercaya, Informasi mungkin benar</option>
                  <option value="A3">A3 - Sumber dapat dipercaya, Informasi mungkin salah</option>
                  <option value="B1">B1 - Sumber agak dapat dipercaya, Informasi dikonfirmasi</option>
                  <option value="B2">B2 - Sumber agak dapat dipercaya, Informasi mungkin benar</option>
                  <option value="B3">B3 - Sumber agak dapat dipercaya, Informasi mungkin salah</option>
                  <option value="C1">C1 - Sumber tidak dapat dipercaya, Informasi dikonfirmasi</option>
                  <option value="C2">C2 - Sumber tidak dapat dipercaya, Informasi mungkin benar</option>
                  <option value="C3">C3 - Sumber tidak dapat dipercaya, Informasi mungkin salah</option>
                  <option value="D">D - Tidak dapat dinilai</option>
                  <option value="E">E - Informasi tidak dapat dipercaya</option>
                  <option value="F">F - Kebenaran tidak dapat ditentukan</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* Pencarian Produk Intelijen Form */
          <div className="space-y-6">
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <h3 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Pencarian Produk Intelijen Wilayah Hukum
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wilayah Hukum *
                  </label>
                  <input
                    type="text"
                    value={formData.wilayahHukum as string || ''}
                    onChange={(e) => handleInputChange('wilayahHukum', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Contoh: Jakarta Selatan, Surabaya, Medan, dll."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori Isu (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.category as string || ''}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="Contoh: Narkotika, Terorisme, dll."
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-emerald-100 rounded-lg border border-emerald-300">
                <p className="text-sm text-emerald-800">
                  <strong>Info:</strong> Sistem akan mencari potensi isu intelijen terkini di wilayah hukum yang ditentukan, 
                  termasuk ancaman keamanan, kejahatan terorganisir, dan aktivitas mencurigakan lainnya.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Message */}
        {validationMessage && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800">{validationMessage}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={isProcessing || !!validationMessage}
            className={`w-full flex items-center justify-center px-6 py-4 rounded-xl font-medium transition-all duration-200 ${
              selectedMode === 'REPORT'
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                {selectedMode === 'REPORT' ? 'Memproses Laporan...' : 'Mencari Produk Intelijen...'}
              </>
            ) : (
              <>
                {selectedMode === 'REPORT' ? (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Buat Laporan Intelijen
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Cari Produk Intelijen
                  </>
                )}
              </>
            )}
          </button>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {selectedMode === 'REPORT' ? 'Sedang Menganalisis Isu dan Menyusun Laporan' : 'Sedang Mencari Potensi Isu di Wilayah Hukum'}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  AI sedang mengumpulkan informasi dari berbagai sumber terpercaya dan menganalisis data terkini...
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}; 