import type { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, Player } from '@party-games/shared';
import type { Db } from './db.js';
import { MafiaEngine } from './games/mafia/index.js';
import { getDefaultSettings } from './games/mafia/roles.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Active game engines, keyed by roomId
const activeGames = new Map<string, MafiaEngine>();

export function setupSocketHandlers(io: IO, db: Db) {
  io.on('connection', (socket: GameSocket) => {
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

      // Join socket rooms: the game room + a private player room
      socket.join(room.id);
      if (playerData.id) {
        socket.join(`player:${playerData.id}`);
      }

      // Update connection status
      db.prepare(`UPDATE players SET is_connected = 1 WHERE id = ?`).run(playerData.id);

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

      // If game is already running, send current game state
      const engine = activeGames.get(room.id);
      if (engine && currentPlayerId) {
        const state = engine.getState();
        socket.emit('mafia:stateUpdate', state);
        // Send player's role privately
        const role = engine.getPlayerRole(currentPlayerId);
        if (role) {
          socket.emit('mafia:roleAssigned', role);
        }
      }
    });

    socket.on('room:leave', () => {
      if (currentRoomId && currentPlayerId) {
        db.prepare(`UPDATE players SET is_connected = 0 WHERE id = ?`).run(currentPlayerId);
        socket.to(currentRoomId).emit('room:playerLeft', currentPlayerId);
        socket.leave(currentRoomId);
        socket.leave(`player:${currentPlayerId}`);
        currentRoomId = null;
        currentPlayerId = null;
      }
    });

    // ==================== Game Start ====================

    socket.on('game:start', () => {
      if (!currentRoomId || !currentPlayerId) return;

      // Verify host
      const room = db.prepare(`SELECT * FROM rooms WHERE id = ?`).get(currentRoomId) as any;
      if (!room || room.host_id !== currentPlayerId) return;
      if (room.status !== 'waiting') return;

      // Get players
      const players = db.prepare(
        `SELECT * FROM players WHERE room_id = ? AND is_connected = 1`
      ).all(currentRoomId) as any[];

      const minPlayers = room.game === 'mafia' ? 4 : 2;
      if (players.length < minPlayers) return;

      // Update room status
      db.prepare(`UPDATE rooms SET status = 'playing' WHERE id = ?`).run(currentRoomId);

      // Notify all players
      io.to(currentRoomId).emit('game:started');

      if (room.game === 'mafia') {
        const playerIds = players.map((p: any) => p.id);
        const settings = JSON.parse(room.settings || '{}');

        const engine = new MafiaEngine(io, db, {
          roomId: currentRoomId,
          playerIds,
          settings: { ...getDefaultSettings(), ...settings },
        });

        activeGames.set(currentRoomId, engine);
        engine.start();
      }

      // TODO: D&D engine
    });

    // ==================== Mafia Events ====================

    socket.on('mafia:vote', (targetId) => {
      if (!currentRoomId || !currentPlayerId) return;
      const engine = activeGames.get(currentRoomId);
      if (!engine) return;
      engine.handleVote(currentPlayerId, targetId);
    });

    socket.on('mafia:nightAction', (targetId) => {
      if (!currentRoomId || !currentPlayerId) return;
      const engine = activeGames.get(currentRoomId);
      if (!engine) return;
      engine.handleNightAction(currentPlayerId, targetId);
    });

    // ==================== D&D Events (placeholder) ====================

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
      // TODO: D&D engine
    });

    socket.on('dnd:narrative', (text) => {
      if (!currentRoomId) return;
      io.to(currentRoomId).emit('dnd:narrative', text);
    });

    // ==================== Disconnect ====================

    socket.on('disconnect', () => {
      if (currentRoomId && currentPlayerId) {
        db.prepare(`UPDATE players SET is_connected = 0 WHERE id = ?`).run(currentPlayerId);
        socket.to(currentRoomId).emit('room:playerLeft', currentPlayerId);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

// ==================== Utilities ====================

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

/**
 * Clean up a game engine when the room is done.
 * Called externally or on room deletion.
 */
export function destroyGame(roomId: string): void {
  const engine = activeGames.get(roomId);
  if (engine) {
    engine.destroy();
    activeGames.delete(roomId);
  }
}
