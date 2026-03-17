import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initDb(): Database.Database {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'games.db');
  
  // Ensure data directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  
  // WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      game TEXT NOT NULL CHECK(game IN ('mafia', 'dnd')),
      host_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting', 'playing', 'finished')),
      settings TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      telegram_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      is_host INTEGER NOT NULL DEFAULT 0,
      is_connected INTEGER NOT NULL DEFAULT 1,
      joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(room_id, telegram_id)
    );

    CREATE TABLE IF NOT EXISTS game_states (
      room_id TEXT PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
      state TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
    CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
    CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);
    CREATE INDEX IF NOT EXISTS idx_players_telegram ON players(telegram_id);
  `);

  return db;
}

export type Db = Database.Database;
