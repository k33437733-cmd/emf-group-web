import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ ErrorBoundary caught:', error.message, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '40px 20px', gap: '12px', minHeight: '200px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444',
          }}>
            <AlertTriangle size={22} />
          </div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            حدث خطأ غير متوقع
          </h3>
          <p style={{ fontSize: '0.78rem', textAlign: 'center', maxWidth: '360px', margin: 0 }}>
            {this.state.error?.message || 'تعذر تحميل هذا القسم. حاول مرة أخرى.'}
          </p>
          <button onClick={this.handleRetry}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px',
              borderRadius: '8px', border: 'none', background: 'var(--color-primary)',
              color: '#050816', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              fontFamily: 'inherit', marginTop: '4px',
            }}>
            <RefreshCw size={14} />
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
