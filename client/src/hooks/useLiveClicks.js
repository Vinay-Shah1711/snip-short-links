import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, getToken } from '../api.js';

/**
 * Opens one Socket.IO connection and calls onClick(click) every time
 * the server pushes a new click for the logged-in user.
 * Returns whether the socket is currently connected (for the "LIVE" badge).
 */
export function useLiveClicks(onClick) {
  const handler = useRef(onClick);
  handler.current = onClick; // always call the latest callback without reconnecting
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(API_URL || undefined, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('click', (c) => handler.current?.(c));
    return () => socket.disconnect();
  }, []);

  return connected;
}
