import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal, ModalFooter, Button, Input } from '@/components/ui';
import { tagService, Tag } from '@/services/tagService';
import { TagBadge } from './TagBadge';

interface TagManagerProps {
  boxId: string;
  isOpen: boolean;
  onClose: () => void;
}

const TAG_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function TagManager({ boxId, isOpen, onClose }: TagManagerProps) {
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags', boxId],
    queryFn: () => tagService.getTags(boxId),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      tagService.createTag(boxId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', boxId] });
      setNewTagName('');
      setNewTagColor(TAG_COLORS[0]);
      toast.success('Tag created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create tag');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ tagId, data }: { tagId: string; data: { name?: string; color?: string } }) =>
      tagService.updateTag(tagId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', boxId] });
      setEditingTag(null);
      toast.success('Tag updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update tag');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tagService.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', boxId] });
      toast.success('Tag deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete tag');
    },
  });

  const handleCreate = () => {
    if (!newTagName.trim()) return;
    createMutation.mutate({ name: newTagName.trim(), color: newTagColor });
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleSaveEdit = () => {
    if (!editingTag || !editName.trim()) return;
    updateMutation.mutate({
      tagId: editingTag.id,
      data: { name: editName.trim(), color: editColor },
    });
  };

  const handleDelete = (tagId: string) => {
    if (confirm('Delete this tag? It will be removed from all files.')) {
      deleteMutation.mutate(tagId);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Tags" size="md">
      <div className="space-y-4">
        {/* Create new tag */}
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">Create New Tag</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1"
            />
            <Button
              onClick={handleCreate}
              disabled={!newTagName.trim() || createMutation.isPending}
              isLoading={createMutation.isPending}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewTagColor(color)}
                className={`h-6 w-6 rounded-full transition-transform ${
                  newTagColor === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Existing tags */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
            Existing Tags ({tags.length})
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : tags.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No tags yet. Create one above!
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  {editingTag?.id === tag.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {TAG_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditColor(color)}
                            className={`h-5 w-5 rounded-full ${
                              editColor === color ? 'ring-2 ring-offset-1 ring-slate-400' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={handleSaveEdit}
                        className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingTag(null)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <TagBadge name={tag.name} color={tag.color} count={tag.count} />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(tag)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
