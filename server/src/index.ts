import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { initDb } from './db.js';
import { registerRoutes } from './routes.js';
import { setupSocketHandlers } from './socket.js';
import type { ServerToClientEvents, ClientToServerEvents } from '@party-games/shared';

const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

async function main() {
  // Database
  const db = initDb();

  // Fastify
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: CORS_ORIGIN });

  // REST routes
  registerRoutes(app, db);

  // Socket.IO
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
    cors: { origin: CORS_ORIGIN },
    transports: ['websocket', 'polling'],
  });

  setupSocketHandlers(io, db);

  // Start
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🎮 Party Games server running on port ${PORT}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
