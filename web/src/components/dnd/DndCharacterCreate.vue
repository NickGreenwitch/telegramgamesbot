<template>
  <div class="character-create">
    <div class="card">
      <h2>🧙 {{ t('dnd.createCharacter') }}</h2>

      <!-- Step 1: Name -->
      <div v-if="step === 1" class="step">
        <label>Name</label>
        <input
          v-model="charName"
          placeholder="Enter character name..."
          maxlength="20"
          @keyup.enter="nextStep"
        />
        <button @click="nextStep" :disabled="!charName.trim()">→</button>
      </div>

      <!-- Step 2: Race -->
      <div v-if="step === 2" class="step">
        <label>Race</label>
        <div class="option-grid">
          <button
            v-for="race in races"
            :key="race"
            class="option-btn"
            :class="{ selected: selectedRace === race }"
            @click="selectedRace = race"
          >
            {{ raceEmoji[race] }} {{ t(`dnd.races.${race}`) }}
          </button>
        </div>
        <div class="nav-buttons">
          <button class="secondary" @click="step--">←</button>
          <button @click="nextStep" :disabled="!selectedRace">→</button>
        </div>
      </div>

      <!-- Step 3: Class -->
      <div v-if="step === 3" class="step">
        <label>Class</label>
        <div class="option-grid">
          <button
            v-for="cls in classes"
            :key="cls"
            class="option-btn"
            :class="{ selected: selectedClass === cls }"
            @click="selectedClass = cls"
          >
            {{ classEmoji[cls] }} {{ t(`dnd.classes.${cls}`) }}
          </button>
        </div>
        <div class="nav-buttons">
          <button class="secondary" @click="step--">←</button>
          <button @click="nextStep" :disabled="!selectedClass">→</button>
        </div>
      </div>

      <!-- Step 4: Stats -->
      <div v-if="step === 4" class="step">
        <label>Stats (4d6 drop lowest)</label>
        <div class="stats-grid">
          <div v-for="stat in statNames" :key="stat" class="stat-row">
            <span class="stat-name">{{ statLabels[stat] }}</span>
            <span class="stat-value">{{ generatedStats[stat] }}</span>
            <span class="stat-mod">({{ formatMod(modFor(generatedStats[stat])) }})</span>
          </div>
        </div>
        <button class="secondary reroll-btn" @click="rerollStats">🎲 Reroll</button>
        <div class="nav-buttons">
          <button class="secondary" @click="step--">←</button>
          <button @click="submitCharacter">✓ Create</button>
        </div>
      </div>
    </div>

    <!-- Preview -->
    <div v-if="step >= 2" class="card preview">
      <div class="preview-header">
        <span class="preview-name">{{ charName || '???' }}</span>
        <span v-if="selectedRace" class="preview-detail">{{ raceEmoji[selectedRace] }} {{ t(`dnd.races.${selectedRace}`) }}</span>
        <span v-if="selectedClass" class="preview-detail">{{ classEmoji[selectedClass] }} {{ t(`dnd.classes.${selectedClass}`) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDnd } from '@/composables/useDnd';
import type { DndRace, DndClass, DndStats } from '@party-games/shared';

const { t } = useI18n();
const { createCharacter } = useDnd();

const step = ref(1);
const charName = ref('');
const selectedRace = ref<DndRace | null>(null);
const selectedClass = ref<DndClass | null>(null);

const races: DndRace[] = ['human', 'elf', 'dwarf', 'halfling', 'orc', 'tiefling'];
const classes: DndClass[] = ['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'bard'];

const raceEmoji: Record<DndRace, string> = {
  human: '🧑',
  elf: '🧝',
  dwarf: '⛏️',
  halfling: '🪶',
  orc: '👹',
  tiefling: '😈',
};

const classEmoji: Record<DndClass, string> = {
  warrior: '⚔️',
  mage: '🔮',
  rogue: '🗡️',
  cleric: '⛪',
  ranger: '🏹',
  bard: '🎵',
};

const statNames: (keyof DndStats)[] = [
  'strength', 'dexterity', 'constitution',
  'intelligence', 'wisdom', 'charisma',
];

const statLabels: Record<keyof DndStats, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
};

function roll4d6DropLowest(): number {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

const generatedStats = reactive<DndStats>({
  strength: roll4d6DropLowest(),
  dexterity: roll4d6DropLowest(),
  constitution: roll4d6DropLowest(),
  intelligence: roll4d6DropLowest(),
  wisdom: roll4d6DropLowest(),
  charisma: roll4d6DropLowest(),
});

function rerollStats() {
  for (const stat of statNames) {
    generatedStats[stat] = roll4d6DropLowest();
  }
}

function modFor(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function nextStep() {
  if (step.value === 1 && !charName.value.trim()) return;
  if (step.value === 2 && !selectedRace.value) return;
  if (step.value === 3 && !selectedClass.value) return;
  step.value++;
}

function submitCharacter() {
  if (!charName.value.trim() || !selectedRace.value || !selectedClass.value) return;

  createCharacter({
    name: charName.value.trim(),
    race: selectedRace.value,
    class: selectedClass.value,
    stats: { ...generatedStats },
  });
}
</script>

<style scoped>
.character-create {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}

.step {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

label {
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--hint-color, #999);
}

input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 12px 16px;
  color: var(--text-color, #fff);
  font-size: 16px;
  outline: none;
  width: 100%;
}

input::placeholder {
  color: var(--hint-color, #999);
}

.option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.option-btn {
  padding: 12px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.option-btn.selected {
  border-color: var(--button-color, #5865f2);
  background: rgba(88, 101, 242, 0.2);
}

.nav-buttons {
  display: flex;
  gap: 8px;
}

.nav-buttons button {
  flex: 1;
}

.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-color, #fff);
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.stat-name {
  width: 40px;
  font-weight: 700;
  font-size: 13px;
  color: var(--hint-color, #999);
}

.stat-value {
  flex: 1;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}

.stat-mod {
  width: 40px;
  text-align: right;
  font-size: 14px;
  color: var(--hint-color, #999);
}

.reroll-btn {
  align-self: center;
  width: auto;
  padding: 8px 20px;
}

.preview {
  padding: 12px 16px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.preview-name {
  font-weight: 700;
  font-size: 16px;
}

.preview-detail {
  font-size: 13px;
  color: var(--hint-color, #999);
}
</style>
