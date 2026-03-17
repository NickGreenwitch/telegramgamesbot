# 🎮 Telegram Party Games

Telegram Mini App with multiplayer party games: **Mafia** and **Dungeons & Dragons**.

## Features

- 🔫 **Mafia** — Classic party game with extra roles (Don, Detective, Doctor, Maniac, and more)
- 🐉 **D&D** — Full tabletop RPG experience with character creation, dice rolls, and battle system
- 🌍 **Bilingual** — Russian and English (auto-detected from Telegram)
- 🎯 **Real-time** — WebSocket-based multiplayer via Socket.IO
- 📱 **Native feel** — Telegram Mini App with adaptive theme

## Tech Stack

- **Frontend:** Vue 3 + TypeScript + Vite
- **Backend:** Node.js + Fastify + Socket.IO
- **Bot:** grammY (Telegram Bot framework)
- **Database:** SQLite (better-sqlite3)
- **i18n:** vue-i18n

## Quick Start

```bash
# Clone
git clone https://github.com/NickGreenwitch/telegramgamesbot.git
cd telegramgamesbot

# Install dependencies
npm install

# Copy env and fill in your bot token
cp .env.example .env

# Run dev
npm run dev
```

## Project Structure

```
├── bot/          # Telegram bot (grammY)
├── server/       # Backend API + WebSocket + game engines
│   ├── games/
│   │   ├── mafia/
│   │   └── dnd/
│   └── rooms/
├── web/          # Vue 3 Mini App (Telegram WebApp)
│   ├── views/
│   │   ├── Home.vue
│   │   ├── CreateRoom.vue
│   │   ├── JoinRoom.vue
│   │   └── GameRoom.vue
│   └── i18n/
└── shared/       # Shared TypeScript types
```

## License

MIT
