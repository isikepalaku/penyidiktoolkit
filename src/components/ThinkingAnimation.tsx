import { useEffect, useState } from 'react';

const ThinkingAnimation: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const steps: string[] = [
    'Mempersiapkan data',
    'Menganalisis informasi',
    'Melakukan pencarian Data di berbagai sumber',
    'mengoleksi data',
    'Menyusun hasil',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);

    // Progress bar yang lebih lambat
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Perlambat progress mendekati 60%
        if (prev >= 60) return 60;
        return prev + 0.5;
      });
    }, 50);

    const handleAnalysisComplete = () => {
      setProgress(100);
    };

    window.addEventListener('analysisComplete', handleAnalysisComplete);
    
    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
      window.removeEventListener('analysisComplete', handleAnalysisComplete);
    };
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-[300px] relative">
        {/* Container hitam */}
        <div className="w-full h-4 bg-black rounded-none overflow-hidden">
          {/* Progress bar hijau dengan efek gradient */}
          <div 
            className="h-full bg-[#00FF00] transition-all duration-100 ease-linear relative"
            style={{ 
              width: `${progress}%`,
            }}
          >
            {/* Garis-garis animasi */}
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                background: `repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 10px,
                  rgba(0, 0, 0, 0.1) 10px,
                  rgba(0, 0, 0, 0.1) 20px
                )`,
                animation: 'moveStripes 1s linear infinite',
              }}
            />
          </div>
        </div>
        <style>
          {`
            @keyframes moveStripes {
              0% {
                background-position: 0 0;
              }
              100% {
                background-position: 50px 0;
              }
            }
          `}
        </style>
        <span className="absolute right-[-40px] top-0 text-sm text-gray-600">
          {Math.round(progress)}%
        </span>
      </div>
      <p className="text-sm text-gray-600 font-medium mt-6">
        {steps[currentStep]}...
      </p>
    </div>
  );
};

export default ThinkingAnimation;