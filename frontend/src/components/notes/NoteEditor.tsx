import { useState } from 'react';
import { Modal, ModalFooter, Button } from '@/components/ui';
import type { NoteTheme } from '@/services/noteService';

interface NoteEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { text: string; theme: NoteTheme }) => void;
  isLoading?: boolean;
}

const THEMES: { value: NoteTheme; label: string; bgClass: string }[] = [
  { value: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-200' },
  { value: 'green', label: 'Green', bgClass: 'bg-green-200' },
  { value: 'blue', label: 'Blue', bgClass: 'bg-blue-200' },
  { value: 'red', label: 'Red', bgClass: 'bg-red-200' },
  { value: 'purple', label: 'Purple', bgClass: 'bg-purple-200' },
];

export function NoteEditor({ isOpen, onClose, onSubmit, isLoading }: NoteEditorProps) {
  const [text, setText] = useState('');
  const [theme, setTheme] = useState<NoteTheme>('yellow');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({ text: text.trim(), theme });
    setText('');
    setTheme('yellow');
  };

  const handleClose = () => {
    setText('');
    setTheme('yellow');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Note" size="md">
      <div className="space-y-4">
        {/* Theme selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Color
          </label>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`h-8 w-8 rounded-lg transition-transform ${t.bgClass} ${
                  theme === t.value ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : ''
                }`}
                title={t.label}
              />
            ))}
          </div>
        </div>

        {/* Note content */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Note
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your note here..."
            rows={5}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:placeholder:text-slate-500"
            autoFocus
          />
        </div>

        {/* Preview */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Preview
          </label>
          <div
            className={`rounded-lg border-2 p-3 ${
              THEMES.find((t) => t.value === theme)?.bgClass || 'bg-yellow-200'
            } border-slate-300`}
          >
            <p className="min-h-[40px] whitespace-pre-wrap text-sm text-slate-700">
              {text || 'Your note will appear here...'}
            </p>
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} isLoading={isLoading} disabled={!text.trim()}>
          Create Note
        </Button>
      </ModalFooter>
    </Modal>
  );
}
