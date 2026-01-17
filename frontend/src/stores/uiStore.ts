import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode, SortField, SortOrder } from '@/types';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // View settings
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  showHiddenFiles: boolean;

  // Selection
  selectedFiles: Set<string>;
  lastSelectedFile: string | null;

  // Modals
  uploadModalOpen: boolean;
  createBoxModalOpen: boolean;
  shareModalOpen: boolean;
  deleteConfirmOpen: boolean;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleSortOrder: () => void;
  setShowHiddenFiles: (show: boolean) => void;

  // Selection actions
  selectFile: (fileId: string, multi?: boolean) => void;
  selectFiles: (fileIds: string[]) => void;
  deselectFile: (fileId: string) => void;
  clearSelection: () => void;
  selectAll: (fileIds: string[]) => void;

  // Modal actions
  setUploadModalOpen: (open: boolean) => void;
  setCreateBoxModalOpen: (open: boolean) => void;
  setShareModalOpen: (open: boolean) => void;
  setDeleteConfirmOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      sidebarCollapsed: false,
      viewMode: 'grid',
      sortField: 'name',
      sortOrder: 'asc',
      showHiddenFiles: false,
      selectedFiles: new Set(),
      lastSelectedFile: null,
      uploadModalOpen: false,
      createBoxModalOpen: false,
      shareModalOpen: false,
      deleteConfirmOpen: false,

      // Sidebar actions
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      // View actions
      setViewMode: (viewMode) => set({ viewMode }),
      setSortField: (sortField) => set({ sortField }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      toggleSortOrder: () =>
        set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' })),
      setShowHiddenFiles: (showHiddenFiles) => set({ showHiddenFiles }),

      // Selection actions
      selectFile: (fileId, multi = false) => {
        const { selectedFiles } = get();
        const newSelected = new Set(multi ? selectedFiles : []);

        if (newSelected.has(fileId)) {
          newSelected.delete(fileId);
        } else {
          newSelected.add(fileId);
        }

        set({ selectedFiles: newSelected, lastSelectedFile: fileId });
      },

      selectFiles: (fileIds) => {
        set({ selectedFiles: new Set(fileIds), lastSelectedFile: fileIds[fileIds.length - 1] || null });
      },

      deselectFile: (fileId) => {
        const { selectedFiles } = get();
        const newSelected = new Set(selectedFiles);
        newSelected.delete(fileId);
        set({ selectedFiles: newSelected });
      },

      clearSelection: () => set({ selectedFiles: new Set(), lastSelectedFile: null }),

      selectAll: (fileIds) => set({ selectedFiles: new Set(fileIds) }),

      // Modal actions
      setUploadModalOpen: (uploadModalOpen) => set({ uploadModalOpen }),
      setCreateBoxModalOpen: (createBoxModalOpen) => set({ createBoxModalOpen }),
      setShareModalOpen: (shareModalOpen) => set({ shareModalOpen }),
      setDeleteConfirmOpen: (deleteConfirmOpen) => set({ deleteConfirmOpen }),
    }),
    {
      name: 'velox-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        viewMode: state.viewMode,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
        showHiddenFiles: state.showHiddenFiles,
      }),
    }
  )
);
