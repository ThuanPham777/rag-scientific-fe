// src/services/socket.ts (noop)
export function getSocket() {
  // Return an object with the same shape used in ChatPage
  return {
    on: (_evt: string, _cb: (...args: any[]) => void) => {},
    off: (_evt: string, _cb: (...args: any[]) => void) => {},
  } as any;
}
