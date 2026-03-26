<template>
  <div class="narrative card">
    <!-- Current scene -->
    <div v-if="currentScene" class="scene">
      <div class="scene-label">📜 Scene</div>
      <p class="scene-text">{{ currentScene }}</p>
    </div>

    <!-- Adventure log -->
    <div class="log" ref="logContainer">
      <div
        v-for="(entry, i) in visibleLog"
        :key="i"
        class="log-entry"
        :class="'log-' + entry.type"
      >
        <span v-if="entry.type === 'narrative'" class="log-icon">📖</span>
        <span v-else-if="entry.type === 'roll'" class="log-icon">🎲</span>
        <span v-else-if="entry.type === 'action'" class="log-icon">⚡</span>
        <span v-else class="log-icon">💬</span>

        <span class="log-text">{{ entry.text }}</span>

        <span v-if="entry.roll" class="roll-detail">
          [{{ entry.roll.results.join(', ') }}{{ entry.roll.modifier ? (entry.roll.modifier > 0 ? '+' : '') + entry.roll.modifier : '' }}]
          = {{ entry.roll.total }}
        </span>
      </div>

      <div v-if="log.length === 0" class="empty-log">
        <p>{{ isDM ? 'Write the narrative to begin the adventure...' : 'Waiting for the Dungeon Master...' }}</p>
      </div>
    </div>

    <!-- Show more button -->
    <button
      v-if="log.length > maxVisible"
      class="show-more-btn"
      @click="showAll = !showAll"
    >
      {{ showAll ? '▲ Show less' : `▼ Show all (${log.length})` }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useDnd } from '@/composables/useDnd';

const { log, currentScene, isDM } = useDnd();

const logContainer = ref<HTMLElement | null>(null);
const showAll = ref(false);
const maxVisible = 30;

const visibleLog = computed(() => {
  if (showAll.value) return log.value;
  return log.value.slice(-maxVisible);
});

// Auto-scroll to bottom on new entries
watch(() => log.value.length, async () => {
  await nextTick();
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
});
</script>

<style scoped>
.narrative {
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.scene {
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.scene-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--hint-color, #999);
  margin-bottom: 6px;
}

.scene-text {
  font-size: 15px;
  line-height: 1.5;
  font-style: italic;
}

.log {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 280px;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.4;
}

.log-narrative {
  background: rgba(124, 58, 237, 0.1);
}

.log-roll {
  background: rgba(234, 179, 8, 0.1);
}

.log-action {
  background: rgba(34, 197, 94, 0.1);
}

.log-system {
  background: rgba(255, 255, 255, 0.05);
  color: var(--hint-color, #999);
}

.log-icon {
  flex-shrink: 0;
  font-size: 14px;
}

.log-text {
  flex: 1;
}

.roll-detail {
  font-size: 11px;
  color: var(--hint-color, #999);
  white-space: nowrap;
}

.empty-log {
  text-align: center;
  color: var(--hint-color, #999);
  font-style: italic;
  padding: 20px;
}

.show-more-btn {
  margin-top: 8px;
  padding: 6px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--hint-color, #999);
}
</style>
