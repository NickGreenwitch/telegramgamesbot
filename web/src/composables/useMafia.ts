import { ref, computed, readonly } from 'vue';
import type {
  MafiaState,
  MafiaPhase,
  MafiaRole,
  Room,
  Player,
} from '@party-games/shared';
import { useSocket } from './useSocket';
import { useTelegram } from './useTelegram';

// Singleton state shared across components
const myRole = ref<MafiaRole | null>(null);
const gameState = ref<MafiaState | null>(null);
const room = ref<Room | null>(null);
const phase = ref<MafiaPhase | null>(null);
const day = ref(0);
const votes = ref<Record<string, string>>({});
const eliminatedPlayer = ref<string | null>(null);
const eliminatedRole = ref<MafiaRole | undefined>(undefined);
const winner = ref<'mafia' | 'citizens' | 'maniac' | null>(null);
const gameStarted = ref(false);
const showRoleReveal = ref(false);

// Night action tracking
const nightActionSent = ref(false);
const voteSent = ref(false);

// Detective check result
const detectiveCheckResult = ref<{ targetId: string; isMafia: boolean } | null>(null);

let initialized = false;

export function useMafia() {
  const { socket } = useSocket();
  const { telegramId } = useTelegram();

  const myPlayerId = computed(() => {
    if (!room.value) return null;
    const player = room.value.players.find(
      (p: Player) => p.telegramId === telegramId.value
    );
    return player?.id ?? null;
  });

  const isAlive = computed(() => {
    if (!gameState.value || !myPlayerId.value) return false;
    return gameState.value.alivePlayers.includes(myPlayerId.value);
  });

  const alivePlayers = computed(() => {
    if (!room.value || !gameState.value) return [];
    return room.value.players.filter((p: Player) =>
      gameState.value!.alivePlayers.includes(p.id)
    );
  });

  const deadPlayers = computed(() => {
    if (!room.value || !gameState.value) return [];
    return room.value.players.filter(
      (p: Player) => !gameState.value!.alivePlayers.includes(p.id)
    );
  });

  const isMafiaTeam = computed(() => {
    return myRole.value === 'mafia' || myRole.value === 'don';
  });

  const canActAtNight = computed(() => {
    if (!myRole.value || !isAlive.value) return false;
    return myRole.value !== 'citizen';
  });

  const otherAlivePlayers = computed(() => {
    return alivePlayers.value.filter(
      (p: Player) => p.id !== myPlayerId.value
    );
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

    socket.on('mafia:roleAssigned', (role: MafiaRole) => {
      myRole.value = role;
      showRoleReveal.value = true;
    });

    socket.on('mafia:phaseChange', (newPhase: MafiaPhase, newDay: number) => {
      phase.value = newPhase;
      day.value = newDay;
      nightActionSent.value = false;
      voteSent.value = false;
      eliminatedPlayer.value = null;
      eliminatedRole.value = undefined;
      detectiveCheckResult.value = null;
    });

    socket.on('mafia:stateUpdate', (state: MafiaState) => {
      gameState.value = state;
      if (state.winner) {
        winner.value = state.winner;
      }

      // Check for detective result (special state update)
      if (
        myRole.value === 'detective' &&
        state.nightActions?.length === 1 &&
        state.nightActions[0].role === 'detective'
      ) {
        const action = state.nightActions[0];
        // If targetId is in the roles revealed section, they're mafia
        const targetRole = state.roles[action.targetId];
        detectiveCheckResult.value = {
          targetId: action.targetId,
          isMafia: targetRole === 'mafia',
        };
      }
    });

    socket.on('mafia:voteUpdate', (newVotes: Record<string, string>) => {
      votes.value = newVotes;
    });

    socket.on('mafia:elimination', (playerId: string, role?: MafiaRole) => {
      eliminatedPlayer.value = playerId;
      eliminatedRole.value = role;
    });

    socket.on('game:ended', (w?: string) => {
      winner.value = (w as 'mafia' | 'citizens' | 'maniac') ?? null;
    });
  }

  function sendNightAction(targetId: string) {
    if (nightActionSent.value) return;
    socket.emit('mafia:nightAction', targetId);
    nightActionSent.value = true;
  }

  function sendVote(targetId: string) {
    if (voteSent.value) return;
    socket.emit('mafia:vote', targetId);
    voteSent.value = true;
  }

  function dismissRoleReveal() {
    showRoleReveal.value = false;
  }

  function getPlayerName(playerId: string): string {
    const player = room.value?.players.find((p: Player) => p.id === playerId);
    return player?.name ?? '???';
  }

  function cleanup() {
    initialized = false;
    myRole.value = null;
    gameState.value = null;
    phase.value = null;
    day.value = 0;
    votes.value = {};
    eliminatedPlayer.value = null;
    eliminatedRole.value = undefined;
    winner.value = null;
    gameStarted.value = false;
    showRoleReveal.value = false;
    nightActionSent.value = false;
    voteSent.value = false;
    detectiveCheckResult.value = null;
  }

  return {
    // State
    myRole: readonly(myRole),
    gameState: readonly(gameState),
    room: readonly(room),
    phase: readonly(phase),
    day: readonly(day),
    votes: readonly(votes),
    eliminatedPlayer: readonly(eliminatedPlayer),
    eliminatedRole: readonly(eliminatedRole),
    winner: readonly(winner),
    gameStarted: readonly(gameStarted),
    showRoleReveal: readonly(showRoleReveal),
    nightActionSent: readonly(nightActionSent),
    voteSent: readonly(voteSent),
    detectiveCheckResult: readonly(detectiveCheckResult),

    // Computed
    myPlayerId,
    isAlive,
    alivePlayers,
    deadPlayers,
    isMafiaTeam,
    canActAtNight,
    otherAlivePlayers,

    // Actions
    initListeners,
    sendNightAction,
    sendVote,
    dismissRoleReveal,
    getPlayerName,
    cleanup,
  };
}
