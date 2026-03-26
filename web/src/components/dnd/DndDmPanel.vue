<template>
  <div class="dm-panel">
    <!-- Narrative input -->
    <div class="card">
      <h4>📖 Narrative</h4>
      <textarea
        v-model="narrativeText"
        placeholder="Describe the scene, what happens next..."
        rows="3"
      />
      <button @click="submitNarrative" :disabled="!narrativeText.trim()">
        📜 Send Narrative
      </button>
    </div>

    <!-- Battle controls -->
    <div class="card battle-controls">
      <h4>⚔️ Battle</h4>
      <div class="btn-row">
        <button
          v-if="!isBattle"
          class="start-battle"
          @click="startBattle"
          :disabled="aliveCharacters.length === 0"
        >
          ⚔️ Start Battle
        </button>
        <button
          v-else
          class="end-battle"
          @click="endBattle"
        >
          🕊️ End Battle
        </button>
      </div>
    </div>

    <!-- Character management -->
    <div class="card char-mgmt">
      <h4>🎭 Characters</h4>
      <div v-if="characters.length === 0" class="hint">
        No characters yet. Players need to create them.
      </div>
      <div
        v-for="char in characters"
        :key="char.id"
        class="char-row"
      >
        <div class="char-info">
          <span class="char-name">{{ char.name }}</span>
          <span class="char-hp">❤️ {{ char.hp }}/{{ char.maxHp }}</span>
        </div>
        <div class="hp-controls">
          <button class="hp-btn damage" @click="dmDamage(char.id, 5)">-5</button>
          <button class="hp-btn damage-sm" @click="dmDamage(char.id, 1)">-1</button>
          <button class="hp-btn heal-sm" @click="dmHeal(char.id, 1)">+1</button>
          <button class="hp-btn heal" @click="dmHeal(char.id, 5)">+5</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDnd } from '@/composables/useDnd';

const {
  isBattle,
  characters,
  aliveCharacters,
  sendNarrative,
  startBattle,
  endBattle,
  modifyHp,
} = useDnd();

const narrativeText = ref('');

function submitNarrative() {
  const text = narrativeText.value.trim();
  if (!text) return;
  sendNarrative(text);
  narrativeText.value = '';
}

function dmDamage(charId: string, amount: number) {
  modifyHp(charId, -amount);
}

function dmHeal(charId: string, amount: number) {
  modifyHp(charId, amount);
}
</script>

<style scoped>
.dm-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h4 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--hint-color, #999);
  margin-bottom: 10px;
}

textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 12px;
  color: var(--text-color, #fff);
  font-size: 14px;
  resize: vertical;
  outline: none;
  font-family: inherit;
  margin-bottom: 10px;
}

textarea::placeholder {
  color: var(--hint-color, #999);
}

.btn-row {
  display: flex;
  gap: 8px;
}

.start-battle {
  background: #dc2626;
}

.end-battle {
  background: #16a34a;
}

.hint {
  font-size: 13px;
  color: var(--hint-color, #999);
  font-style: italic;
}

.char-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.char-row:last-child {
  border-bottom: none;
}

.char-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.char-name {
  font-weight: 600;
  font-size: 14px;
}

.char-hp {
  font-size: 12px;
  color: var(--hint-color, #999);
}

.hp-controls {
  display: flex;
  gap: 4px;
}

.hp-btn {
  width: 36px;
  min-width: 36px;
  padding: 6px 0;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
}

.hp-btn.damage { background: #dc2626; }
.hp-btn.damage-sm { background: #991b1b; }
.hp-btn.heal-sm { background: #166534; }
.hp-btn.heal { background: #16a34a; }
</style>
