import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { noteService, NoteTheme } from '@/services/noteService';
import { Note } from './Note';
import { NoteEditor } from './NoteEditor';
import { useAuthStore } from '@/stores/authStore';
import { Modal } from '@/components/ui';

interface NoteCanvasProps {
  boxId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function NoteCanvas({ boxId, isOpen, onClose }: NoteCanvasProps) {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { user } = useAuthStore();
  const userId = user?.id;

  // Fetch box to get owner info
  const { data: box } = useQuery({
    queryKey: ['box', boxId],
    enabled: isOpen,
  });

  const boxOwnerId = (box as any)?.owner || '';

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', boxId],
    queryFn: () => noteService.getNotes(boxId),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: { text: string; theme: NoteTheme }) => {
      // Place new notes at a random position
      const canvas = canvasRef.current;
      const maxLeft = canvas ? canvas.clientWidth - 250 : 200;
      const maxTop = canvas ? canvas.clientHeight - 200 : 100;
      return noteService.createNote(boxId, {
        ...data,
        position: {
          top: Math.random() * Math.max(50, maxTop),
          left: Math.random() * Math.max(50, maxLeft),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', boxId] });
      setIsEditorOpen(false);
      toast.success('Note created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create note');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: { text?: string; theme?: NoteTheme } }) =>
      noteService.updateNote(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', boxId] });
      toast.success('Note updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update note');
    },
  });

  const positionMutation = useMutation({
    mutationFn: ({ noteId, position }: { noteId: string; position: { top: number; left: number } }) =>
      noteService.updateNotePosition(noteId, position),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', boxId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: noteService.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', boxId] });
      toast.success('Note deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete note');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: noteService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', boxId] });
    },
  });

  const handleUpdate = (noteId: string, data: { text?: string; theme?: NoteTheme }) => {
    updateMutation.mutate({ noteId, data });
  };

  const handleDelete = (noteId: string) => {
    if (confirm('Delete this note?')) {
      deleteMutation.mutate(noteId);
    }
  };

  const handlePositionChange = (noteId: string, position: { top: number; left: number }) => {
    positionMutation.mutate({ noteId, position });
  };

  const handleMarkAsRead = (noteId: string) => {
    markAsReadMutation.mutate(noteId);
  };

  const unreadCount = notes.filter((n) => n.isUnread).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notes" size="xl">
      <div className="space-y-4">
        {/* Header with stats and add button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">
                {unreadCount} unread
              </span>
            )}
          </div>
          <button
            onClick={() => setIsEditorOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Add Note
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative min-h-[400px] rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/50"
          style={{ maxHeight: '60vh', overflow: 'auto' }}
        >
          {notes.length === 0 ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">No notes yet</p>
              <button
                onClick={() => setIsEditorOpen(true)}
                className="mt-2 text-sm text-primary-500 hover:underline"
              >
                Create your first note
              </button>
            </div>
          ) : (
            <div className="relative min-h-[300px]">
              {notes.map((note) => (
                <Note
                  key={note.id}
                  note={note}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onPositionChange={handlePositionChange}
                  onMarkAsRead={handleMarkAsRead}
                  isAuthor={note.author.id === userId}
                  canDelete={note.author.id === userId || boxOwnerId === userId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      <NoteEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </Modal>
  );
}
