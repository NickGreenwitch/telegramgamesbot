<template>
  <div class="results-phase">
    <div class="results-header">
      <div class="trophy">🏆</div>
      <h2 class="winner-text" :class="winnerClass">
        {{ t(`mafia.winner.${winner}`) }}
      </h2>
    </div>

    <!-- All roles revealed -->
    <div class="card">
      <h3>{{ locale === 'ru' ? '🎭 Роли' : '🎭 Roles' }}</h3>
      <div class="roles-list">
        <div
          v-for="player in allPlayers"
          :key="player.id"
          class="role-row"
          :class="{
            dead: !isPlayerAlive(player.id),
            'is-me': player.id === myPlayerId,
          }"
        >
          <span class="role-emoji">{{ getRoleEmoji(player.id) }}</span>
          <span class="role-player-name">{{ player.name }}</span>
          <span class="role-name" :class="getRoleClass(player.id)">
            {{ t(`mafia.roles.${getRole(player.id)}`) }}
          </span>
          <span v-if="!isPlayerAlive(player.id)" class="dead-marker">💀</span>
        </div>
      </div>
    </div>

    <!-- Personal result -->
    <div class="card personal-result" :class="didIWin ? 'win' : 'lose'">
      <p>
        {{ didIWin
          ? (locale === 'ru' ? '🎉 Вы победили!' : '🎉 You won!')
          : (locale === 'ru' ? '😔 Вы проиграли' : '😔 You lost')
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMafia } from '@/composables/useMafia';
import type { MafiaRole } from '@party-games/shared';

const { t, locale } = useI18n();
const { winner, gameState, room, myPlayerId, myRole } = useMafia();

const allPlayers = computed(() => room.value?.players ?? []);

function getRole(playerId: string): MafiaRole {
  return gameState.value?.roles[playerId] ?? 'citizen';
}

function isPlayerAlive(playerId: string): boolean {
  return gameState.value?.alivePlayers.includes(playerId) ?? false;
}

function getRoleEmoji(playerId: string): string {
  const emojis: Record<string, string> = {
    citizen: '👤', mafia: '🔫', don: '🎩', detective: '🔍',
    doctor: '💊', maniac: '🔪', prostitute: '💋', bodyguard: '🛡️', barman: '🍸',
  };
  return emojis[getRole(playerId)] || '❓';
}

function getRoleClass(playerId: string): string {
  const role = getRole(playerId);
  if (role === 'mafia' || role === 'don') return 'role-mafia';
  if (role === 'maniac') return 'role-maniac';
  return 'role-citizen';
}

const winnerClass = computed(() => {
  if (winner.value === 'mafia') return 'winner-mafia';
  if (winner.value === 'maniac') return 'winner-maniac';
  return 'winner-citizens';
});

const didIWin = computed(() => {
  if (!winner.value || !myRole.value) return false;
  if (winner.value === 'mafia') {
    return myRole.value === 'mafia' || myRole.value === 'don';
  }
  if (winner.value === 'maniac') {
    return myRole.value === 'maniac';
  }
  // Citizens win
  return myRole.value !== 'mafia' && myRole.value !== 'don' && myRole.value !== 'maniac';
});
</script>

<style scoped>
.results-phase {
  animation: fadeIn 0.6s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.results-header {
  text-align: center;
  margin-bottom: 20px;
}

.trophy {
  font-size: 64px;
  margin-bottom: 8px;
  animation: bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes bounce {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

.winner-text {
  font-size: 22px;
  font-weight: 700;
}

.winner-mafia {
  color: #e74c3c;
}

.winner-citizens {
  color: #3498db;
}

.winner-maniac {
  color: #8e44ad;
}

h3 {
  margin-bottom: 12px;
}

.roles-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.role-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.role-row.dead {
  opacity: 0.5;
}

.role-row.is-me {
  background: rgba(88, 101, 242, 0.1);
  border: 1px solid rgba(88, 101, 242, 0.3);
}

.role-emoji {
  font-size: 20px;
}

.role-player-name {
  flex: 1;
  font-weight: 500;
}

.role-name {
  font-size: 13px;
  font-weight: 600;
}

.role-mafia {
  color: #e74c3c;
}

.role-citizen {
  color: #3498db;
}

.role-maniac {
  color: #8e44ad;
}

.dead-marker {
  font-size: 14px;
}

.personal-result {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
}

.personal-result.win {
  background: rgba(46, 204, 113, 0.15);
  border: 1px solid rgba(46, 204, 113, 0.3);
  color: #2ecc71;
}

.personal-result.lose {
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: #e74c3c;
}
</style>
