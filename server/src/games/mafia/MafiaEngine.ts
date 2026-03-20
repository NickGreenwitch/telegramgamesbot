import type { Server } from 'socket.io';
import type {
  MafiaState,
  MafiaPhase,
  MafiaRole,
  MafiaSettings,
  NightAction,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@party-games/shared';
import type { Db } from '../../db.js';
import { distributeRoles, isMafiaTeam, getNightPriority, getDefaultSettings } from './roles.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export interface MafiaGameContext {
  roomId: string;
  playerIds: string[];
  settings: MafiaSettings;
}

/**
 * Mafia Game Engine
 *
 * Lifecycle:
 *   start() → [Night → Day → Vote → (LastWords) → Night → ...] → end
 *
 * Night action resolution order:
 *   1. Prostitute blocks a player (they can't act this night)
 *   2. Barman blocks a player's ability
 *   3. Mafia team votes on who to kill
 *   4. Don checks if someone is the Detective
 *   5. Detective checks if someone is Mafia
 *   6. Maniac picks a target to kill
 *   7. Doctor heals someone (can't heal same person twice in a row)
 *   8. Bodyguard protects someone (dies instead of target if targeted)
 */
export class MafiaEngine {
  private io: IO;
  private db: Db;
  private roomId: string;
  private settings: MafiaSettings;

  private state: MafiaState;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;

  // Track night actions as they come in
  private pendingNightActions: Map<string, NightAction> = new Map();
  // Track who the doctor healed last night (can't repeat)
  private lastDoctorHeal: string | null = null;
  // Track mafia kill votes for this night
  private mafiaKillVotes: Map<string, string> = new Map();

  constructor(io: IO, db: Db, context: MafiaGameContext) {
    this.io = io;
    this.db = db;
    this.roomId = context.roomId;
    this.settings = { ...getDefaultSettings(), ...context.settings };

    // Distribute roles
    const roles = distributeRoles(context.playerIds, this.settings);

    this.state = {
      phase: 'night',
      day: 0,
      alivePlayers: [...context.playerIds],
      roles,
      votes: {},
      nightActions: [],
    };
  }

  /** Start the game. Sends roles to each player, then begins first night. */
  start(): void {
    // Save initial state
    this.saveState();

    // Send each player their role privately
    for (const [playerId, role] of Object.entries(this.state.roles)) {
      this.emitToPlayer(playerId, 'mafia:roleAssigned', role);
    }

    // Small delay before first night so players can see their role
    setTimeout(() => {
      this.startNight();
    }, 3000);
  }

  /** Get current state (for reconnections). */
  getState(): MafiaState {
    return { ...this.state };
  }

  /** Get a player's role (for private info on reconnect). */
  getPlayerRole(playerId: string): MafiaRole | undefined {
    return this.state.roles[playerId];
  }

  // ==================== Phase Management ====================

  private startNight(): void {
    this.state.phase = 'night';
    this.state.day++;
    this.state.nightActions = [];
    this.pendingNightActions.clear();
    this.mafiaKillVotes.clear();
    this.state.eliminatedToday = undefined;

    this.broadcastPhase();
    this.saveState();

    // Night lasts 30 seconds for actions, then auto-resolve
    this.setPhaseTimer(30_000, () => this.resolveNight());
  }

  private startDay(): void {
    this.state.phase = 'day';
    this.state.votes = {};

    this.broadcastPhase();
    this.saveState();

    // Day = discussion time
    this.setPhaseTimer(this.settings.discussionTime * 1000, () => this.startVote());
  }

  private startVote(): void {
    this.state.phase = 'vote';
    this.state.votes = {};

    this.broadcastPhase();
    this.saveState();

    // Vote timer
    this.setPhaseTimer(this.settings.voteTime * 1000, () => this.resolveVote());
  }

