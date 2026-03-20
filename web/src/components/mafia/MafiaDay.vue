<template>
  <div class="day-phase">
    <div class="day-header">
      <div class="sun">☀️</div>
      <h2>{{ t('mafia.day') }} {{ day }}</h2>
      <PhaseTimer :duration-ms="discussionTime" />
    </div>

    <!-- Night kill announcement -->
    <div v-if="eliminatedPlayer" class="card elimination">
      <p>
        {{ locale === 'ru' ? '☠️ Этой ночью погиб:' : '☠️ Killed last night:' }}
        <strong>{{ getPlayerName(eliminatedPlayer) }}</strong>
        <span v-if="eliminatedRole"> ({{ t(`mafia.roles.${eliminatedRole}`) }})</span>
      </p>
    </div>

    <div v-else class="card peaceful-night">
      <p>{{ locale === 'ru' ? '🌅 Ночь прошла спокойно. Никто не погиб.' : '🌅 Peaceful night. Nobody died.' }}</p>
    </div>

    <!-- Dead spectator -->
    <div v-if="!isAlive" class="card spectator">
      <p>{{ locale === 'ru' ? '💀 Вы выбыли. Наблюдайте за обсуждением.' : '💀 You are eliminated. Watch the discussion.' }}</p>
    </div>

    <!-- Alive players list -->
    <div class="card">
      <h3>{{ t('room.players') }} ({{ alivePlayers.length }})</h3>
      <div class="players-list">
        <div
          v-for="player in alivePlayers"
          :key="player.id"
          class="player-row"
          :class="{ 'is-me': player.id === myPlayerId }"
        >
          <span class="player-emoji">{{ player.id === myPlayerId ? roleEmoji : '🎮' }}</span>
          <span class="player-name">{{ player.name }}</span>
          <span v-if="player.id === myPlayerId" class="me-badge">
            {{ locale === 'ru' ? 'вы' : 'you' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Dead players -->
    <div v-if="deadPlayers.length > 0" class="card dead-list">
      <h3>{{ locale === 'ru' ? '💀 Выбыли' : '💀 Eliminated' }} ({{ deadPlayers.length }})</h3>
      <div class="players-list">
        <div v-for="player in deadPlayers" :key="player.id" class="player-row dead">
          <span class="player-emoji">💀</span>
          <span class="player-name">{{ player.name }}</span>
        </div>
      </div>
    </div>

    <p class="discussion-hint">
      {{ locale === 'ru' ? '💬 Обсуждайте! Кто мафия?' : '💬 Discuss! Who is the mafia?' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMafia } from '@/composables/useMafia';
import PhaseTimer from './PhaseTimer.vue';

const { t, locale } = useI18n();
const {
  myRole,
  day,
  isAlive,
  alivePlayers,
  deadPlayers,
  myPlayerId,
  eliminatedPlayer,
  eliminatedRole,
  getPlayerName,
} = useMafia();

// Default discussion time: 120s
const discussionTime = 120_000;

const roleEmoji = computed(() => {
  const emojis: Record<string, string> = {
    citizen: '👤', mafia: '🔫', don: '🎩', detective: '🔍',
    doctor: '💊', maniac: '🔪', prostitute: '💋', bodyguard: '🛡️', barman: '🍸',
  };
  return emojis[myRole.value || ''] || '🎮';
});
</script>

<style scoped>
.day-phase {
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.day-header {
  text-align: center;
  margin-bottom: 16px;
}

.sun {
  font-size: 48px;
  margin-bottom: 4px;
}

h2 {
  margin-bottom: 12px;
}

h3 {
  margin-bottom: 10px;
  font-size: 15px;
}

.elimination {
  text-align: center;
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.peaceful-night {
  text-align: center;
  background: rgba(46, 204, 113, 0.1);
}

.spectator {
  text-align: center;
  opacity: 0.7;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.player-row.is-me {
  background: rgba(88, 101, 242, 0.1);
  border: 1px solid rgba(88, 101, 242, 0.3);
}

.player-row.dead {
  opacity: 0.4;
  text-decoration: line-through;
}

.player-emoji {
  font-size: 18px;
}

.player-name {
  flex: 1;
  font-weight: 500;
}

.me-badge {
  font-size: 11px;
  color: var(--button-color, #5865f2);
  font-weight: 600;
  text-transform: uppercase;
}

.dead-list {
  opacity: 0.7;
}

.discussion-hint {
  text-align: center;
  margin-top: 16px;
  color: var(--hint-color, #999);
  font-size: 14px;
}
</style>
