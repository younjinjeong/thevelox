import { NavLink, Outlet } from 'react-router-dom';
import { Settings, Users, LayoutDashboard, Database } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/storage', icon: Database, label: 'Storage' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AdminLayout() {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="p-4">
          <div className="flex items-center gap-2 px-2 py-2">
            <Settings className="h-5 w-5 text-primary-600" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Admin Panel
            </h1>
          </div>
        </div>

        <nav className="px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-white'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
