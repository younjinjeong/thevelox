import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal, ModalFooter, Button } from '@/components/ui';
import { boxService } from '@/services/boxService';
import type { Box } from '@/types';

interface DeleteBoxModalProps {
  box: Box;
  fileCount: number;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

const CONFIRMATION_TEXT = 'delete all';

export function DeleteBoxModal({ box, fileCount, isOpen, onClose, onDeleted }: DeleteBoxModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText.toLowerCase() === CONFIRMATION_TEXT;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      await boxService.deleteBox(box.id);
      toast.success(`Box "${box.name}" has been permanently deleted`);
      onDeleted();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete box');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Box" size="md">
      <div className="space-y-4">
        {/* Warning icon and message */}
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-500" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              This action cannot be undone
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              You are about to permanently delete the box <strong>"{box.name}"</strong>
              {fileCount > 0 && (
                <> and all <strong>{fileCount} file{fileCount !== 1 ? 's' : ''}</strong> inside it</>
              )}.
              This will remove all data associated with this box from the system.
            </p>
          </div>
        </div>

        {/* Box info */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Box Name</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{box.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Files</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{fileCount}</dd>
            </div>
            {box.description && (
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Description</dt>
                <dd className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                  {box.description}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Confirmation input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            To confirm deletion, type <span className="font-mono text-red-600 dark:text-red-400">"{CONFIRMATION_TEXT}"</span> below:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRMATION_TEXT}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-red-500"
            disabled={isDeleting}
          />
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={!isConfirmed || isDeleting}
          isLoading={isDeleting}
        >
          Delete Box Permanently
        </Button>
      </ModalFooter>
    </Modal>
  );
}