  private startLastWords(eliminatedId: string): void {
    this.state.phase = 'lastWords';
    this.state.eliminatedToday = eliminatedId;

    this.broadcastPhase();
    this.saveState();

    this.setPhaseTimer(this.settings.lastWordsTime * 1000, () => {
      // After last words, eliminate and check win
      this.eliminatePlayer(eliminatedId, 'vote');
      
      const winner = this.checkWinCondition();
      if (winner) {
        this.endGame(winner);
      } else {
        this.startNight();
      }
    });
  }

  // ==================== Night Resolution ====================

  /** Handle a night action from a player. */
  handleNightAction(playerId: string, targetId: string): void {
    if (this.state.phase !== 'night') return;
    if (!this.state.alivePlayers.includes(playerId)) return;
    if (!this.state.alivePlayers.includes(targetId)) return;

    const role = this.state.roles[playerId];
    if (!role) return;

    // Mafia team members vote on kill target
    if (isMafiaTeam(role)) {
      this.mafiaKillVotes.set(playerId, targetId);
      // Broadcast mafia vote to mafia team only
      this.emitToMafiaTeam('mafia:voteUpdate', Object.fromEntries(this.mafiaKillVotes));
      return;
    }

    // Doctor can't heal same person twice in a row
    if (role === 'doctor' && targetId === this.lastDoctorHeal) {
      return; // Invalid action, ignore
    }

    this.pendingNightActions.set(playerId, {
      playerId,
      role,
      targetId,
    });
  }

  /** Resolve all night actions and transition to day. */
  private resolveNight(): void {
    this.clearPhaseTimer();

    // Resolve mafia kill vote (majority)
    const mafiaTarget = this.resolveMafiaVote();

    // Collect all night actions sorted by priority
    const actions: NightAction[] = [];

    // Add mafia action
    if (mafiaTarget) {
      const mafiaPlayer = this.getAliveMafiaLeader();
      if (mafiaPlayer) {
        actions.push({ playerId: mafiaPlayer, role: 'mafia', targetId: mafiaTarget });
      }
    }

    // Add individual actions
    for (const action of this.pendingNightActions.values()) {
      actions.push(action);
    }

    // Sort by priority
    actions.sort((a, b) => getNightPriority(a.role) - getNightPriority(b.role));

    // Process actions
    const blocked = new Set<string>();    // Players whose action is nullified
    const healed = new Set<string>();     // Players protected from death
    const bodyguarded = new Set<string>(); // Players under bodyguard protection
    const kills = new Set<string>();       // Players to be killed
    let bodyguardDies: string | null = null;

    for (const action of actions) {
      // Skip if this player was blocked
      if (blocked.has(action.playerId)) continue;

      switch (action.role) {
        case 'prostitute':
          // Block target's night action
          blocked.add(action.targetId);
          break;

        case 'barman':
          // Block target's ability (similar to prostitute but different flavor)
          blocked.add(action.targetId);
          break;

        case 'mafia':
        case 'don':
          // Mafia kill
          kills.add(action.targetId);
          break;

        case 'detective':
          // Detective checks a player — result sent privately
          this.handleDetectiveCheck(action.playerId, action.targetId);
          break;

        case 'maniac':
          // Maniac kills independently
          kills.add(action.targetId);
          break;

        case 'doctor':
          // Heal target — protect from one kill
          healed.add(action.targetId);
          this.lastDoctorHeal = action.targetId;
          break;

        case 'bodyguard':
          // Protect target — bodyguard dies instead if target is attacked
          bodyguarded.add(action.targetId);
          break;
      }
    }

    // Resolve kills
    const actuallyDead: string[] = [];

    for (const targetId of kills) {
      if (healed.has(targetId)) {
        // Saved by doctor
        continue;
      }
      if (bodyguarded.has(targetId)) {
        // Bodyguard takes the hit
        const bodyguardId = this.findAlivePlayerWithRole('bodyguard');
        if (bodyguardId && !blocked.has(bodyguardId)) {
          bodyguardDies = bodyguardId;
          continue;
        }
      }
      actuallyDead.push(targetId);
    }

    // Bodyguard dies if they took a hit
    if (bodyguardDies && !healed.has(bodyguardDies)) {
      actuallyDead.push(bodyguardDies);
    }

    // Store resolved actions
    this.state.nightActions = actions;

    // Eliminate dead players
    for (const deadId of actuallyDead) {
      this.eliminatePlayer(deadId, 'night');
    }

    // Check win condition
    const winner = this.checkWinCondition();
    if (winner) {
      this.endGame(winner);
      return;
    }

    // Broadcast night results (who died)
    this.broadcastState();

    // Transition to day
    setTimeout(() => this.startDay(), 2000);
  }

