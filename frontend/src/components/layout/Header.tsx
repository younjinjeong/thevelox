import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  Moon,
  Sun,
  Upload,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useUIStore } from '@/stores/uiStore';
import { Button, Avatar, Dropdown, DropdownItem, DropdownDivider } from '@/components/ui';

export function Header() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { toggleSidebar, setUploadModalOpen } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search
    console.log('Search:', searchQuery);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <span className="text-lg font-bold text-white">V</span>
          </div>
          <span className="hidden text-xl font-semibold text-slate-900 dark:text-white sm:block">
            Velox
          </span>
        </Link>
      </div>

      {/* Center section - Search */}
      <form onSubmit={handleSearch} className="hidden flex-1 max-w-xl px-8 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search files, boxes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-800"
          />
        </div>
      </form>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Upload className="h-4 w-4" />}
          onClick={() => setUploadModalOpen(true)}
          className="hidden sm:inline-flex"
        >
          Upload
        </Button>

        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Avatar
                src={user?.photo}
                name={user?.displayName || user?.name || 'User'}
                size="sm"
              />
            </button>
          }
        >
          <div className="px-3 py-2">
            <p className="font-medium text-slate-900 dark:text-white">
              {user?.displayName || user?.name}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <DropdownDivider />
          <DropdownItem icon={<User className="h-4 w-4" />}>
            <Link to="/profile">Profile</Link>
          </DropdownItem>
          <DropdownItem icon={<Settings className="h-4 w-4" />}>
            <Link to="/settings">Settings</Link>
          </DropdownItem>
          <DropdownDivider />
          <DropdownItem icon={<LogOut className="h-4 w-4" />} onClick={handleLogout} danger>
            Sign out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
