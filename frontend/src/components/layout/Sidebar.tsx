import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  Folder,
  Star,
  Clock,
  Trash2,
  Plus,
  Settings,
  HelpCircle,
  ChevronLeft,
  Share2,
  Tag,
  Shield,
  Users,
  Database,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed?: boolean;
}

function NavItem({ to, icon, label, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        )
      }
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed, setCreateBoxModalOpen } =
    useUIStore();

  const storageUsedPercent = user
    ? Math.round((user.storageUsed / user.storageQuota) * 100)
    : 0;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-900',
          'lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Collapse toggle */}
        <div className="hidden items-center justify-end p-2 lg:flex">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft
              className={clsx(
                'h-4 w-4 transition-transform',
                sidebarCollapsed && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" collapsed={sidebarCollapsed} />
          <NavItem
            to="/boxes"
            icon={<Folder className="h-5 w-5" />}
            label="My Boxes"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            to="/shared"
            icon={<Share2 className="h-5 w-5" />}
            label="Shared with me"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            to="/starred"
            icon={<Star className="h-5 w-5" />}
            label="Starred"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            to="/recent"
            icon={<Clock className="h-5 w-5" />}
            label="Recent"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            to="/tags"
            icon={<Tag className="h-5 w-5" />}
            label="Tags"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            to="/trash"
            icon={<Trash2 className="h-5 w-5" />}
            label="Trash"
            collapsed={sidebarCollapsed}
          />

          {/* Create Box Button */}
          <div className="pt-4">
            <Button
              variant="secondary"
              className={clsx('w-full', sidebarCollapsed && 'px-2')}
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setCreateBoxModalOpen(true)}
            >
              {!sidebarCollapsed && 'New Box'}
            </Button>
          </div>
        </nav>

        {/* Storage usage */}
        {!sidebarCollapsed && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Storage</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {storageUsedPercent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={clsx(
                  'h-full rounded-full transition-all',
                  storageUsedPercent > 90
                    ? 'bg-red-500'
                    : storageUsedPercent > 70
                    ? 'bg-yellow-500'
                    : 'bg-primary-500'
                )}
                style={{ width: `${storageUsedPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {user ? `${formatBytes(user.storageUsed)} of ${formatBytes(user.storageQuota)}` : '0 B'}
            </p>
          </div>
        )}

        {/* Admin section */}
        {user?.role === 'admin' && (
          <div className="border-t border-slate-200 p-3 dark:border-slate-700">
            {!sidebarCollapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase text-slate-400">
                Admin
              </p>
            )}
            <NavItem
              to="/admin"
              icon={<Shield className="h-5 w-5" />}
              label="Dashboard"
              collapsed={sidebarCollapsed}
            />
            <NavItem
              to="/admin/storage"
              icon={<Database className="h-5 w-5" />}
              label="Storage"
              collapsed={sidebarCollapsed}
            />
            <NavItem
              to="/admin/users"
              icon={<Users className="h-5 w-5" />}
              label="Users"
              collapsed={sidebarCollapsed}
            />
          </div>
        )}

        {/* Bottom links */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-700">
          <NavItem
            to="/settings"
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            to="/help"
            icon={<HelpCircle className="h-5 w-5" />}
            label="Help"
            collapsed={sidebarCollapsed}
          />
        </div>
      </aside>
    </>
  );
}
