import { useState } from 'react';
import { Folder } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';
import { Modal, ModalFooter, Button, Input } from '@/components/ui';
import { boxService } from '@/services/boxService';

interface CreateBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const boxColors = [
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'green', class: 'bg-green-500' },
  { name: 'yellow', class: 'bg-yellow-500' },
  { name: 'red', class: 'bg-red-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'pink', class: 'bg-pink-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'teal', class: 'bg-teal-500' },
];

export function CreateBoxModal({ isOpen, onClose, onCreated }: CreateBoxModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Box name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await boxService.createBox({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      toast.success('Box created successfully');
      onCreated();
      handleClose();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create box';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setColor('blue');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Box" size="md">
      <form onSubmit={handleSubmit}>
        {/* Preview */}
        <div className="mb-6 flex items-center gap-4">
          <div
            className={clsx(
              'flex h-16 w-16 items-center justify-center rounded-xl transition-colors',
              boxColors.find((c) => c.name === color)?.class || 'bg-blue-500'
            )}
          >
            <Folder className="h-8 w-8 text-white" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              {name || 'New Box'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {description || 'No description'}
            </p>
          </div>
        </div>

        {/* Color picker */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Color
          </label>
          <div className="flex gap-2">
            {boxColors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                className={clsx(
                  'h-8 w-8 rounded-full transition-transform',
                  c.class,
                  color === c.name && 'scale-110 ring-2 ring-offset-2 ring-slate-400'
                )}
              />
            ))}
          </div>
        </div>

        {/* Name input */}
        <div className="mb-4">
          <Input
            label="Name"
            placeholder="My Box"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            error={error}
            autoFocus
          />
        </div>

        {/* Description input */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Description (optional)
          </label>
          <textarea
            placeholder="Describe what this box is for..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500"
          />
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Box
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
