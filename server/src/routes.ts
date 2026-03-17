import type { FastifyInstance } from 'fastify';
import { nanoid, customAlphabet } from 'nanoid';
import type { Db } from './db.js';
import type { GameType, Room, Player } from '@party-games/shared';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export function registerRoutes(app: FastifyInstance, db: Db) {
  
  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  // Create room
  app.post<{
    Body: { game: GameType; hostTelegramId: number; hostName: string };
  }>('/api/rooms', async (req, reply) => {
    const { game, hostTelegramId, hostName } = req.body;

    const roomId = nanoid();
    const code = generateCode();
    const hostPlayerId = nanoid();

    const insertRoom = db.prepare(`
      INSERT INTO rooms (id, code, game, host_id) VALUES (?, ?, ?, ?)
    `);
    const insertPlayer = db.prepare(`
      INSERT INTO players (id, room_id, telegram_id, name, is_host) VALUES (?, ?, ?, ?, 1)
    `);

    const transaction = db.transaction(() => {
      insertRoom.run(roomId, code, game, hostPlayerId);
      insertPlayer.run(hostPlayerId, roomId, hostTelegramId, hostName);
    });
    transaction();

    return reply.status(201).send({ roomId, code, playerId: hostPlayerId });
  });

  // Get room by code
  app.get<{ Params: { code: string } }>('/api/rooms/:code', async (req, reply) => {
    const room = db.prepare(`SELECT * FROM rooms WHERE code = ?`).get(req.params.code) as any;
    if (!room) return reply.status(404).send({ error: 'Room not found' });

    const players = db.prepare(`SELECT * FROM players WHERE room_id = ?`).all(room.id) as any[];

    return {
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
    };
  });

  // Join room
  app.post<{
    Params: { code: string };
    Body: { telegramId: number; name: string };
  }>('/api/rooms/:code/join', async (req, reply) => {
    const room = db.prepare(`SELECT * FROM rooms WHERE code = ?`).get(req.params.code) as any;
    if (!room) return reply.status(404).send({ error: 'Room not found' });
    if (room.status !== 'waiting') return reply.status(400).send({ error: 'Game already started' });

    const { telegramId, name } = req.body;
    const playerId = nanoid();

    try {
      db.prepare(`
        INSERT INTO players (id, room_id, telegram_id, name) VALUES (?, ?, ?, ?)
      `).run(playerId, room.id, telegramId, name);
    } catch (e: any) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        // Player already in room — return existing
        const existing = db.prepare(
          `SELECT * FROM players WHERE room_id = ? AND telegram_id = ?`
        ).get(room.id, telegramId) as any;
        return { playerId: existing.id, roomId: room.id };
      }
      throw e;
    }

    return reply.status(201).send({ playerId, roomId: room.id });
  });
}
