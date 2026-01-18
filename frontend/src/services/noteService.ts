import api from './api';

export type NoteTheme = 'yellow' | 'green' | 'red' | 'blue' | 'purple';

export interface NotePosition {
  top: number;
  left: number;
}

export interface NoteAuthor {
  id: string;
  name: string;
  email?: string;
}

export interface Note {
  id: string;
  box: string;
  author: NoteAuthor;
  files: string[];
  isUnread: boolean;
  theme: NoteTheme;
  rotate: string;
  text: string;
  position: NotePosition;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteData {
  text: string;
  theme?: NoteTheme;
  rotate?: string;
  position?: NotePosition;
  files?: string[];
}

export interface UpdateNoteData {
  text?: string;
  theme?: NoteTheme;
  rotate?: string;
  position?: NotePosition;
  files?: string[];
}

export const noteService = {
  async getNotes(boxId: string): Promise<Note[]> {
    const response = await api.get<Note[]>(`/notes/box/${boxId}`);
    return response.data;
  },

  async getNote(noteId: string): Promise<Note> {
    const response = await api.get<Note>(`/notes/${noteId}`);
    return response.data;
  },

  async createNote(boxId: string, data: CreateNoteData): Promise<Note> {
    const response = await api.post<Note>(`/notes/box/${boxId}`, data);
    return response.data;
  },

  async updateNote(noteId: string, data: UpdateNoteData): Promise<Note> {
    const response = await api.put<Note>(`/notes/${noteId}`, data);
    return response.data;
  },

  async updateNotePosition(noteId: string, position: NotePosition): Promise<Note> {
    const response = await api.patch<Note>(`/notes/${noteId}/position`, { position });
    return response.data;
  },

  async deleteNote(noteId: string): Promise<void> {
    await api.delete(`/notes/${noteId}`);
  },

  async markAsRead(noteId: string): Promise<Note> {
    const response = await api.post<Note>(`/notes/${noteId}/read`);
    return response.data;
  },

  async markAllAsRead(boxId: string): Promise<{ updated: number }> {
    const response = await api.post<{ updated: number }>(`/notes/box/${boxId}/mark-all-read`);
    return response.data;
  },

  async getUnreadCount(boxId: string): Promise<number> {
    const response = await api.get<{ count: number }>(`/notes/box/${boxId}/unread-count`);
    return response.data.count;
  },
};
