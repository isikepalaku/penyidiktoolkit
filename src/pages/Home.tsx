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
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg flex-1">
    <div className="mb-4">
      <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-1 rounded-full mb-2" style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}>
        Tools terus dikembangkan
      </span>
    </div>
    
    <div className="border-l-4 border-blue-500 pl-4 my-4" style={{ fontFamily: '"Playfair Display", serif' }}>
      <h3 className="text-xl mb-2 text-gray-800 dark:text-gray-100" style={{ letterSpacing: '-0.5px', fontWeight: 600 }}>Reserse AI</h3>
      <p style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300, lineHeight: 1.6 }}>
        Alat bantu analisis hukum dan penyelidikan yang menggunakan <span style={{ fontWeight: 500 }}>Agent AI</span> dengan data Corpus hukum yang relevan.
        <br />
        Sistem ini dirancang untuk membantu penyidik dalam menganalisis kasus dengan lebih efisien dan akurat.
      </p>
    </div>
    <div className="space-y-6 text-gray-600 dark:text-gray-300">
      <div className="border-l-4 border-green-500 pl-4 my-4" style={{ fontFamily: '"Playfair Display", serif' }}>
        <h3 className="text-xl mb-2 text-gray-800 dark:text-gray-100" style={{ letterSpacing: '-0.5px', fontWeight: 600 }}>Tujuan</h3>
        <p style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 300, lineHeight: 1.6 }}>
          Membangun sistem otomatisasi AI yang memiliki konteks dalam bekerja, 
          sehingga dapat meminimalisir halusinasi dan memberikan analisis yang lebih akurat berdasarkan data hukum yang valid.
        </p>
      </div>
      
      <div className="border-l-4 border-amber-500 pl-4 my-4" style={{ fontFamily: '"Playfair Display", serif' }}>
        <h3 className="text-xl mb-2 text-gray-800 dark:text-gray-100" style={{ letterSpacing: '-0.5px', fontWeight: 600 }}>Catatan Penting</h3>
        <p style={{ fontFamily: '"Poppins", sans-serif', fontWeight: 400, lineHeight: 1.6 }}>
          AI tidak pernah menggantikan peran manusia dalam proses penyidikan. 
          AI ditujukan sebagai alat bantu yang memudahkan pekerjaan.
        </p>
      </div>
    </div>
  </div>
));

export default function Home() {
  return (
    <DotBackground className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with subtitle */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            {/* Optional: Larger decorative element if desired, or remove for cleaner look */}
            {/* <div className="h-10 w-1.5 bg-blue-600 rounded-full"></div> */}
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">RESERSE AI</h1>
          </div>
          <div className="flex items-center justify-center gap-2">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Timeline Tools Reserse AI
            </p>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
        </div>

        {/* Main content area with cards */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* About Section Card */}
          <div className="lg:w-1/3">
            <AboutSection />
          </div>

          {/* Timeline content Card */}
          <div className="lg:w-2/3 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Timeline Pengembangan Reserse AI
            </h2>
            <Suspense fallback={<LoadingPlaceholder />}>
              <TimelineDemo />
            </Suspense>
          </div>
        </div>
      </div>
    </DotBackground>
  );
}
