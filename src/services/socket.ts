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
 *
 * IMPORTANT: We check `socket` existence, NOT `socket.connected`.
 * Socket.IO auto-reconnects; creating a new socket while the old one
 * is still connecting/reconnecting causes listener mismatches where
 * event handlers end up on a different socket than the one in the room.
 */
export function getSocket(): Socket {
  if (socket) {
    console.log(
      '[Socket] Reusing existing socket, id:',
      socket.id,
      '| connected:',
      socket.connected,
    );
    return socket;
  }

  const token = useAuthStore.getState().getAccessToken();
  console.log(
    '[Socket] Creating new socket connection to',
    `${API_BASE_URL}/session`,
    '| token present:',
    !!token,
    '| token preview:',
    token ? token.substring(0, 20) + '...' : 'NONE',
  );

  socket = io(`${API_BASE_URL}/session`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log(
      '[Socket] ✅ Connected to /session namespace | socketId:',
      socket?.id,
    );
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] ❌ Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error(
      '[Socket] 🔴 Connection error:',
      err.message,
      '| Description:',
      (err as any).description,
    );
  });

  socket.on('reconnect_attempt', (attempt) => {
    console.log('[Socket] 🔄 Reconnect attempt:', attempt);
  });

  socket.on('reconnect', (attempt) => {
    console.log('[Socket] ✅ Reconnected after', attempt, 'attempts');
  });

  socket.on('reconnect_failed', () => {
    console.error('[Socket] 🔴 Reconnect failed after all attempts');
  });

  // Log ALL incoming events for debugging
  socket.onAny((eventName, ...args) => {
    console.log(`[Socket] 📨 RECEIVED event: "${eventName}"`, args);
  });

  // Log ALL outgoing events for debugging
  socket.onAnyOutgoing((eventName, ...args) => {
    console.log(`[Socket] 📤 SENDING event: "${eventName}"`, args);
  });

  return socket;
}

/**
 * Disconnect the socket entirely. Call on logout or when leaving all sessions.
 */
export function disconnectSocket() {
  console.log(
    '[Socket] disconnectSocket() called. Current socket:',
    socket?.id || 'none',
  );
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    console.log('[Socket] Socket disconnected and nullified');
  }
}

/**
 * Reconnect with a fresh token (e.g. after token refresh).
 */
export function reconnectSocket() {
  console.log('[Socket] reconnectSocket() called');
  disconnectSocket();
  return getSocket();
}

// =========================================================================
// Session room helpers
// =========================================================================

/**
 * Join a session room. Returns a promise that resolves with online members.
 * Waits for the socket to be connected before emitting.
 */
export function joinSessionRoom(conversationId: string): Promise<{
  conversationId: string;
  onlineMembers: Array<{ userId: string; displayName: string }>;
}> {
  const s = getSocket();
  console.log(
    '[Socket] joinSessionRoom() | conversationId:',
    conversationId,
    '| socket connected:',
    s.connected,
    '| socketId:',
    s.id,
  );

  return new Promise((resolve, reject) => {
    let resolved = false;

    const doJoin = () => {
      console.log(
        '[Socket] doJoin() — emitting session:join | socketId:',
        s.id,
      );
      s.emit('session:join', { conversationId }, (response: any) => {
        if (resolved) return;
        resolved = true;
        console.log(
          '[Socket] 📨 session:join ACK response:',
          JSON.stringify(response),
        );
        if (response?.error) {
          console.error('[Socket] session:join ERROR:', response.error);
          reject(new Error(response.error));
        } else {
          const data = response?.data || {
            conversationId,
            onlineMembers: [],
          };
          console.log(
            '[Socket] ✅ Joined room. Online members:',
            data.onlineMembers,
          );
          resolve(data);
        }
      });
    };

    if (s.connected) {
      doJoin();
    } else {
      console.log('[Socket] Socket not connected yet — waiting for connect…');
      s.once('connect', doJoin);
    }

    // Fallback timeout
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      console.warn(
        '[Socket] ⚠️ session:join ACK timeout (5s) — resolving with empty members',
      );
      resolve({ conversationId, onlineMembers: [] });
    }, 5000);
  });
}

/**
 * Leave a session room.
 */
export function leaveSessionRoom(conversationId: string) {
  const s = getSocket();
  console.log(
    '[Socket] leaveSessionRoom() | conversationId:',
    conversationId,
    '| socket connected:',
    s.connected,
  );
  s.emit('session:leave', { conversationId });
}

/**
 * Emit typing start event.
 */
export function emitTypingStart(conversationId: string) {
  const s = getSocket();
  console.log('[Socket] emitTypingStart() | conversationId:', conversationId);
  s.emit('session:typing-start', { conversationId });
}

/**
 * Emit typing stop event.
 */
export function emitTypingStop(conversationId: string) {
  const s = getSocket();
  console.log('[Socket] emitTypingStop() | conversationId:', conversationId);
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
