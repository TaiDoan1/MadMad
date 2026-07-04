import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 p-4 sm:p-6 flex flex-col items-center justify-center font-mono">
          <div className="w-full max-w-2xl bg-white border-2 border-red-500 rounded-lg shadow-xl overflow-hidden">
            <div className="bg-red-500 text-white p-4">
              <h2 className="text-xl font-bold">🚨 Ứng dụng gặp lỗi (Crash Log)</h2>
              <p className="text-sm opacity-90 mt-1">Hệ thống đã ghi nhận lỗi. Hãy chụp màn hình này để gửi cho kỹ thuật viên.</p>
            </div>
            
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <h3 className="font-bold text-red-700 uppercase tracking-widest text-xs mb-1">Error Message:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm text-red-600 whitespace-pre-wrap break-all">
                  {this.state.error?.toString()}
                </pre>
              </div>
              
              <div>
                <h3 className="font-bold text-gray-700 uppercase tracking-widest text-xs mb-1">Component Stack:</h3>
                <pre className="bg-gray-100 p-3 rounded text-[10px] sm:text-xs text-gray-600 whitespace-pre-wrap break-all">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>

              <div>
                <h3 className="font-bold text-gray-700 uppercase tracking-widest text-xs mb-1">Call Stack:</h3>
                <pre className="bg-gray-100 p-3 rounded text-[10px] sm:text-xs text-gray-600 whitespace-pre-wrap break-all">
                  {this.state.error?.stack}
                </pre>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-black text-white px-4 py-3 rounded font-bold uppercase tracking-widest text-sm hover:bg-gray-800 w-full transition-colors"
              >
                Tải lại trang (Reload)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
