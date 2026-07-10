import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './context/I18nContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';
import DashboardLayout from './components/layout/DashboardLayout';
import UpdateSystem from './components/ui/UpdateSystem';
import { ToastContainer } from './components/ui/Toast';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Content = lazy(() => import('./pages/Content'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const SupportChatPage = lazy(() => import('./pages/SupportChatPage'));
const Projects = lazy(() => import('./pages/Projects'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const ReleaseNotes = lazy(() => import('./pages/ReleaseNotes'));

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
      <ThemeProvider>
        <I18nProvider>
          <Router>
            <ErrorBoundary>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
              <UpdateSystem 
                config={{
                  checkInterval: 5,
                  enableServiceWorker: false
                }}
              />
              
              <div id="app-content" style={{ flexGrow: 1 }}>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/content" element={<Content />} />
                      <Route path="/chat" element={<ChatPage />} />
                      <Route path="/support" element={<SupportChatPage />} />
                      <Route path="/projects" element={<Projects />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/admin/release-notes" element={<ReleaseNotes />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </div>
              
              <ToastContainer />
            </div>
            </ErrorBoundary>
          </Router>
        </I18nProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
