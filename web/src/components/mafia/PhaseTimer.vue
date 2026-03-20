<template>
  <div class="phase-timer">
    <div class="timer-bar">
      <div
        class="timer-fill"
        :class="urgentClass"
        :style="{ width: `${percent}%` }"
      />
    </div>
    <span class="timer-text">{{ formattedTime }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  durationMs: number;
}>();

const startTime = ref(Date.now());
const elapsed = ref(0);
let interval: ReturnType<typeof setInterval> | null = null;

const remaining = computed(() =>
  Math.max(0, props.durationMs - elapsed.value)
);

const percent = computed(() =>
  Math.max(0, (remaining.value / props.durationMs) * 100)
);

const formattedTime = computed(() => {
  const secs = Math.ceil(remaining.value / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
});

const urgentClass = computed(() => {
  if (percent.value <= 15) return 'urgent';
  if (percent.value <= 35) return 'warning';
  return '';
});

onMounted(() => {
  startTime.value = Date.now();
  interval = setInterval(() => {
    elapsed.value = Date.now() - startTime.value;
    if (remaining.value <= 0 && interval) {
      clearInterval(interval);
    }
  }, 100);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

<style scoped>
.phase-timer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timer-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.timer-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--button-color, #5865f2);
  transition: width 0.1s linear;
}

.timer-fill.warning {
  background: #f39c12;
}

.timer-fill.urgent {
  background: #e74c3c;
  animation: pulse 0.5s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.timer-text {
  font-size: 14px;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
