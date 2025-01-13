import React from 'react';

const ThinkingAnimation = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex items-center gap-1 mb-2">
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></div>
      </div>
      <p className="text-sm text-gray-500">
        Sedang menganalisis data Anda...
      </p>
    </div>
  );
};

export default ThinkingAnimation;