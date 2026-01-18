import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { User, Bell, Shield, Palette } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { Button, Input } from '@/components/ui';

type SettingsTab = 'profile' | 'notifications' | 'appearance' | 'security';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
];

export function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const handleSaveProfile = () => {
    // TODO: Implement profile update API
    toast.success('Profile updated successfully');
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Tabs */}
        <div className="lg:w-48">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-slate-900 dark:text-white">
                  Profile Information
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Update your personal information
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  disabled
                />
              </div>

              <Button onClick={handleSaveProfile}>Save Changes</Button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-slate-900 dark:text-white">
                  Notification Preferences
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose how you want to be notified
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Email notifications</p>
                    <p className="text-sm text-slate-500">Receive email updates about your files</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">File shared</p>
                    <p className="text-sm text-slate-500">Notify when someone shares a file with you</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Storage alerts</p>
                    <p className="text-sm text-slate-500">Get notified when storage is almost full</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-slate-900 dark:text-white">
                  Appearance
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Customize how Velox looks
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Theme
                </label>
                <div className="flex gap-3">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={clsx(
                        'rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors',
                        theme === t
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-slate-900 dark:text-white">
                  Security
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage your account security
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                  <h3 className="font-medium text-slate-900 dark:text-white">Change Password</h3>
                  <p className="mb-4 text-sm text-slate-500">
                    Update your password to keep your account secure
                  </p>
                  <div className="grid gap-4">
                    <Input
                      label="Current Password"
                      type="password"
                      placeholder="Enter current password"
                    />
                    <Input
                      label="New Password"
                      type="password"
                      placeholder="Enter new password"
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button className="mt-4">Update Password</Button>
                </div>

                <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                  <h3 className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication</h3>
                  <p className="mb-4 text-sm text-slate-500">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="secondary">Enable 2FA</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
