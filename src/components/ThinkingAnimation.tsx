import { useEffect, useState } from 'react';
import { LifeLine } from 'react-loading-indicators';

const ThinkingAnimation: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const steps: string[] = [
    'Mempersiapkan data',
    'Menganalisis informasi',
    'Menyusun hasil',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="scale-150"> {/* Scale up the loader for better visibility */}
        <LifeLine 
          color={[
            "#2563EB", // blue-600 (primary blue)
            "#33CC36", // vibrant green
            "#B8CC33", // lime yellow
            "#FCCA00"  // golden yellow
          ]}
          size="large"
          text=""
          speedPlus={0}
          style={{ background: 'transparent' }}
        />
      </div>
      <p className="text-sm text-gray-600 font-medium mt-6">
        {steps[currentStep]}...
      </p>
    </div>
  );
};

export default ThinkingAnimation;