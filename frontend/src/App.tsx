import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { authService } from '@/services/authService';
import { socketService } from '@/services/socketService';

// Layout
import { MainLayout } from '@/components/layout';
import { CreateBoxModal } from '@/components/boxes';

// Pages
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { HomePage } from '@/pages/HomePage';
import { BoxesPage } from '@/pages/BoxesPage';
import { BoxDetailPage } from '@/pages/BoxDetailPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StarredPage } from '@/pages/StarredPage';
import { RecentPage } from '@/pages/RecentPage';
import { TrashPage } from '@/pages/TrashPage';
import { AdminSettingsPage } from '@/pages/admin';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}


// Public route wrapper (redirects to home if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Placeholder pages (remaining ones)
function SharedPage() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shared with Me</h1>
      <p className="mt-2 text-slate-500">Coming soon</p>
    </div>
  );
}

function TagsPage() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tags</h1>
      <p className="mt-2 text-slate-500">Coming soon</p>
    </div>
  );
}

function HelpPage() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Help</h1>
      <p className="mt-2 text-slate-500">Coming soon</p>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
      <p className="mt-2 text-slate-500">Coming soon</p>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white">404</h1>
      <p className="mt-2 text-slate-500">Page not found</p>
    </div>
  );
}

// Smart settings route - shows admin settings for admins, user settings for normal users
function SmartSettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || (user as any)?.roles?.includes('admin');

  return isAdmin ? <AdminSettingsPage /> : <SettingsPage />;
}

export default function App() {
  const { isAuthenticated, setLoading, setUser, accessToken } = useAuthStore();
  const { createBoxModalOpen, setCreateBoxModalOpen } = useUIStore();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      if (accessToken) {
        try {
          const user = await authService.getProfile();
          setUser(user);
          socketService.connect();
        } catch (error) {
          // Token is invalid, will be handled by the interceptor
        }
      }
      setLoading(false);
    };

    initAuth();

    return () => {
      socketService.disconnect();
    };
  }, [accessToken, setLoading, setUser]);

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated]);

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/boxes" element={<BoxesPage />} />
          <Route path="/boxes/:boxId" element={<BoxDetailPage />} />
          <Route path="/boxes/:boxId/settings" element={<SettingsPage />} />
          <Route path="/shared" element={<SharedPage />} />
          <Route path="/starred" element={<StarredPage />} />
          <Route path="/recent" element={<RecentPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/settings" element={<SmartSettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Admin routes - redirect to /settings */}
        <Route path="/admin" element={<Navigate to="/settings" replace />} />
        <Route path="/admin/*" element={<Navigate to="/settings" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Global modals */}
      {isAuthenticated && (
        <>
          <CreateBoxModal
            isOpen={createBoxModalOpen}
            onClose={() => setCreateBoxModalOpen(false)}
            onCreated={() => {
              setCreateBoxModalOpen(false);
              // Refresh boxes list
            }}
          />
        </>
      )}
    </>
  );
}