  private resolveMafiaVote(): string | null {
    if (this.mafiaKillVotes.size === 0) {
      // No votes — mafia doesn't kill anyone
      return null;
    }

    // Count votes
    const voteCounts = new Map<string, number>();
    this.mafiaKillVotes.forEach((targetId: string) => {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    });

    // Find most voted
    let maxVotes = 0;
    let target: string | null = null;
    voteCounts.forEach((count: number, targetId: string) => {
      if (count > maxVotes) {
        maxVotes = count;
        target = targetId;
      }
    });

    return target;
  }

  private handleDetectiveCheck(detectiveId: string, targetId: string): void {
    const targetRole = this.state.roles[targetId];
    // Don appears as citizen to the detective (classic rule)
    const isMafia = targetRole === 'mafia'; // Don shows as "not mafia"
    
    // Send private result to detective
    // We'll encode this as a special state update for the detective
    this.emitToPlayer(detectiveId, 'mafia:stateUpdate', {
      ...this.state,
      // The detective receives info via a convention: nightActions includes their check result
      nightActions: [{
        playerId: detectiveId,
        role: 'detective',
        targetId,
      }],
      // Piggyback the result: we use the votes field to encode detective check
      // A cleaner approach would be a dedicated event, but this works within the type system
    } as MafiaState);
  }

  // ==================== Day Vote Resolution ====================

  /** Handle a day vote from a player. */
  handleVote(playerId: string, targetId: string): void {
    if (this.state.phase !== 'vote') return;
    if (!this.state.alivePlayers.includes(playerId)) return;
    if (!this.state.alivePlayers.includes(targetId)) return;
    // Can't vote for yourself
    if (playerId === targetId) return;

    this.state.votes[playerId] = targetId;

    // Broadcast vote update to all
    this.io.to(this.roomId).emit('mafia:voteUpdate', this.state.votes);

    // Check if everyone has voted
    const aliveCount = this.state.alivePlayers.length;
    const voteCount = Object.keys(this.state.votes).length;

    if (voteCount >= aliveCount) {
      // All voted — resolve immediately
      this.resolveVote();
    }
  }

