<template>
  <div class="game-room" v-if="room">
    <!-- Header -->
    <div class="card header">
      <div class="room-info">
        <span class="game-icon">{{ room.game === 'mafia' ? '🔫' : '🐉' }}</span>
        <div>
          <h2>{{ room.game === 'mafia' ? t('create.mafia') : t('create.dnd') }}</h2>
          <div class="room-code">
            {{ t('room.code') }}: <strong>{{ room.code }}</strong>
            <button class="copy-btn" @click="copyCode">📋</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Players list -->
    <div class="card">
      <h3>{{ t('room.players') }} ({{ room.players.length }})</h3>
      <div class="players">
        <div
          v-for="player in room.players"
          :key="player.id"
          class="player"
          :class="{ offline: !player.isConnected }"
        >
          <span class="player-avatar">{{ player.isHost ? '👑' : '🎮' }}</span>
          <span class="player-name">{{ player.name }}</span>
          <span v-if="!player.isConnected" class="offline-badge">offline</span>
        </div>
      </div>
    </div>

    <!-- Waiting state -->
    <div v-if="room.status === 'waiting'" class="waiting">
      <p class="hint">{{ t('room.waiting') }}</p>
      
      <button v-if="isHost" @click="startGame" :disabled="room.players.length < minPlayers">
        {{ t('room.start') }}
      </button>
      <p v-if="isHost && room.players.length < minPlayers" class="hint">
        {{ t('room.minPlayers', { count: minPlayers }) }}
      </p>
    </div>

    <!-- TODO: Game-specific UIs will go here -->
  </div>

  <div v-else class="loading">
    <p>Loading...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSocket } from '@/composables/useSocket';
import { useTelegram } from '@/composables/useTelegram';
import type { Room } from '@party-games/shared';

const { t } = useI18n();
const route = useRoute();
const { socket } = useSocket();
const { telegramId, userName } = useTelegram();

const room = ref<Room | null>(null);
const code = route.params.code as string;

const isHost = computed(() => {
  if (!room.value) return false;
  return room.value.players.some(
    (p) => p.telegramId === telegramId.value && p.isHost
  );
});

const minPlayers = computed(() => {
  if (!room.value) return 4;
  return room.value.game === 'mafia' ? 4 : 2;
});

onMounted(() => {
  // Join the room via socket
  socket.emit('room:join', code, {
    id: '', // Will be resolved server-side
    telegramId: telegramId.value,
    name: userName.value,
  });

  socket.on('room:updated', (updatedRoom) => {
    room.value = updatedRoom;
  });

  socket.on('room:playerJoined', (player) => {
    if (room.value) {
      room.value.players.push(player);
    }
  });

  socket.on('room:playerLeft', (playerId) => {
    if (room.value) {
      const idx = room.value.players.findIndex((p) => p.id === playerId);
      if (idx !== -1) {
        room.value.players[idx].isConnected = false;
      }
    }
  });
});

onUnmounted(() => {
  socket.emit('room:leave');
  socket.off('room:updated');
  socket.off('room:playerJoined');
  socket.off('room:playerLeft');
});

function startGame() {
  socket.emit('game:start');
}

function copyCode() {
  navigator.clipboard?.writeText(code);
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.game-icon {
  font-size: 36px;
}

.room-code {
  font-size: 14px;
  color: var(--hint-color, #999);
  display: flex;
  align-items: center;
  gap: 6px;
}

.room-code strong {
  font-size: 16px;
  letter-spacing: 2px;
  color: var(--text-color, #fff);
}

.copy-btn {
  width: auto;
  padding: 4px 8px;
  font-size: 12px;
  background: transparent;
}

h3 {
  margin-bottom: 12px;
}

.players {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.player.offline {
  opacity: 0.5;
}

.player-avatar {
  font-size: 20px;
}

.player-name {
  flex: 1;
  font-weight: 500;
}

.offline-badge {
  font-size: 11px;
  color: var(--hint-color, #999);
  text-transform: uppercase;
}

.waiting {
  text-align: center;
  margin-top: 20px;
}

.hint {
  color: var(--hint-color, #999);
  font-size: 14px;
  margin-bottom: 16px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: var(--hint-color, #999);
}
</style>
