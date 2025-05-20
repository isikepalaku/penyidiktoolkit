import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("TIPIDTER ERROR BOUNDARY: Uncaught error:", error);
    console.error("TIPIDTER ERROR BOUNDARY: Error info:", errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Terjadi Kesalahan</h2>
            <p className="text-gray-700 mb-4">
              Aplikasi mengalami error. Silakan refresh halaman atau coba kembali nanti.
            </p>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-48 mb-4">
              {this.state.error?.message}
            </pre>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh Halaman
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Kembali ke Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 