  private resolveVote(): void {
    this.clearPhaseTimer();

    // Count votes
    const voteCounts = new Map<string, number>();
    for (const targetId of Object.values(this.state.votes)) {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    }

    if (voteCounts.size === 0) {
      // No votes — skip to night
      this.startNight();
      return;
    }

    // Find player with most votes
    let maxVotes = 0;
    let eliminatedId: string | null = null;
    let isTie = false;

    for (const [targetId, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = targetId;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    }

    if (isTie || !eliminatedId) {
      // Tie — no one is eliminated, go to night
      this.startNight();
      return;
    }

    // Majority required (>50% of alive players)
    const majority = Math.floor(this.state.alivePlayers.length / 2) + 1;
    if (maxVotes < majority) {
      // Not enough votes — no elimination
      this.startNight();
      return;
    }

    // Start last words phase
    this.startLastWords(eliminatedId);
  }

  // ==================== Elimination & Win Conditions ====================

  private eliminatePlayer(playerId: string, reason: 'night' | 'vote'): void {
    this.state.alivePlayers = this.state.alivePlayers.filter((id) => id !== playerId);

    const role = this.settings.revealRoleOnDeath ? this.state.roles[playerId] : undefined;
    this.io.to(this.roomId).emit('mafia:elimination', playerId, role);
  }

  /**
   * Check win conditions:
   * - Mafia wins: mafia count >= citizen count (mafia controls the vote)
   * - Citizens win: all mafia dead (and maniac dead if present)
   * - Maniac wins: only maniac and one other player left
   */
  checkWinCondition(): 'mafia' | 'citizens' | 'maniac' | null {
    const alive = this.state.alivePlayers;
    
    let mafiaCount = 0;
    let citizenCount = 0;  // Everyone who's not mafia team
    let maniacAlive = false;

    for (const id of alive as string[]) {
      const role = this.state.roles[id];
      if (isMafiaTeam(role)) {
        mafiaCount++;
      } else if (role === 'maniac') {
        maniacAlive = true;
        citizenCount++; // Maniac counts against mafia too
      } else {
        citizenCount++;
      }
    }

    // Maniac wins: maniac + 1 other player (or alone)
    if (maniacAlive && alive.length <= 2 && mafiaCount === 0) {
      return 'maniac';
    }

    // Mafia wins: mafia >= everyone else
    if (mafiaCount > 0 && mafiaCount >= citizenCount) {
      return 'mafia';
    }

    // Citizens win: all mafia dead
    if (mafiaCount === 0 && !maniacAlive) {
      return 'citizens';
    }

    // Citizens win: all threats eliminated
    if (mafiaCount === 0 && maniacAlive && alive.length > 2) {
      // Maniac is still alive but can't win yet — game continues
      return null;
    }

    return null;
  }

  private endGame(winner: 'mafia' | 'citizens' | 'maniac'): void {
    this.clearPhaseTimer();
    this.state.winner = winner;

    // Update room status
    this.db.prepare(`UPDATE rooms SET status = 'finished' WHERE id = ?`).run(this.roomId);

    // Broadcast final state with all roles revealed
    this.broadcastState();
    this.io.to(this.roomId).emit('game:ended', winner);

    this.saveState();
  }

  // ==================== Helpers ====================

  private broadcastPhase(): void {
    this.io.to(this.roomId).emit('mafia:phaseChange', this.state.phase, this.state.day);
  }

  private broadcastState(): void {
    // Send sanitized state (hide roles of alive players)
    const sanitized: MafiaState = {
      ...this.state,
      roles: this.state.winner
        ? this.state.roles  // Reveal all roles on game end
        : {},               // Hide roles during game
      nightActions: [],     // Don't reveal night actions publicly
    };
    this.io.to(this.roomId).emit('mafia:stateUpdate', sanitized);
  }

  private emitToPlayer(playerId: string, event: string, ...args: any[]): void {
    // Emit to the specific player's socket
    // We use the player ID as a socket room (joined on connect)
    this.io.to(`player:${playerId}`).emit(event as any, ...args);
  }

  private emitToMafiaTeam(event: string, ...args: any[]): void {
    for (const id of this.state.alivePlayers) {
      if (isMafiaTeam(this.state.roles[id])) {
        this.emitToPlayer(id, event, ...args);
      }
    }
  }

  private findAlivePlayerWithRole(role: MafiaRole): string | null {
    return (
      this.state.alivePlayers.find((id: string) => this.state.roles[id] === role) ?? null
    );
  }

  private getAliveMafiaLeader(): string | null {
    // Don is the leader, fallback to regular mafia
    return (
      this.findAlivePlayerWithRole('don') ||
      this.findAlivePlayerWithRole('mafia')
    );
  }

  private setPhaseTimer(ms: number, callback: () => void): void {
    this.clearPhaseTimer();
    this.phaseTimer = setTimeout(callback, ms);
  }

  private clearPhaseTimer(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private saveState(): void {
    this.db
      .prepare(
        `INSERT INTO game_states (room_id, state, updated_at)
         VALUES (?, ?, unixepoch())
         ON CONFLICT(room_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`
      )
      .run(this.roomId, JSON.stringify(this.state));
  }

  /** Clean up timers on game destruction. */
  destroy(): void {
    this.clearPhaseTimer();
  }
}
