import React from 'react';
import { Check } from 'lucide-react';

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  isSearching: boolean;
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ steps, currentStep, isSearching }) => {
  return (
    <div className="w-full relative overflow-hidden py-4">
      {/* Container untuk Progress Bar */}
      <div className="absolute top-[2.25rem] left-0 right-0 h-[2px] bg-gray-200">
        <div 
          className="h-full bg-blue-500 transition-all duration-500 ease-in-out"
          style={{ 
            width: `${(currentStep / (steps.length - 1)) * 100}%`,
          }}
        />
      </div>

      {/* Steps Container */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep >= index;
          const isCurrentStep = currentStep === index;

          return (
            <div 
              key={index} 
              className="flex flex-col items-center"
              style={{ flex: '1' }}
            >
              {/* Circle */}
              <div
                className={`
                  w-10 h-10 rounded-full border-2 flex items-center justify-center
                  transition-all duration-300 ease-in-out mb-2
                  ${isActive 
                    ? 'border-blue-500 bg-blue-500 text-white' 
                    : 'border-gray-300 bg-white text-gray-400'}
                  ${isCurrentStep && isSearching ? 'animate-pulse' : ''}
                `}
              >
                {isActive && !isCurrentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Label */}
              <span 
                className={`
                  text-xs text-center transition-colors duration-300
                  ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}
                `}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressSteps;