import React, { useState } from 'react';
import { FileText, FileSpreadsheet, FileBarChart, FileCheck, ArrowLeft } from 'lucide-react';

type ReportField = {
  id: string;
  label: string;
  type: string;
  placeholder: string;
};

type ReportType = {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  fields: ReportField[];
};

const reportTypes: ReportType[] = [
  {
    id: 'case-summary',
    name: 'Ringkasan Kasus',
    description: 'Menghasilkan ikhtisar dan timeline kasus yang komprehensif',
    icon: <FileText size={24} className="text-blue-500" />,
    fields: [
      { id: 'case_title', label: 'Judul Kasus', type: 'text', placeholder: 'Masukkan judul kasus' },
      { id: 'time_period', label: 'Periode Waktu', type: 'text', placeholder: 'Tentukan periode waktu yang dicakup' },
      { id: 'summary', label: 'Ikhtisar Kasus', type: 'textarea', placeholder: 'Berikan ikhtisar singkat kasus...' },
      { id: 'key_events', label: 'Kejadian Utama', type: 'textarea', placeholder: 'Daftar kejadian utama secara kronologis...' }
    ]
  },
  {
    id: 'evidence-report',
    name: 'Laporan Bukti',
    description: 'Menyusun analisis bukti dan temuan secara detail',
    icon: <FileSpreadsheet size={24} className="text-green-500" />,
    fields: [
      { id: 'evidence_list', label: 'Daftar Bukti', type: 'textarea', placeholder: 'Daftar semua bukti yang dikumpulkan...' },
      { id: 'analysis_results', label: 'Hasil Analisis', type: 'textarea', placeholder: 'Rangkum temuan analisis...' },
      { id: 'chain_of_custody', label: 'Rantai Penjagaan', type: 'textarea', placeholder: 'Dokumentasikan timeline penanganan bukti...' }
    ]
  },
  {
    id: 'analytics-report',
    name: 'Laporan Analitik',
    description: 'Membuat analisis statistik dan visualisasi data',
    icon: <FileBarChart size={24} className="text-purple-500" />,
    fields: [
      { id: 'data_sources', label: 'Sumber Data', type: 'textarea', placeholder: 'Daftar sumber data yang dianalisis...' },
      { id: 'key_metrics', label: 'Metrik Utama', type: 'textarea', placeholder: 'Jelaskan metrik dan temuan utama...' },
      { id: 'patterns', label: 'Pola yang Ditemukan', type: 'textarea', placeholder: 'Dokumentasikan pola atau tren yang ditemukan...' }
    ]
  },
  {
    id: 'final-report',
    name: 'Laporan Akhir',
    description: 'Menghasilkan laporan investigasi lengkap dengan semua temuan',
    icon: <FileCheck size={24} className="text-amber-500" />,
    fields: [
      { id: 'executive_summary', label: 'Ringkasan Eksekutif', type: 'textarea', placeholder: 'Berikan ringkasan kasus yang komprehensif...' },
      { id: 'methodology', label: 'Metodologi Investigasi', type: 'textarea', placeholder: 'Jelaskan metode investigasi yang digunakan...' },
      { id: 'findings', label: 'Temuan Utama', type: 'textarea', placeholder: 'Daftar semua temuan penting...' },
      { id: 'conclusions', label: 'Kesimpulan', type: 'textarea', placeholder: 'Nyatakan kesimpulan akhir...' },
      { id: 'recommendations', label: 'Rekomendasi', type: 'textarea', placeholder: 'Berikan rekomendasi untuk tindakan...' }
    ]
  }
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setIsGenerating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
    setFormData({});
  };

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const selectedReportData = reportTypes.find(report => report.id === selectedReport);

  if (selectedReport && selectedReportData) {
    return (
      <div className="p-6 lg:p-8">
        <header>
          <div className="max-w-5xl mx-auto pl-14 pr-4 sm:pl-14 sm:pr-4 lg:pl-14 lg:pr-4 py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setSelectedReport(null)} 
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-7">{selectedReportData.name}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{selectedReportData.description}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {selectedReportData.fields.map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    type="text"
                    value={formData[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={isGenerating}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                isGenerating
                  ? 'bg-gray-400'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isGenerating ? 'Membuat Laporan...' : 'Buat Laporan'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <header>
        <div className="max-w-5xl mx-auto pl-14 pr-4 sm:pl-14 sm:pr-4 lg:pl-14 lg:pr-4 py-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-7">Pembuatan Laporan</h1>
            <p className="text-sm text-gray-500 mt-0.5">Buat laporan otomatis untuk investigasi Anda</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {reportTypes.map(report => (
          <div 
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all cursor-pointer border border-gray-100"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    {report.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                </div>
                <p className="text-gray-600">{report.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}