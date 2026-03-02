import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { ReportListPage } from './pages/ReportListPage';
import { ReportNewPage } from './pages/ReportNewPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { ReportReviewPage } from './pages/ReportReviewPage';
import { ReportHirmPage } from './pages/ReportHirmPage';
import { ReportActionsPage } from './pages/ReportActionsPage';
import { DashboardPage } from './pages/DashboardPage';
import { Layout } from './components/Layout';

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <span style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</span>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="reports" element={<ReportListPage />} />
        <Route path="reports/new" element={<ReportNewPage />} />
        <Route path="reports/:id/review" element={<ReportReviewPage />} />
        <Route path="reports/:id/hirm" element={<ReportHirmPage />} />
        <Route path="reports/:id/actions" element={<ReportActionsPage />} />
        <Route path="reports/:id" element={<ReportDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
