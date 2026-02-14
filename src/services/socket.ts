// src/services/socket.ts
// Real-time WebSocket connection for collaborative sessions via socket.io-client

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Get or create the singleton Socket.IO connection for the /session namespace.
 * Authenticates via JWT token from the auth store.
 */
export function getSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().getAccessToken();

  socket = io(`${API_BASE_URL}/session`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to /session namespace');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socket;
}

/**
 * Disconnect the socket entirely. Call on logout or when leaving all sessions.
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Reconnect with a fresh token (e.g. after token refresh).
 */
export function reconnectSocket() {
  disconnectSocket();
  return getSocket();
}

// =========================================================================
// Session room helpers
// =========================================================================

/**
 * Join a session room. Returns a promise that resolves with online members.
 */
export function joinSessionRoom(
  conversationId: string,
): Promise<{
  conversationId: string;
  onlineMembers: Array<{ userId: string; displayName: string }>;
}> {
  const s = getSocket();
  return new Promise((resolve, reject) => {
    s.emit('session:join', { conversationId }, (response: any) => {
      if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response?.data || { conversationId, onlineMembers: [] });
      }
    });
    // Fallback timeout
    setTimeout(() => resolve({ conversationId, onlineMembers: [] }), 5000);
  });
}

/**
 * Leave a session room.
 */
export function leaveSessionRoom(conversationId: string) {
  const s = getSocket();
  s.emit('session:leave', { conversationId });
}

/**
 * Emit typing start event.
 */
export function emitTypingStart(conversationId: string) {
  const s = getSocket();
  s.emit('session:typing-start', { conversationId });
}

/**
 * Emit typing stop event.
 */
export function emitTypingStop(conversationId: string) {
  const s = getSocket();
  s.emit('session:typing-stop', { conversationId });
}

/**
 * Emit cursor/scroll position on PDF.
 */
export function emitCursorMove(
  conversationId: string,
  pageNumber: number,
  scrollPosition: number,
) {
  const s = getSocket();
  s.emit('session:cursor-move', { conversationId, pageNumber, scrollPosition });
}
