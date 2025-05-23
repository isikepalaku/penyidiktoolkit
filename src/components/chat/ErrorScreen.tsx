import React from 'react';
import { ArrowLeft, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorScreenProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onRetry?: () => void;
  onReset?: () => void;
}

/**
 * Reusable error screen component untuk chat interfaces
 * Menampilkan error state dengan options untuk retry dan reset
 */
export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  title,
  subtitle,
  onBack,
  onRetry,
  onReset
}) => {
  return (
    <div className="fixed inset-0 z-20 bg-white lg:pl-64 flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="font-semibold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-700 mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-700 mb-4">
            Mohon maaf, terjadi kesalahan dalam sistem chat. Ini mungkin karena masalah server atau koneksi.
          </p>
          <div className="flex justify-center gap-3">
            {onRetry && (
              <Button onClick={onRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </Button>
            )}
            {onReset && (
              <Button variant="outline" onClick={onReset}>
                Mulai Baru
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 