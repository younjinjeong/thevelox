import { useState } from 'react';
import { Database, Users, LayoutDashboard } from 'lucide-react';
import { clsx } from 'clsx';

// Import admin sub-pages content
import { AdminStoragePage } from './AdminStoragePage';
import { AdminUsersPage } from './AdminUsersPage';
import { AdminDashboardPage } from './AdminDashboardPage';

type AdminTab = 'dashboard' | 'storage' | 'users';

const tabs: { id: AdminTab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    description: 'System overview and statistics'
  },
  {
    id: 'storage',
    label: 'Storage',
    icon: <Database className="h-4 w-4" />,
    description: 'Configure storage providers'
  },
  {
    id: 'users',
    label: 'Users',
    icon: <Users className="h-4 w-4" />,
    description: 'Manage user accounts'
  },
];

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage system configuration, storage, and users
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Tabs */}
        <div className="lg:w-56 shrink-0">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                )}
              >
                {tab.icon}
                <div className="hidden lg:block">
                  <div>{tab.label}</div>
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-500">
                    {tab.description}
                  </div>
                </div>
                <span className="lg:hidden">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'dashboard' && <AdminDashboardPage />}
          {activeTab === 'storage' && <AdminStoragePage />}
          {activeTab === 'users' && <AdminUsersPage />}
        </div>
      </div>
    </div>
  );
}
