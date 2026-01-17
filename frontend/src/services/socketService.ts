import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import type { SocketEvent } from '@/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private currentBoxId: string | null = null;

  connect(): void {
    if (this.socket?.connected) return;

    const token = useAuthStore.getState().accessToken;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      if (this.currentBoxId) {
        this.joinBox(this.currentBoxId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Listen for events
    this.socket.on('event', (event: SocketEvent) => {
      this.emit(event.type, event.data);
    });

    // User presence events
    this.socket.on('user_joined', (data) => {
      this.emit('user_joined', data);
    });

    this.socket.on('user_left', (data) => {
      this.emit('user_left', data);
    });

    this.socket.on('users_in_box', (data) => {
      this.emit('users_in_box', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.currentBoxId = null;
  }

  joinBox(boxId: string): void {
    if (this.currentBoxId === boxId) return;

    if (this.currentBoxId) {
      this.leaveBox(this.currentBoxId);
    }

    this.currentBoxId = boxId;
    this.socket?.emit('join', { boxId });
  }

  leaveBox(boxId: string): void {
    this.socket?.emit('leave', { boxId });
    if (this.currentBoxId === boxId) {
      this.currentBoxId = null;
    }
  }

  sendMessage(type: string, data: unknown): void {
    this.socket?.emit('message', { type, data, boxId: this.currentBoxId });
  }

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event: string, callback: (data: unknown) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Socket event handler error:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getCurrentBoxId(): string | null {
    return this.currentBoxId;
  }
}

export const socketService = new SocketService();
