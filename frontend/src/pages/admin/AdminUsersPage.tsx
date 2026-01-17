import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Search,
  MoreVertical,
  Shield,
  ShieldOff,
  Key,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { adminService, AdminUser } from '@/services/adminService';
import { Button, Input, Modal, ModalFooter, Dropdown, DropdownItem, DropdownDivider } from '@/components/ui';

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, statusFilter],
    queryFn: () => adminService.getUsers(page, limit, search || undefined, statusFilter),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      enable ? adminService.enableUser(id) : adminService.disableUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User status updated');
    },
    onError: () => toast.error('Failed to update user status'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      adminService.resetUserPassword(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Password reset successfully');
      setResetPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUser(null);
    },
    onError: () => toast.error('Failed to reset password'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User deleted');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const handleResetPassword = () => {
    if (!selectedUser) return;
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    resetPasswordMutation.mutate({ id: selectedUser._id, password: newPassword });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            User Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage user accounts, reset passwords, and control access
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          value={statusFilter ?? ''}
          onChange={(e) => {
            setStatusFilter(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All Status</option>
          <option value="1">Active</option>
          <option value="2">Disabled</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Roles
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Storage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                          user.status === 1
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        )}
                      >
                        {user.status === 1 ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.map((role) => (
                          <span
                            key={role}
                            className={clsx(
                              'inline-flex rounded px-1.5 py-0.5 text-xs font-medium',
                              role === 'admin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            )}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {formatBytes(user.usedSize)} / {formatBytes(user.availableSize)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {user.createDate && format(new Date(user.createDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Dropdown
                        trigger={
                          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        }
                      >
                        <DropdownItem
                          icon={<Key className="h-4 w-4" />}
                          onClick={() => {
                            setSelectedUser(user);
                            setResetPasswordModalOpen(true);
                          }}
                        >
                          Reset Password
                        </DropdownItem>
                        <DropdownItem
                          icon={
                            user.status === 1 ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )
                          }
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: user._id,
                              enable: user.status !== 1,
                            })
                          }
                        >
                          {user.status === 1 ? 'Disable' : 'Enable'}
                        </DropdownItem>
                        <DropdownDivider />
                        <DropdownItem
                          icon={<Trash2 className="h-4 w-4" />}
                          danger
                          onClick={() => {
                            if (confirm('Are you sure you want to permanently delete this user?')) {
                              deleteMutation.mutate(user._id);
                            }
                          }}
                        >
                          Delete
                        </DropdownItem>
                      </Dropdown>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data?.total || 0)} of{' '}
              {data?.total || 0} users
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetPasswordModalOpen}
        onClose={() => {
          setResetPasswordModalOpen(false);
          setNewPassword('');
          setConfirmPassword('');
          setSelectedUser(null);
        }}
        title={`Reset Password: ${selectedUser?.name}`}
      >
        <div className="space-y-4">
          <Input
            type="password"
            label="New Password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setResetPasswordModalOpen(false);
              setNewPassword('');
              setConfirmPassword('');
              setSelectedUser(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleResetPassword} isLoading={resetPasswordMutation.isPending}>
            Reset Password
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
