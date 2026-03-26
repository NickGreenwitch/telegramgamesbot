<template>
  <div class="battle">
    <!-- Battle header -->
    <div class="card battle-header">
      <h3>⚔️ {{ t('dnd.battle') }}</h3>

      <!-- Turn order -->
      <div class="turn-order">
        <div
          v-for="pid in turnOrder"
          :key="pid"
          class="turn-chip"
          :class="{
            active: pid === currentTurnPlayerId,
            dead: isCharacterDead(pid),
          }"
        >
          {{ getCharacterName(pid) }}
        </div>
      </div>
    </div>

    <!-- Current turn indicator -->
    <div v-if="isMyTurn && !isDM" class="card turn-alert">
      <p>🗡️ {{ t('dnd.yourTurn') }}</p>
      <div class="battle-actions">
        <button class="action-btn attack" @click="doAction('attack')">⚔️ Attack</button>
        <button class="action-btn spell" @click="doAction('spell')">✨ Spell</button>
        <button class="action-btn heal" @click="doAction('heal')">💚 Heal</button>
        <button class="action-btn defend" @click="doAction('defend')">🛡️ Defend</button>
        <button class="action-btn item" @click="doAction('item')">🧪 Item</button>
        <button class="action-btn flee" @click="doAction('flee')">🏃 Flee</button>
      </div>
    </div>

    <!-- Target selection overlay -->
    <div v-if="showTargetSelect" class="card target-select">
      <p>Select target:</p>
      <div class="targets">
        <button
          v-for="char in selectableTargets"
          :key="char.id"
          class="target-btn"
          @click="selectTarget(char.id)"
        >
          <span class="target-name">{{ char.name }}</span>
          <span class="target-hp">❤️ {{ char.hp }}/{{ char.maxHp }}</span>
        </button>
      </div>
      <button class="secondary cancel-btn" @click="cancelTargetSelect">Cancel</button>
    </div>

    <!-- Character HP overview (all combatants) -->
    <div class="card combatants">
      <div
        v-for="char in aliveCharacters"
        :key="char.id"
        class="combatant"
        :class="{ current: char.playerId === currentTurnPlayerId }"
      >
        <span class="combatant-name">{{ char.name }}</span>
        <div class="combatant-hp-bar">
          <div
            class="combatant-hp-fill"
            :style="{ width: (char.hp / char.maxHp * 100) + '%' }"
            :class="hpClass(char.hp, char.maxHp)"
          />
        </div>
        <span class="combatant-hp">{{ char.hp }}/{{ char.maxHp }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDnd } from '@/composables/useDnd';
import type { DndCharacter } from '@party-games/shared';

const { t } = useI18n();
const {
  isDM,
  isMyTurn,
  turnOrder,
  currentTurnPlayerId,
  aliveCharacters,
  otherCharacters,
  myCharacter,
  myPlayerId,
  battleAction,
  getCharacterByPlayerId,
} = useDnd();

const showTargetSelect = ref(false);
const pendingAction = ref('');

const selectableTargets = computed(() => {
  if (pendingAction.value === 'heal') {
    // Heal targets: alive allies including self
    return aliveCharacters.value;
  }
  // Attack/spell targets: other alive characters
  return aliveCharacters.value.filter(
    (c: DndCharacter) => c.playerId !== myPlayerId.value,
  );
});

function getCharacterName(playerId: string): string {
  const char = getCharacterByPlayerId(playerId);
  return char?.name ?? '???';
}

function isCharacterDead(playerId: string): boolean {
  const char = getCharacterByPlayerId(playerId);
  return char ? char.hp <= 0 : false;
}

function hpClass(hp: number, maxHp: number): string {
  const pct = (hp / maxHp) * 100;
  if (pct > 60) return 'hp-good';
  if (pct > 25) return 'hp-warn';
  return 'hp-danger';
}

function doAction(action: string) {
  // No-target actions
  if (action === 'defend' || action === 'flee' || action === 'item') {
    battleAction(action);
    return;
  }

  // Actions that need a target
  pendingAction.value = action;
  showTargetSelect.value = true;
}

function selectTarget(targetId: string) {
  battleAction(pendingAction.value, targetId);
  showTargetSelect.value = false;
  pendingAction.value = '';
}

function cancelTargetSelect() {
  showTargetSelect.value = false;
  pendingAction.value = '';
}
</script>

<style scoped>
.battle {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.battle-header h3 {
  margin-bottom: 10px;
  color: #ef4444;
}

.turn-order {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.turn-chip {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.08);
}

.turn-chip.active {
  background: var(--button-color, #5865f2);
  color: var(--button-text-color, #fff);
}

.turn-chip.dead {
  opacity: 0.3;
  text-decoration: line-through;
}

.turn-alert {
  background: linear-gradient(135deg, rgba(88, 101, 242, 0.3), rgba(124, 58, 237, 0.3));
  text-align: center;
}

.turn-alert p {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}

.battle-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.action-btn {
  padding: 10px 8px;
  font-size: 13px;
  border-radius: 10px;
}

.action-btn.attack { background: #dc2626; }
.action-btn.spell { background: #7c3aed; }
.action-btn.heal { background: #16a34a; }
.action-btn.defend { background: #2563eb; }
.action-btn.item { background: #ca8a04; }
.action-btn.flee { background: rgba(255, 255, 255, 0.15); }

.target-select {
  text-align: center;
}

.target-select p {
  font-weight: 600;
  margin-bottom: 10px;
}

.targets {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.target-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

.target-name { font-weight: 600; }
.target-hp { font-size: 12px; color: var(--hint-color, #999); }

.cancel-btn {
  padding: 8px;
  font-size: 13px;
}

.combatants {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.combatant {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.combatant.current {
  background: rgba(88, 101, 242, 0.15);
  border-left: 3px solid var(--button-color, #5865f2);
}

.combatant-name {
  width: 80px;
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.combatant-hp-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.combatant-hp-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.hp-good { background: #22c55e; }
.hp-warn { background: #eab308; }
.hp-danger { background: #ef4444; }

.combatant-hp {
  font-size: 11px;
  color: var(--hint-color, #999);
  width: 50px;
  text-align: right;
}

.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-color, #fff);
}
</style>
