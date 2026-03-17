import { ref, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@party-games/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const API_URL = import.meta.env.VITE_API_URL || '';

let socket: TypedSocket | null = null;

export function useSocket() {
  const connected = ref(false);

  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }

  socket.on('connect', () => {
    connected.value = true;
  });

  socket.on('disconnect', () => {
    connected.value = false;
  });

  onUnmounted(() => {
    // Don't disconnect — shared singleton
  });

  return { socket: socket as TypedSocket, connected };
}
