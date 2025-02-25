import type { FC } from 'react';

export const AnimatedBotIcon: FC = () => {
  return (
    <div className="w-full h-full relative">
      <img 
        src="/logo.svg" 
        alt="Bot Logo" 
        className="w-full h-full object-contain animate-pulse"
      />
      <div className="absolute inset-0 animate-[ping_3s_ease-in-out_infinite] opacity-70" 
        style={{
          background: 'radial-gradient(circle, rgba(216,64,64,0.2) 0%, rgba(216,64,64,0) 70%)'
        }}
      />
    </div>
  );
};