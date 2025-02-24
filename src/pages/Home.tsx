import { lazy, Suspense, memo } from 'react';
import { DotBackground } from '@/components/ui/DotBackground';
import { CheckCircle2 } from 'lucide-react';

// Separate loading placeholder component with memo
const LoadingPlaceholder = memo(() => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
  </div>
));

// Optimize TimelineDemo loading
const TimelineDemo = lazy(() => {
  const componentPromise = import('@/components/ui/timeline.demo');
  // Preload in parallel
  componentPromise.then((module) => {
    // Cache the module
    return module;
  });
  return componentPromise;
});

// Memoize the static content
const AboutSection = memo(() => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-md">
    <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
      Tentang Reserse AI
    </h2>
    <p className="text-gray-600 dark:text-gray-300 mb-4">
      Reserse AI adalah alat bantu analisis hukum dan penyelidikan yang menggunakan Agent AI dengan data Corpus hukum yang relevan. 
      Sistem ini dirancang untuk membantu penyidik dalam menganalisis kasus dengan lebih efisien dan akurat.
    </p>
    <div className="space-y-2 text-gray-600 dark:text-gray-300">
      <p>
        Tujuan utama dari aplikasi ini adalah membangun sistem otomatisasi AI yang memiliki konteks dalam bekerja, 
        sehingga dapat meminimalisir halusinasi dan memberikan analisis yang lebih akurat berdasarkan data hukum yang valid.
      </p>
      <p className="font-medium text-gray-700 dark:text-gray-200 mt-4">
        Penting untuk diingat: AI tidak pernah menggantikan peran manusia dalam proses penyidikan. 
        AI ditujukan sebagai alat bantu yang memudahkan pekerjaan.
      </p>
    </div>
  </div>
));

export default function Home() {
  return (
    <DotBackground className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with subtitle */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">RESERSE AI</h1>
          </div>
          <div className="flex items-center gap-2 ml-11">
            <p className="text-base text-gray-600 dark:text-gray-300">
              Timeline Tools Reserse AI
            </p>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
        </div>

        <AboutSection />

        {/* Timeline content */}
        <div className="mt-4">
          <Suspense fallback={<LoadingPlaceholder />}>
            <TimelineDemo />
          </Suspense>
        </div>
      </div>
    </DotBackground>
  );
}
