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
import {
  AdminLayout,
  AdminDashboardPage,
  AdminStoragePage,
  AdminUsersPage,
} from '@/pages/admin';

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

// Admin route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
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

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
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

// Placeholder pages
function StarredPage() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Starred Files</h1>
      <p className="mt-2 text-slate-500">Coming soon</p>
    </div>
  );
}

function RecentPage() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recent Files</h1>
      <p className="mt-2 text-slate-500">Coming soon</p>
    </div>
  );
}

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

function TrashPage() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Trash</h1>
      <p className="mt-2 text-slate-500">Coming soon</p>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
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
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Admin routes */}
        <Route
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/storage" element={<AdminStoragePage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Route>

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
