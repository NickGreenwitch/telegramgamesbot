<template>
  <div class="dnd-game">
    <!-- Character creation screen -->
    <DndCharacterCreate v-if="needsCharacterCreation" />

    <!-- DM panel (DM sees this alongside the game) -->
    <template v-else>
      <!-- DM badge -->
      <div v-if="isDM" class="dm-badge card">
        🎭 {{ t('dnd.dm') }}
      </div>

      <!-- Character sheet (for players) -->
      <DndCharacterSheet v-if="!isDM && myCharacter" :character="myCharacter" />

      <!-- Battle mode -->
      <DndBattle v-if="isBattle" />

      <!-- DM control panel -->
      <DndDmPanel v-if="isDM" />

      <!-- Narrative log -->
      <DndNarrative />

      <!-- Dice roller (always visible) -->
      <DndDiceRoller />

      <!-- Action input (for players in exploration mode) -->
      <div v-if="!isDM && !isBattle && hasCharacter" class="action-input card">
        <div class="input-row">
          <input
            v-model="actionText"
            :placeholder="t('dnd.action')"
            @keyup.enter="submitAction"
          />
          <button class="send-btn" @click="submitAction" :disabled="!actionText.trim()">
            ▶
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDnd } from '@/composables/useDnd';
import DndCharacterCreate from './DndCharacterCreate.vue';
import DndCharacterSheet from './DndCharacterSheet.vue';
import DndNarrative from './DndNarrative.vue';
import DndBattle from './DndBattle.vue';
import DndDiceRoller from './DndDiceRoller.vue';
import DndDmPanel from './DndDmPanel.vue';

const { t } = useI18n();
const {
  isDM,
  isBattle,
  myCharacter,
  hasCharacter,
  needsCharacterCreation,
  initListeners,
  sendAction,
  cleanup,
} = useDnd();

const actionText = ref('');

onMounted(() => {
  initListeners();
});

onUnmounted(() => {
  cleanup();
});

function submitAction() {
  const text = actionText.value.trim();
  if (!text) return;
  sendAction(text);
  actionText.value = '';
}
</script>

<style scoped>
.dnd-game {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dm-badge {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  padding: 12px;
  background: linear-gradient(135deg, #4a1a8a, #7c3aed);
}

.action-input {
  position: sticky;
  bottom: 16px;
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-row input {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 12px 16px;
  color: var(--text-color, #fff);
  font-size: 14px;
  outline: none;
}

.input-row input::placeholder {
  color: var(--hint-color, #999);
}

.send-btn {
  width: 48px;
  min-width: 48px;
  padding: 0;
  border-radius: 10px;
  font-size: 18px;
}

.send-btn:disabled {
  opacity: 0.4;
}
</style>
