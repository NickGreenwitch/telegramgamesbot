<template>
  <div class="dice-roller card">
    <div class="roller-header" @click="expanded = !expanded">
      <span>🎲 {{ t('dnd.roll') }}</span>
      <span class="toggle">{{ expanded ? '▲' : '▼' }}</span>
    </div>

    <div v-if="expanded" class="roller-body">
      <!-- Quick dice buttons -->
      <div class="quick-dice">
        <button
          v-for="die in quickDice"
          :key="die"
          class="die-btn"
          @click="quickRoll(die)"
        >
          {{ die }}
        </button>
      </div>

      <!-- Custom notation input -->
      <div class="custom-roll">
        <input
          v-model="customDice"
          placeholder="e.g. 2d6+3"
          @keyup.enter="rollCustom"
        />
        <button class="roll-btn" @click="rollCustom" :disabled="!customDice.trim()">
          🎲
        </button>
      </div>

      <!-- Last result -->
      <div v-if="lastRollResult" class="last-result">
        <span class="result-text">{{ lastRollResult.text }}</span>
        <span v-if="lastRollResult.roll" class="result-detail">
          [{{ lastRollResult.roll.results.join(', ') }}]
          {{ lastRollResult.roll.modifier ? (lastRollResult.roll.modifier > 0 ? '+' : '') + lastRollResult.roll.modifier : '' }}
          = <strong>{{ lastRollResult.roll.total }}</strong>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDnd } from '@/composables/useDnd';

const { t } = useI18n();
const { rollDice, lastRollResult } = useDnd();

const expanded = ref(false);
const customDice = ref('');

const quickDice = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

function quickRoll(die: string) {
  rollDice(die);
}

function rollCustom() {
  const val = customDice.value.trim();
  if (!val) return;
  rollDice(val);
  customDice.value = '';
}
</script>

<style scoped>
.roller-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
}

.toggle {
  font-size: 12px;
  color: var(--hint-color, #999);
}

.roller-body {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-dice {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.die-btn {
  width: auto;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.die-btn:active {
  background: var(--button-color, #5865f2);
}

.custom-roll {
  display: flex;
  gap: 8px;
}

.custom-roll input {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--text-color, #fff);
  font-size: 14px;
  outline: none;
}

.custom-roll input::placeholder {
  color: var(--hint-color, #999);
}

.roll-btn {
  width: 48px;
  min-width: 48px;
  padding: 0;
  border-radius: 10px;
  font-size: 20px;
}

.roll-btn:disabled {
  opacity: 0.4;
}

.last-result {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  background: rgba(234, 179, 8, 0.1);
  border-radius: 8px;
}

.result-text {
  font-size: 13px;
}

.result-detail {
  font-size: 12px;
  color: var(--hint-color, #999);
}

.result-detail strong {
  color: var(--text-color, #fff);
  font-size: 16px;
}
</style>
