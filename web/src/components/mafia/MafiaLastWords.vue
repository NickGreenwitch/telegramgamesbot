<template>
  <div class="last-words-phase">
    <div class="last-words-header">
      <div class="icon">⚰️</div>
      <h2>{{ t('mafia.lastWords') }}</h2>
      <PhaseTimer :duration-ms="30000" />
    </div>

    <div class="card eliminated-card">
      <div class="eliminated-info">
        <span class="big-emoji">😢</span>
        <p class="eliminated-text">
          <strong>{{ eliminatedName }}</strong>
          {{ locale === 'ru' ? 'говорит последнее слово...' : 'has their last words...' }}
        </p>
      </div>

      <div v-if="isEliminated" class="you-eliminated">
        <p>{{ locale === 'ru'
          ? '👋 Это вы! Скажите что-нибудь напоследок.'
          : "👋 It's you! Say your last words." }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMafia } from '@/composables/useMafia';
import PhaseTimer from './PhaseTimer.vue';

const { t, locale } = useI18n();
const { eliminatedPlayer, myPlayerId, getPlayerName } = useMafia();

const eliminatedName = computed(() =>
  eliminatedPlayer.value ? getPlayerName(eliminatedPlayer.value) : '???'
);

const isEliminated = computed(() =>
  eliminatedPlayer.value === myPlayerId.value
);
</script>

<style scoped>
.last-words-phase {
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.last-words-header {
  text-align: center;
  margin-bottom: 16px;
}

.icon {
  font-size: 48px;
  margin-bottom: 4px;
}

h2 {
  margin-bottom: 12px;
}

.eliminated-card {
  text-align: center;
}

.eliminated-info {
  padding: 16px 0;
}

.big-emoji {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}

.eliminated-text {
  font-size: 16px;
}

.you-eliminated {
  margin-top: 16px;
  padding: 12px;
  background: rgba(231, 76, 60, 0.15);
  border-radius: 10px;
  color: #e74c3c;
  font-weight: 600;
}
</style>
