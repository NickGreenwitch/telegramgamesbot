import { ref, computed, readonly } from 'vue';
import type {
  DndState,
  DndCharacter,
  DndLogEntry,
  DndClass,
  DndRace,
  DndStats,
  Room,
  Player,
  CreateCharacterPayload,
} from '@party-games/shared';
import { useSocket } from './useSocket';
import { useTelegram } from './useTelegram';

// Singleton state shared across components
const gameState = ref<DndState | null>(null);
const room = ref<Room | null>(null);
const myCharacter = ref<DndCharacter | null>(null);
const gameStarted = ref(false);
const latestNarrative = ref('');
const lastRollResult = ref<DndLogEntry | null>(null);

let initialized = false;

export function useDnd() {
  const { socket } = useSocket();
  const { telegramId } = useTelegram();

  const myPlayerId = computed(() => {
    if (!room.value) return null;
    const player = room.value.players.find(
      (p: Player) => p.telegramId === telegramId.value,
    );
    return player?.id ?? null;
  });

  const isDM = computed(() => {
    if (!gameState.value || !myPlayerId.value) return false;
    return gameState.value.dungeonMasterId === myPlayerId.value;
  });

  const characters = computed(() => gameState.value?.characters ?? []);

  const aliveCharacters = computed(() =>
    characters.value.filter((c: DndCharacter) => c.hp > 0),
  );

  const otherCharacters = computed(() =>
    characters.value.filter((c: DndCharacter) => c.playerId !== myPlayerId.value),
  );

  const isBattle = computed(() => gameState.value?.battleMode ?? false);

  const isMyTurn = computed(() => {
    if (!gameState.value?.battleMode || !myPlayerId.value) return false;
    return gameState.value.currentTurn === myPlayerId.value;
  });

  const turnOrder = computed(() => gameState.value?.turnOrder ?? []);

  const currentTurnPlayerId = computed(() => gameState.value?.currentTurn ?? null);

  const currentScene = computed(() => gameState.value?.currentScene ?? '');

  const log = computed(() => gameState.value?.log ?? []);

  const hasCharacter = computed(() => myCharacter.value !== null);

  const needsCharacterCreation = computed(() => {
    if (!gameStarted.value) return false;
    if (isDM.value) return false;
    return !hasCharacter.value;
  });

  function initListeners() {
    if (initialized) return;
    initialized = true;

    socket.on('room:updated', (updatedRoom: Room) => {
      room.value = updatedRoom;
    });

    socket.on('game:started', () => {
      gameStarted.value = true;
    });

    socket.on('dnd:stateUpdate', (state: DndState) => {
      gameState.value = state;
      // Update local character from state
      if (myPlayerId.value) {
        const char = state.characters.find(
          (c: DndCharacter) => c.playerId === myPlayerId.value,
        );
        if (char) myCharacter.value = char;
      }
    });

    socket.on('dnd:narrative', (text: string) => {
      latestNarrative.value = text;
    });

    socket.on('dnd:rollResult', (entry: DndLogEntry) => {
      lastRollResult.value = entry;
    });

    socket.on('dnd:turnChange', (_playerId: string) => {
      // State update will handle UI changes
    });

    socket.on('dnd:battleStart', (_turnOrder: string[]) => {
      // State update will handle
    });

    socket.on('dnd:battleEnd', () => {
      // State update will handle
    });

    socket.on('dnd:characterCreated', (character: DndCharacter) => {
      myCharacter.value = character;
    });

    socket.on('game:ended', () => {
      // Game over
    });
  }

  // ===== Actions =====

  function createCharacter(payload: CreateCharacterPayload) {
    socket.emit('dnd:createCharacter', payload);
  }

  function sendAction(text: string) {
    socket.emit('dnd:action', text);
  }

  function sendNarrative(text: string) {
    socket.emit('dnd:narrative', text);
  }

  function rollDice(dice: string) {
    socket.emit('dnd:roll', dice);
  }

  function startBattle() {
    (socket as any).emit('dnd:battleStart');
  }

  function endBattle() {
    (socket as any).emit('dnd:battleEnd');
  }

  function battleAction(action: string, targetId?: string) {
    socket.emit('dnd:battleAction', action, targetId);
  }

  function modifyHp(targetCharacterId: string, amount: number) {
    (socket as any).emit('dnd:modifyHp', targetCharacterId, amount);
  }

  function getPlayerName(playerId: string): string {
    const player = room.value?.players.find((p: Player) => p.id === playerId);
    return player?.name ?? '???';
  }

  function getCharacterByPlayerId(playerId: string): DndCharacter | undefined {
    return characters.value.find((c: DndCharacter) => c.playerId === playerId);
  }

  function cleanup() {
    initialized = false;
    gameState.value = null;
    room.value = null;
    myCharacter.value = null;
    gameStarted.value = false;
    latestNarrative.value = '';
    lastRollResult.value = null;
  }

  return {
    // State
    gameState: readonly(gameState),
    room: readonly(room),
    myCharacter,
    gameStarted: readonly(gameStarted),
    latestNarrative: readonly(latestNarrative),
    lastRollResult: readonly(lastRollResult),

    // Computed
    myPlayerId,
    isDM,
    characters,
    aliveCharacters,
    otherCharacters,
    isBattle,
    isMyTurn,
    turnOrder,
    currentTurnPlayerId,
    currentScene,
    log,
    hasCharacter,
    needsCharacterCreation,

    // Actions
    initListeners,
    createCharacter,
    sendAction,
    sendNarrative,
    rollDice,
    startBattle,
    endBattle,
    battleAction,
    modifyHp,
    getPlayerName,
    getCharacterByPlayerId,
    cleanup,
  };
}
