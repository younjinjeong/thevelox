import { useQuery } from '@tanstack/react-query';
import { Users, Database, HardDrive, Activity } from 'lucide-react';
import { adminService } from '@/services/adminService';

export function AdminDashboardPage() {
  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminService.getUsers(1, 1),
  });

  const { data: storageSettings } = useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: () => adminService.getStorageSettings(),
  });

  const stats = [
    {
      label: 'Total Users',
      value: usersData?.total ?? '-',
      icon: Users,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    },
    {
      label: 'Storage Provider',
      value: storageSettings?.provider?.toUpperCase() ?? '-',
      icon: Database,
      color: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    },
    {
      label: 'Active',
      value: 'Online',
      icon: Activity,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          System overview and quick actions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/admin/storage"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
          >
            <HardDrive className="h-5 w-5 text-slate-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Configure Storage
            </span>
          </a>
          <a
            href="/admin/users"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
          >
            <Users className="h-5 w-5 text-slate-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Manage Users
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
