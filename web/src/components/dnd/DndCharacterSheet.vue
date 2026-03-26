<template>
  <div class="character-sheet card">
    <div class="sheet-header">
      <div class="char-identity">
        <span class="char-name">{{ character.name }}</span>
        <span class="char-info">
          Lv.{{ character.level }}
          {{ raceEmoji[character.race] }} {{ t(`dnd.races.${character.race}`) }}
          {{ classEmoji[character.class] }} {{ t(`dnd.classes.${character.class}`) }}
        </span>
      </div>
      <button class="toggle-btn" @click="expanded = !expanded">
        {{ expanded ? '▲' : '▼' }}
      </button>
    </div>

    <!-- HP Bar -->
    <div class="hp-section">
      <div class="hp-bar">
        <div class="hp-fill" :style="{ width: hpPercent + '%' }" :class="hpClass" />
      </div>
      <span class="hp-text">❤️ {{ character.hp }}/{{ character.maxHp }}</span>
    </div>

    <!-- Expanded details -->
    <div v-if="expanded" class="sheet-details">
      <!-- Stats -->
      <div class="stats-row">
        <div v-for="stat in statNames" :key="stat" class="stat-chip">
          <span class="stat-label">{{ statLabels[stat] }}</span>
          <span class="stat-val">{{ character.stats[stat] }}</span>
          <span class="stat-mod">{{ formatMod(modFor(character.stats[stat])) }}</span>
        </div>
      </div>

      <!-- Inventory -->
      <div v-if="character.inventory.length" class="inventory">
        <h4>🎒 Inventory</h4>
        <div v-for="item in character.inventory" :key="item.id" class="item">
          <span class="item-icon">{{ itemIcon(item.type) }}</span>
          <span class="item-name">{{ item.name }}</span>
          <span v-if="item.quantity > 1" class="item-qty">×{{ item.quantity }}</span>
        </div>
      </div>

      <!-- Skills -->
      <div v-if="character.skills.length" class="skills">
        <h4>⚡ Skills</h4>
        <div class="skill-tags">
          <span v-for="skill in character.skills" :key="skill" class="skill-tag">{{ skill }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DndCharacter, DndRace, DndClass, DndStats } from '@party-games/shared';

const { t } = useI18n();

const props = defineProps<{ character: DndCharacter }>();

const expanded = ref(false);

const raceEmoji: Record<DndRace, string> = {
  human: '🧑', elf: '🧝', dwarf: '⛏️', halfling: '🪶', orc: '👹', tiefling: '😈',
};

const classEmoji: Record<DndClass, string> = {
  warrior: '⚔️', mage: '🔮', rogue: '🗡️', cleric: '⛪', ranger: '🏹', bard: '🎵',
};

const statNames: (keyof DndStats)[] = [
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
];

const statLabels: Record<keyof DndStats, string> = {
  strength: 'STR', dexterity: 'DEX', constitution: 'CON',
  intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA',
};

const hpPercent = computed(() =>
  Math.round((props.character.hp / props.character.maxHp) * 100),
);

const hpClass = computed(() => {
  if (hpPercent.value > 60) return 'hp-good';
  if (hpPercent.value > 25) return 'hp-warn';
  return 'hp-danger';
});

function modFor(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function itemIcon(type: string): string {
  switch (type) {
    case 'weapon': return '⚔️';
    case 'armor': return '🛡️';
    case 'potion': return '🧪';
    default: return '📦';
  }
}
</script>

<style scoped>
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.char-identity {
  display: flex;
  flex-direction: column;
}

.char-name {
  font-size: 18px;
  font-weight: 700;
}

.char-info {
  font-size: 12px;
  color: var(--hint-color, #999);
  margin-top: 2px;
}

.toggle-btn {
  width: 36px;
  min-width: 36px;
  padding: 6px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.hp-section {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.hp-bar {
  flex: 1;
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s ease;
}

.hp-good { background: #22c55e; }
.hp-warn { background: #eab308; }
.hp-danger { background: #ef4444; }

.hp-text {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.sheet-details {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.stat-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.stat-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--hint-color, #999);
  letter-spacing: 1px;
}

.stat-val {
  font-size: 18px;
  font-weight: 700;
}

.stat-mod {
  font-size: 11px;
  color: var(--hint-color, #999);
}

h4 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--hint-color, #999);
  margin-bottom: 6px;
}

.inventory {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  font-size: 13px;
}

.item-icon { font-size: 14px; }
.item-name { flex: 1; }
.item-qty { color: var(--hint-color, #999); font-size: 12px; }

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-tag {
  padding: 4px 10px;
  background: rgba(88, 101, 242, 0.2);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
</style>
