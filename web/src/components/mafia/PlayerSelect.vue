<template>
  <div class="player-select">
    <p class="prompt">{{ prompt }}</p>
    <div class="player-grid">
      <button
        v-for="player in players"
        :key="player.id"
        class="player-btn"
        :class="{
          selected: selectedId === player.id,
          disabled: disabled,
        }"
        @click="select(player.id)"
        :disabled="disabled"
      >
        <span class="player-emoji">{{ playerEmoji(player) }}</span>
        <span class="player-name">{{ player.name }}</span>
        <span v-if="voteCount(player.id) > 0" class="vote-badge">
          {{ voteCount(player.id) }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Player } from '@party-games/shared';

const props = defineProps<{
  players: Player[];
  prompt: string;
  disabled?: boolean;
  votes?: Record<string, string>;
}>();

const emit = defineEmits<{
  select: [playerId: string];
}>();

const selectedId = ref<string | null>(null);

function select(playerId: string) {
  if (props.disabled) return;
  selectedId.value = playerId;
  emit('select', playerId);
}

function playerEmoji(player: Player): string {
  return player.isHost ? '👑' : '🎮';
}

function voteCount(playerId: string): number {
  if (!props.votes) return 0;
  return Object.values(props.votes).filter((id) => id === playerId).length;
}
</script>

<style scoped>
.player-select {
  margin-top: 12px;
}

.prompt {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  text-align: center;
}

.player-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid transparent;
  color: var(--text-color, #fff);
  font-size: 15px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.player-btn:active:not(.disabled) {
  transform: scale(0.97);
}

.player-btn.selected {
  border-color: var(--button-color, #5865f2);
  background: rgba(88, 101, 242, 0.15);
}

.player-btn.disabled {
  opacity: 0.5;
  cursor: default;
}

.player-emoji {
  font-size: 20px;
}

.player-name {
  flex: 1;
}

.vote-badge {
  background: var(--button-color, #5865f2);
  color: var(--button-text-color, #fff);
  font-size: 12px;
  font-weight: 700;
  min-width: 24px;
  height: 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}
</style>
