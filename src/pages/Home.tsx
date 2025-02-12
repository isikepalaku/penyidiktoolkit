import { lazy, Suspense } from 'react';
import { DotBackground } from '@/components/ui/DotBackground';
import { CheckCircle2 } from 'lucide-react';

// Lazy load TimelineDemo dengan preload
const TimelineDemo = lazy(() => {
  // Preload component saat idle
  const preloadTimelineDemo = () => import('@/components/ui/timeline.demo');
  window.requestIdleCallback?.(preloadTimelineDemo);
  return preloadTimelineDemo();
});

// Simplified loading placeholder
const LoadingPlaceholder = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
  </div>
);

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
