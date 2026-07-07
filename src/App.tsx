import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Navbar from './components/layout/Navbar';
import UpdateSystem from './components/ui/UpdateSystem';
import { ToastContainer } from './components/ui/Toast';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Content = lazy(() => import('./pages/Content'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const SupportChatPage = lazy(() => import('./pages/SupportChatPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
      جاري التحميل...
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <a href="#app-content" className="skip-to-content">تخطى إلى المحتوى الرئيسي</a>
        <ErrorBoundary>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
          <UpdateSystem 
            config={{
              checkInterval: 5,
              showDelayedBanner: true,
              autoReloadOnCritical: true,
              notifyUserOnMinor: true,
              enableServiceWorker: true
            }}
          />
          {/* Header Navbar */}
          <Navbar />
          
          {/* Main content body wrapper */}
          <div id="app-content" style={{ flexGrow: 1 }}>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/content" element={<ProtectedRoute><Content /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                <Route path="/support" element={<ProtectedRoute><SupportChatPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
          
          {/* Toast notifications container */}
          <ToastContainer />
        </div>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}
