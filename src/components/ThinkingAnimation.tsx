import { useEffect, useState } from 'react';

interface ThinkingAnimationProps {
  progress?: number;
  status?: 'preparing' | 'processing' | 'searching' | 'collecting' | 'finalizing' | 'complete';
}

const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({ progress: externalProgress, status }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [internalProgress, setInternalProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  // Gunakan progress dari props jika tersedia, jika tidak gunakan internal progress
  const progress = externalProgress !== undefined ? externalProgress : internalProgress;
  
  const steps: string[] = [
    'Mempersiapkan data',
    'Menganalisis informasi',
    'Melakukan pencarian Data di berbagai sumber',
    'Mengoleksi data',
    'Menyusun hasil',
  ];

  // Pemetaan status ke langkah
  const statusToStepIndex = {
    'preparing': 0,
    'processing': 1,
    'searching': 2,
    'collecting': 3,
    'finalizing': 4,
    'complete': 5
  };

  // Gunakan status dari props jika tersedia
  useEffect(() => {
    if (status) {
      const stepIndex = statusToStepIndex[status];
      if (stepIndex !== undefined && stepIndex < steps.length) {
        setCurrentStep(stepIndex);
      }
      
      if (status === 'complete') {
        setIsComplete(true);
        setInternalProgress(100);
      }
    }
  }, [status]);

  useEffect(() => {
    // Jika progress eksternal tersedia, jangan gunakan animasi internal
    if (externalProgress !== undefined) return;
    
    // Jika sudah selesai, jangan lanjutkan animasi
    if (isComplete) return;

    // Rotasi langkah-langkah jika tidak ada status eksternal
    const stepInterval = setInterval(() => {
      if (!status) {
        setCurrentStep((prev) => (prev + 1) % steps.length);
      }
    }, 2000);

    // Progress bar yang lebih realistis
    const progressInterval = setInterval(() => {
      setInternalProgress((prev) => {
        // Simulasi progress yang lebih realistis
        if (prev < 20) return prev + 0.5; // Awal cepat
        if (prev < 40) return prev + 0.3; // Melambat
        if (prev < 60) return prev + 0.2; // Lebih lambat
        if (prev < 80) return prev + 0.1; // Sangat lambat
        if (prev < 90) return prev + 0.05; // Hampir berhenti
        return prev; // Berhenti di 90% sampai selesai
      });
    }, 100);

    const handleAnalysisComplete = () => {
      setIsComplete(true);
      setInternalProgress(100);
    };

    window.addEventListener('analysisComplete', handleAnalysisComplete);
    
    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      window.removeEventListener('analysisComplete', handleAnalysisComplete);
    };
  }, [steps.length, externalProgress, status, isComplete]);

  // Tampilkan pesan berdasarkan progress
  const getMessage = () => {
    if (isComplete) return 'Analisis selesai';
    
    // Jika ada status, gunakan langkah yang sesuai
    if (status && status !== 'complete') {
      return `${steps[statusToStepIndex[status]]}...`;
    }
    
    // Jika tidak ada status, gunakan langkah saat ini
    return `${steps[currentStep]}...`;
  };

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
        {getMessage()}
      </p>
    </div>
  );
};

export default ThinkingAnimation;