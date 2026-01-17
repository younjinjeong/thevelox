import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/stores/uiStore';
import { clsx } from 'clsx';

export function MainLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={clsx(
            'flex-1 overflow-auto bg-slate-50 p-6 transition-all dark:bg-slate-900',
            sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
