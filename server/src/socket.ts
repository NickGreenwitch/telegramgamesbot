import type { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, Player } from '@party-games/shared';
import type { Db } from './db.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: IO, db: Db) {
  io.on('connection', (socket) => {
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    console.log(`Socket connected: ${socket.id}`);

    socket.on('room:join', (code, playerData) => {
      const room = db.prepare(`SELECT * FROM rooms WHERE code = ?`).get(code) as any;
      if (!room) {
        socket.emit('room:updated', null as any);
        return;
      }

      currentRoomId = room.id;
      currentPlayerId = playerData.id;

      // Update connection status
      db.prepare(`UPDATE players SET is_connected = 1 WHERE id = ?`).run(playerData.id);

      // Join socket room
      socket.join(room.id);

      // Notify others
      const player: Player = {
        ...playerData,
        isHost: false,
        isConnected: true,
      };
      socket.to(room.id).emit('room:playerJoined', player);

      // Send current room state
      const players = db.prepare(`SELECT * FROM players WHERE room_id = ?`).all(room.id) as any[];
      socket.emit('room:updated', {
        id: room.id,
        code: room.code,
        game: room.game,
        hostId: room.host_id,
        status: room.status,
        settings: JSON.parse(room.settings),
        createdAt: room.created_at,
        players: players.map((p: any) => ({
          id: p.id,
          telegramId: p.telegram_id,
          name: p.name,
          avatar: p.avatar,
          isHost: Boolean(p.is_host),
          isConnected: Boolean(p.is_connected),
        })),
      });
    });

    socket.on('room:leave', () => {
      if (currentRoomId && currentPlayerId) {
        db.prepare(`UPDATE players SET is_connected = 0 WHERE id = ?`).run(currentPlayerId);
        socket.to(currentRoomId).emit('room:playerLeft', currentPlayerId);
        socket.leave(currentRoomId);
        currentRoomId = null;
        currentPlayerId = null;
      }
    });

    // Mafia events
    socket.on('mafia:vote', (targetId) => {
      if (!currentRoomId || !currentPlayerId) return;
      io.to(currentRoomId).emit('mafia:voteUpdate', { [currentPlayerId]: targetId });
    });

    socket.on('mafia:nightAction', (targetId) => {
      if (!currentRoomId || !currentPlayerId) return;
      // Night actions handled by game engine (not broadcast)
      // Store action for processing
    });

    // D&D events
    socket.on('dnd:roll', (dice) => {
      if (!currentRoomId || !currentPlayerId) return;
      const result = rollDice(dice);
      io.to(currentRoomId).emit('dnd:rollResult', {
        timestamp: Date.now(),
        type: 'roll',
        playerId: currentPlayerId,
        text: `Rolled ${dice}: ${result.total}`,
        roll: result,
      });
    });

    socket.on('dnd:action', (text) => {
      if (!currentRoomId || !currentPlayerId) return;
      io.to(currentRoomId).emit('dnd:stateUpdate', {} as any); // TODO: process through game engine
    });

    socket.on('dnd:narrative', (text) => {
      if (!currentRoomId) return;
      io.to(currentRoomId).emit('dnd:narrative', text);
    });

    socket.on('disconnect', () => {
      if (currentRoomId && currentPlayerId) {
        db.prepare(`UPDATE players SET is_connected = 0 WHERE id = ?`).run(currentPlayerId);
        socket.to(currentRoomId).emit('room:playerLeft', currentPlayerId);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

// Dice roller
function rollDice(notation: string) {
  const match = notation.match(/^(\d+)?d(\d+)([+-]\d+)?$/);
  if (!match) return { dice: notation, results: [0], modifier: 0, total: 0 };

  const count = parseInt(match[1] || '1');
  const sides = parseInt(match[2]);
  const modifier = parseInt(match[3] || '0');

  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }

  const total = results.reduce((a, b) => a + b, 0) + modifier;
  return { dice: notation, results, modifier, total };
}
