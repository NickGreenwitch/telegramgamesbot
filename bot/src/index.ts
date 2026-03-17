import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

import { Bot, InlineKeyboard } from 'grammy';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://your-domain.com';
const API_URL = process.env.API_URL || 'http://localhost:3001';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is required');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// /start — Welcome message
bot.command('start', async (ctx) => {
  const lang = ctx.from?.language_code === 'ru' ? 'ru' : 'en';
  
  const text = lang === 'ru'
    ? '🎮 *Добро пожаловать в Party Games!*\n\nВыберите игру:'
    : '🎮 *Welcome to Party Games!*\n\nChoose a game:';

  const keyboard = new InlineKeyboard()
    .webApp(lang === 'ru' ? '🔫 Мафия' : '🔫 Mafia', `${WEB_APP_URL}/create?game=mafia`)
    .row()
    .webApp(lang === 'ru' ? '🐉 Dungeons & Dragons' : '🐉 Dungeons & Dragons', `${WEB_APP_URL}/create?game=dnd`)
    .row()
    .text(lang === 'ru' ? '🚪 Войти по коду' : '🚪 Join by code', 'join_room');

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
});

// Join room by code
bot.callbackQuery('join_room', async (ctx) => {
  const lang = ctx.from?.language_code === 'ru' ? 'ru' : 'en';

  await ctx.answerCallbackQuery();
  await ctx.reply(
    lang === 'ru'
      ? '🔑 Отправьте код комнаты (6 символов):'
      : '🔑 Send the room code (6 characters):',
  );
});

// Handle room code input
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim().toUpperCase();
  const lang = ctx.from?.language_code === 'ru' ? 'ru' : 'en';

  // Check if it looks like a room code (6 alphanumeric chars)
  if (/^[A-Z0-9]{6}$/.test(text)) {
    try {
      const res = await fetch(`${API_URL}/api/rooms/${text}`);
      if (res.ok) {
        const room = await res.json();
        const gameName = room.game === 'mafia'
          ? (lang === 'ru' ? 'Мафия' : 'Mafia')
          : 'D&D';

        const keyboard = new InlineKeyboard()
          .webApp(
            lang === 'ru' ? `▶️ Присоединиться к ${gameName}` : `▶️ Join ${gameName}`,
            `${WEB_APP_URL}/join?code=${text}`
          );

        await ctx.reply(
          lang === 'ru'
            ? `🎮 Комната найдена!\n\n*${gameName}* — ${room.players.length} игроков`
            : `🎮 Room found!\n\n*${gameName}* — ${room.players.length} players`,
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );
      } else {
        await ctx.reply(
          lang === 'ru' ? '❌ Комната не найдена' : '❌ Room not found'
        );
      }
    } catch {
      await ctx.reply(
        lang === 'ru' ? '❌ Ошибка подключения к серверу' : '❌ Server connection error'
      );
    }
  }
});

// Start bot
bot.start({
  onStart: (info) => console.log(`🤖 Bot @${info.username} started`),
});
