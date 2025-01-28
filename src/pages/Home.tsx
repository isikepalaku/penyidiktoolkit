import React from 'react';
import { DotBackground } from '@/components/ui/DotBackground';

export default function Home() {
  return (
    <DotBackground className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Home</h1>
          </div>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 ml-11 mb-8">
            Selamat datang di Reserse AI Multi Agent
          </p>
        </div>

        {/* Content will be added here */}
        <div className="mt-8">
          {/* Your components will go here */}
        </div>
      </div>
    </DotBackground>
  );
}
