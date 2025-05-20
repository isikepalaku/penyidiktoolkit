import { useEffect, useState, useRef } from 'react';

export function SplashScreen() {
  const [isLogoVisible, setIsLogoVisible] = useState(false);
  const [isTextVisible, setIsTextVisible] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    // Flag untuk mengecek apakah komponen masih terpasang
    isMounted.current = true;
    
    console.log("TIPIDTER SPLASH: Splash screen mounted");
    
    // Animasi logo muncul terlebih dahulu
    const logoTimer = setTimeout(() => {
      if (isMounted.current) {
        setIsLogoVisible(true);
      }
    }, 300);

    // Kemudian animasi teks muncul
    const textTimer = setTimeout(() => {
      if (isMounted.current) {
        setIsTextVisible(true);
      }
    }, 800);

    return () => {
      // Batalkan semua timer dan tandai komponen sebagai unmounted
      isMounted.current = false;
      console.log("TIPIDTER SPLASH: Splash screen unmounting, clearing timers");
      clearTimeout(logoTimer);
      clearTimeout(textTimer);
    };
  }, []);

  console.log("TIPIDTER SPLASH: Rendering splash screen");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center space-y-6">
        <div 
          className={`transform transition-all duration-700 ${isLogoVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        >
          <img 
            src="/img/reserse.png" 
            alt="Reserse AI" 
            className="w-40 h-40 animate-pulse"
            onError={(e) => console.error("TIPIDTER SPLASH: Logo failed to load", e)}
          />
        </div>
        
        <div className={`flex flex-col items-center space-y-2 transition-all duration-700 ${isTextVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h1 className="text-3xl font-bold text-blue-600">
            Penyidik Toolkit
          </h1>
          <p className="text-sm text-gray-500">
            by Reserse Ai
          </p>
          <div className="flex space-x-1 mt-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
} 