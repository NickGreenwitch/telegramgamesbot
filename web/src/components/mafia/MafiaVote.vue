<template>
  <div class="vote-phase">
    <div class="vote-header">
      <div class="gavel">🗳️</div>
      <h2>{{ t('mafia.vote') }}</h2>
      <PhaseTimer :duration-ms="60000" />
    </div>

    <!-- Dead spectator -->
    <div v-if="!isAlive" class="card spectator">
      <p>{{ locale === 'ru' ? '💀 Вы выбыли. Наблюдайте за голосованием.' : '💀 You are eliminated. Watch the vote.' }}</p>
    </div>

    <!-- Vote interface -->
    <div v-else class="card">
      <PlayerSelect
        v-if="!voteSent"
        :players="otherAlivePlayers"
        :prompt="locale === 'ru' ? '🗳️ За кого голосуете?' : '🗳️ Who do you vote for?'"
        :votes="votes"
        @select="onVote"
      />

      <div v-else class="vote-sent">
        <p>{{ locale === 'ru' ? '✅ Голос принят!' : '✅ Vote cast!' }}</p>
      </div>
    </div>

    <!-- Live vote tally -->
    <div class="card vote-tally">
      <h3>{{ locale === 'ru' ? '📊 Голоса' : '📊 Votes' }}</h3>
      <div v-if="Object.keys(votes).length === 0" class="no-votes">
        {{ locale === 'ru' ? 'Пока нет голосов...' : 'No votes yet...' }}
      </div>
      <div v-else class="tally-list">
        <div
          v-for="entry in voteTally"
          :key="entry.playerId"
          class="tally-row"
        >
          <span class="tally-name">{{ getPlayerName(entry.playerId) }}</span>
          <div class="tally-bar-container">
            <div
              class="tally-bar"
              :style="{ width: `${(entry.count / alivePlayers.length) * 100}%` }"
            />
          </div>
          <span class="tally-count">{{ entry.count }}</span>
        </div>
      </div>

      <div class="vote-progress">
        {{ locale === 'ru' ? 'Проголосовали' : 'Voted' }}:
        {{ Object.keys(votes).length }} / {{ alivePlayers.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMafia } from '@/composables/useMafia';
import PhaseTimer from './PhaseTimer.vue';
import PlayerSelect from './PlayerSelect.vue';

const { t, locale } = useI18n();
const {
  isAlive,
  alivePlayers,
  otherAlivePlayers,
  votes,
  voteSent,
  sendVote,
  getPlayerName,
} = useMafia();

const voteTally = computed(() => {
  const counts = new Map<string, number>();
  for (const targetId of Object.values(votes.value)) {
    counts.set(targetId, (counts.get(targetId) || 0) + 1);
  }

  const result: { playerId: string; count: number }[] = [];
  counts.forEach((count, playerId) => {
    result.push({ playerId, count });
  });

  return result.sort((a, b) => b.count - a.count);
});

function onVote(playerId: string) {
  sendVote(playerId);
}
</script>

<style scoped>
.vote-phase {
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.vote-header {
  text-align: center;
  margin-bottom: 16px;
}

.gavel {
  font-size: 48px;
  margin-bottom: 4px;
}

h2 {
  margin-bottom: 12px;
}

h3 {
  margin-bottom: 10px;
}

.spectator {
  text-align: center;
  opacity: 0.7;
}

.vote-sent {
  text-align: center;
  padding: 20px 0;
  font-weight: 600;
  color: #2ecc71;
}

.vote-tally {
  margin-top: 12px;
}

.no-votes {
  text-align: center;
  color: var(--hint-color, #999);
  padding: 12px 0;
}

.tally-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tally-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tally-name {
  min-width: 80px;
  font-weight: 500;
  font-size: 14px;
}

.tally-bar-container {
  flex: 1;
  height: 20px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.tally-bar {
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(90deg, #e74c3c, #c0392b);
  transition: width 0.3s ease;
  min-width: 4px;
}

.tally-count {
  font-weight: 700;
  font-size: 16px;
  min-width: 24px;
  text-align: center;
}

.vote-progress {
  text-align: center;
  margin-top: 12px;
  color: var(--hint-color, #999);
  font-size: 13px;
}
</style>
