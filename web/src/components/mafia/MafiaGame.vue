<template>
  <div class="mafia-game">
    <!-- Role reveal overlay -->
    <MafiaRole
      v-if="myRole"
      :role="myRole"
      :show="showRoleReveal"
      @dismiss="dismissRoleReveal"
    />

    <!-- Game over -->
    <MafiaResults v-if="winner" />

    <!-- Active phases -->
    <template v-else-if="phase">
      <MafiaNight v-if="phase === 'night'" />
      <MafiaDay v-if="phase === 'day'" />
      <MafiaVote v-if="phase === 'vote'" />
      <MafiaLastWords v-if="phase === 'lastWords'" />
    </template>

    <!-- Waiting for game to start (pre-phase) -->
    <div v-else class="waiting-start">
      <div class="loading-spinner">🔫</div>
      <p>{{ locale === 'ru' ? 'Игра начинается...' : 'Game is starting...' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMafia } from '@/composables/useMafia';
import MafiaRole from './MafiaRole.vue';
import MafiaNight from './MafiaNight.vue';
import MafiaDay from './MafiaDay.vue';
import MafiaVote from './MafiaVote.vue';
import MafiaLastWords from './MafiaLastWords.vue';
import MafiaResults from './MafiaResults.vue';

const { locale } = useI18n();
const {
  myRole,
  phase,
  winner,
  showRoleReveal,
  initListeners,
  dismissRoleReveal,
  cleanup,
} = useMafia();

onMounted(() => {
  initListeners();
});

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
.mafia-game {
  min-height: 80vh;
}

.waiting-start {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.loading-spinner {
  font-size: 48px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.waiting-start p {
  color: var(--hint-color, #999);
  font-size: 16px;
}
</style>
