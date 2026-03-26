import type { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, Player } from '@party-games/shared';
import type { Db } from './db.js';
import { MafiaEngine } from './games/mafia/index.js';
import { getDefaultSettings } from './games/mafia/roles.js';
import { DndEngine } from './games/dnd/index.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Active game engines, keyed by roomId
const activeMafiaGames = new Map<string, MafiaEngine>();
const activeDndGames = new Map<string, DndEngine>();

// Keep backward compatibility
const activeGames = activeMafiaGames;

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
      const mafiaEngine = activeMafiaGames.get(room.id);
      if (mafiaEngine && currentPlayerId) {
        const state = mafiaEngine.getState();
        socket.emit('mafia:stateUpdate', state);
        const role = mafiaEngine.getPlayerRole(currentPlayerId);
        if (role) {
          socket.emit('mafia:roleAssigned', role);
        }
      }

      const dndEngine = activeDndGames.get(room.id);
      if (dndEngine && currentPlayerId) {
        const state = dndEngine.getState();
        socket.emit('dnd:stateUpdate', state);
        const character = dndEngine.getCharacter(currentPlayerId);
        if (character) {
          socket.emit('dnd:characterCreated', character);
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

        activeMafiaGames.set(currentRoomId, engine);
        engine.start();
      }

      if (room.game === 'dnd') {
        const playerIds = players.map((p: any) => p.id);
        const settings = JSON.parse(room.settings || '{}');

        const engine = new DndEngine(io, db, {
          roomId: currentRoomId,
          dmPlayerId: room.host_id,
          playerIds,
          settings: {
            maxPlayers: settings.maxPlayers || 6,
            allowCustomCharacters: settings.allowCustomCharacters ?? true,
          },
        });

        activeDndGames.set(currentRoomId, engine);
        engine.start();
      }
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

    // ==================== D&D Events ====================

    socket.on('dnd:createCharacter', (payload) => {
      if (!currentRoomId || !currentPlayerId) return;
      const engine = activeDndGames.get(currentRoomId);
      if (!engine) return;
      engine.handleCreateCharacter(
        currentPlayerId,
        payload.name,
        payload.race,
        payload.class,
        payload.stats,
      );
    });

    socket.on('dnd:roll', (dice) => {
      if (!currentRoomId || !currentPlayerId) return;
      const engine = activeDndGames.get(currentRoomId);
      if (engine) {
        engine.handleRoll(currentPlayerId, dice);
      }
    });

    socket.on('dnd:action', (text) => {
      if (!currentRoomId || !currentPlayerId) return;
      const engine = activeDndGames.get(currentRoomId);
      if (!engine) return;
      engine.handleAction(currentPlayerId, text);
    });

    socket.on('dnd:narrative', (text) => {
      if (!currentRoomId || !currentPlayerId) return;
      const engine = activeDndGames.get(currentRoomId);
      if (!engine) return;
      engine.handleNarrative(currentPlayerId, text);
    });

    socket.on('dnd:battleStart' as any, () => {
      if (!currentRoomId || !currentPlayerId) return;
      const engine = activeDndGames.get(currentRoomId);
      if (!engine) return;
      engine.handleBattleStart(currentPlayerId);
    });

    socket.on('dnd:battleEnd' as any, () => {
      if (!currentRoomId || !currentPlayerId) return;
      const engine = activeDndGames.get(currentRoomId);
      if (!engine) return;
      engine.handleBattleEnd(currentPlayerId);
    });

    socket.on('dnd:battleAction', (action, targetId) => {
      if (!currentRoomId || !currentPlayerId) return;
      const engine = activeDndGames.get(currentRoomId);
      if (!engine) return;
      engine.handleBattleAction(currentPlayerId, action, targetId);
    });

    socket.on('dnd:modifyHp' as any, (targetCharacterId: string, amount: number) => {
      if (!currentRoomId || !currentPlayerId) return;
      const engine = activeDndGames.get(currentRoomId);
      if (!engine) return;
      engine.handleDmModifyHp(currentPlayerId, targetCharacterId, amount);
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

/**
 * Clean up a game engine when the room is done.
 * Called externally or on room deletion.
 */
export function destroyGame(roomId: string): void {
  const mafiaEngine = activeMafiaGames.get(roomId);
  if (mafiaEngine) {
    mafiaEngine.destroy();
    activeMafiaGames.delete(roomId);
  }

  const dndEngine = activeDndGames.get(roomId);
  if (dndEngine) {
    dndEngine.destroy();
    activeDndGames.delete(roomId);
  }
}
