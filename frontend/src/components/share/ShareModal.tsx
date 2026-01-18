import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Trash2, Link2, Lock, Calendar, Download, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { shareService, ShareLink, CreateShareLinkRequest } from '@/services/shareService';
import { Modal, Button, Input } from '@/components/ui';

interface ShareModalProps {
  fileId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ fileId, fileName, isOpen, onClose }: ShareModalProps) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [downloadLimit, setDownloadLimit] = useState<string>('');

  const { data: shareLinks = [], isLoading } = useQuery({
    queryKey: ['shareLinks', fileId],
    queryFn: () => shareService.getShareLinks(fileId),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateShareLinkRequest) => shareService.createShareLink(fileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shareLinks', fileId] });
      setShowCreateForm(false);
      setPassword('');
      setExpiresIn('never');
      setDownloadLimit('');
      toast.success('Share link created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create share link');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (linkId: string) => shareService.deleteShareLink(fileId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shareLinks', fileId] });
      toast.success('Share link deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete share link');
    },
  });

  const handleCreate = () => {
    const data: CreateShareLinkRequest = {};

    if (password) {
      data.password = password;
    }

    if (expiresIn !== 'never') {
      const now = new Date();
      switch (expiresIn) {
        case '1h':
          now.setHours(now.getHours() + 1);
          break;
        case '24h':
          now.setHours(now.getHours() + 24);
          break;
        case '7d':
          now.setDate(now.getDate() + 7);
          break;
        case '30d':
          now.setDate(now.getDate() + 30);
          break;
      }
      data.expiresAt = now;
    }

    if (downloadLimit) {
      data.downloadLimit = parseInt(downloadLimit, 10);
    }

    createMutation.mutate(data);
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${fileName}"`} size="lg">
      <div className="space-y-4">
        {/* Create new link section */}
        {!showCreateForm ? (
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateForm(true)}
          >
            Create Share Link
          </Button>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <h4 className="mb-3 font-medium text-slate-900 dark:text-white">New Share Link</h4>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
                  Password (optional)
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for no password"
                  leftIcon={<Lock className="h-4 w-4" />}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
                  Expires
                </label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="never">Never</option>
                  <option value="1h">1 hour</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
                  Download limit (optional)
                </label>
                <Input
                  type="number"
                  value={downloadLimit}
                  onChange={(e) => setDownloadLimit(e.target.value)}
                  placeholder="Unlimited"
                  min="1"
                  leftIcon={<Download className="h-4 w-4" />}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleCreate}
                  isLoading={createMutation.isPending}
                >
                  Create Link
                </Button>
                <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Existing links */}
        <div>
          <h4 className="mb-2 font-medium text-slate-900 dark:text-white">
            Active Links ({shareLinks.length})
          </h4>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : shareLinks.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No share links yet. Create one above.
            </p>
          ) : (
            <div className="space-y-2">
              {shareLinks.map((link) => (
                <ShareLinkItem
                  key={link.id}
                  link={link}
                  onCopy={copyToClipboard}
                  onDelete={(linkId) => deleteMutation.mutate(linkId)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface ShareLinkItemProps {
  link: ShareLink;
  onCopy: (url: string) => void;
  onDelete: (linkId: string) => void;
  formatDate: (dateStr: string) => string;
}

function ShareLinkItem({ link, onCopy, onDelete, formatDate }: ShareLinkItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-slate-400" />
          <span className="truncate text-sm font-mono text-slate-600 dark:text-slate-300">
            {link.url}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {link.hasPassword && (
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Password protected
            </span>
          )}
          {link.expiresAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Expires {formatDate(link.expiresAt)}
            </span>
          )}
          {link.downloadLimit > 0 && (
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {link.downloadCount}/{link.downloadLimit} downloads
            </span>
          )}
          {link.downloadLimit === 0 && (
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {link.downloadCount} downloads
            </span>
          )}
        </div>
      </div>
      <div className="ml-3 flex items-center gap-1">
        <button
          onClick={() => onCopy(link.url)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          title="Copy link"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(link.id)}
          className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Delete link"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
