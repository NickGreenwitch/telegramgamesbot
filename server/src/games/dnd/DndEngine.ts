/**
 * D&D Game Engine
 *
 * Modes:
 *   1. Exploration — free-form RP, DM narrates, players act and roll
 *   2. Battle — structured turn-based combat
 *
 * The host player is the Dungeon Master (DM).
 * Other players create characters and play.
 *
 * Lifecycle:
 *   Character Creation → Exploration ↔ Battle → ... → Game End
 */

import type { Server } from 'socket.io';
import type {
  DndState,
  DndCharacter,
  DndLogEntry,
  DndClass,
  DndRace,
  DndStats,
  DiceRoll,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@party-games/shared';
import type { Db } from '../../db.js';
import { rollDice } from './dice.js';
import { createCharacter, calculateAC, CLASS_DEFS, getAttackModifier } from './characters.js';
import {
  rollAllInitiative,
  resolveAttack,
  resolveSpell,
  resolveDefend,
  resolveFlee,
  getAvailableSpells,
  type BattleAction,
  type SpellDef,
} from './battle.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export interface DndGameContext {
  roomId: string;
  dmPlayerId: string;
  playerIds: string[];  // All players including DM
  settings: {
    maxPlayers: number;
    allowCustomCharacters: boolean;
  };
}

// Temporary AC bonuses (e.g. from defend action)
interface TempBonus {
  playerId: string;
  acBonus: number;
  expiresAfterTurn: boolean;
}

export class DndEngine {
  private io: IO;
  private db: Db;
  private roomId: string;
  private dmPlayerId: string;

  private state: DndState;
  private characterMap: Map<string, DndCharacter> = new Map(); // playerId -> character
  private acMap: Map<string, number> = new Map();              // characterId -> calculated AC
  private tempBonuses: TempBonus[] = [];
  private turnTimer: ReturnType<typeof setTimeout> | null = null;

  // Track which players have created characters
  private readyPlayers: Set<string> = new Set();

  constructor(io: IO, db: Db, context: DndGameContext) {
    this.io = io;
    this.db = db;
    this.roomId = context.roomId;
    this.dmPlayerId = context.dmPlayerId;

    this.state = {
      dungeonMasterId: context.dmPlayerId,
      characters: [],
      currentScene: '',
      battleMode: false,
      log: [],
    };
  }

  // ==================== Lifecycle ====================

  /**
   * Start the game. DM is identified; other players need to create characters.
   */
  start(): void {
    this.addLog('system', `The adventure begins! The Dungeon Master prepares the tale...`);
    this.addLog('system', `Players, create your characters to join the adventure!`);
    this.broadcastState();
    this.saveState();
  }

  /** Get current state for reconnection. */
  getState(): DndState {
    return { ...this.state };
  }

  /** Get a specific player's character. */
  getCharacter(playerId: string): DndCharacter | undefined {
    return this.characterMap.get(playerId);
  }

  /** Check if a player is the DM. */
  isDM(playerId: string): boolean {
    return playerId === this.dmPlayerId;
  }

  // ==================== Character Management ====================

  /**
   * Create a character for a player.
   */
  handleCreateCharacter(
    playerId: string,
    name: string,
    race: DndRace,
    cls: DndClass,
    stats: DndStats,
  ): void {
    // DM doesn't create a character
    if (playerId === this.dmPlayerId) return;
    // Already has a character
    if (this.characterMap.has(playerId)) return;

    const character = createCharacter(playerId, name, race, cls, stats);
    const ac = calculateAC(cls, character.stats.dexterity);

    this.characterMap.set(playerId, character);
    this.acMap.set(character.id, ac);
    this.state.characters.push(character);
    this.readyPlayers.add(playerId);

    this.addLog('system', `${name} the ${race} ${cls} joins the party!`);
    this.broadcastState();
    this.saveState();
  }

  // ==================== Exploration Mode ====================

  /**
   * DM sends narrative text to all players.
   */
  handleNarrative(playerId: string, text: string): void {
    if (playerId !== this.dmPlayerId) return;

    this.state.currentScene = text;
    this.addLog('narrative', text, playerId);

    this.io.to(this.roomId).emit('dnd:narrative', text);
    this.broadcastState();
    this.saveState();
  }

  /**
   * Player performs an action (free text). DM decides outcome.
   * We auto-roll if the action seems to need a skill check.
   */
  handleAction(playerId: string, text: string): void {
    if (playerId === this.dmPlayerId) return;
    if (this.state.battleMode) return; // Use battle actions in combat

    const character = this.characterMap.get(playerId);
    if (!character) return;

    this.addLog('action', `${character.name}: ${text}`, playerId);
    this.broadcastState();
    this.saveState();
  }

  /**
   * Player rolls dice (exploration or any time).
   */
  handleRoll(playerId: string, dice: string): void {
    const character = this.characterMap.get(playerId);
    const result = rollDice(dice);

    const entry: DndLogEntry = {
      timestamp: Date.now(),
      type: 'roll',
      playerId,
      text: `${character?.name || 'DM'} rolled ${dice}: [${result.results.join(', ')}]${result.modifier ? (result.modifier > 0 ? '+' : '') + result.modifier : ''} = ${result.total}`,
      roll: result,
    };

    this.state.log.push(entry);
    this.io.to(this.roomId).emit('dnd:rollResult', entry);
    this.broadcastState();
    this.saveState();
  }

  // ==================== Battle Mode ====================

  /**
   * DM starts a battle encounter.
   */
  handleBattleStart(playerId: string): void {
    if (playerId !== this.dmPlayerId) return;
    if (this.state.battleMode) return;

    // Only alive characters participate
    const aliveCharacters = this.state.characters.filter((c: DndCharacter) => c.hp > 0);
    if (aliveCharacters.length === 0) return;

    // Roll initiative
    const initiative = rollAllInitiative(aliveCharacters);
    const turnOrder = initiative.map((e) => e.playerId);

    this.state.battleMode = true;
    this.state.turnOrder = turnOrder;
    this.state.currentTurn = turnOrder[0];

    // Log initiative results
    const initiativeLog = initiative
      .map((e: { playerId: string; characterId: string; roll: number }, i: number) => {
        const char = aliveCharacters.find((c: DndCharacter) => c.playerId === e.playerId);
        return `${i + 1}. ${char?.name || '???'} (${e.roll})`;
      })
      .join(', ');
    this.addLog('system', `⚔️ Battle begins! Initiative: ${initiativeLog}`);

    this.io.to(this.roomId).emit('dnd:battleStart', turnOrder);
    this.io.to(this.roomId).emit('dnd:turnChange', turnOrder[0]);
    this.broadcastState();
    this.saveState();

    // Turn timer: 60 seconds per turn
    this.startTurnTimer();
  }

  /**
   * DM ends the battle.
   */
  handleBattleEnd(playerId: string): void {
    if (playerId !== this.dmPlayerId) return;
    if (!this.state.battleMode) return;

    this.state.battleMode = false;
    this.state.turnOrder = undefined;
    this.state.currentTurn = undefined;
    this.tempBonuses = [];
    this.clearTurnTimer();

    this.addLog('system', `🕊️ Battle has ended!`);

    this.io.to(this.roomId).emit('dnd:battleEnd');
    this.broadcastState();
    this.saveState();
  }

  /**
   * Handle a battle action from the current player.
   */
  handleBattleAction(playerId: string, action: string, targetId?: string): void {
    if (!this.state.battleMode) return;
    if (this.state.currentTurn !== playerId) return;

    const character = this.characterMap.get(playerId);
    if (!character || character.hp <= 0) return;

    switch (action) {
      case 'attack':
        this.resolveBattleAttack(character, targetId);
        break;
      case 'defend':
        this.resolveBattleDefend(character);
        break;
      case 'spell':
        this.resolveBattleSpell(character, targetId);
        break;
      case 'heal':
        this.resolveBattleHeal(character, targetId);
        break;
      case 'flee':
        this.resolveBattleFlee(character);
        break;
      case 'item':
        this.resolveBattleItem(character, targetId);
        break;
      default:
        return; // Unknown action
    }

    // Advance to next turn
    this.advanceTurn();
  }

  // ===== Battle Action Resolution =====

  private resolveBattleAttack(attacker: DndCharacter, targetId?: string): void {
    const target = targetId
      ? this.state.characters.find((c: DndCharacter) => c.id === targetId)
      : undefined;

    if (!target || target.hp <= 0) {
      this.addLog('system', `${attacker.name} attacks but finds no valid target!`);
      return;
    }

    // Get target AC (with temp bonuses)
    const baseAC = this.acMap.get(target.id) || 10;
    const bonus = this.tempBonuses
      .filter((b) => b.playerId === target.playerId)
      .reduce((sum, b) => sum + b.acBonus, 0);
    const targetAC = baseAC + bonus;

    const result = resolveAttack(attacker, targetAC);

    if (result.hit) {
      target.hp = Math.max(0, target.hp - result.totalDamage);
      this.addLog('action', `⚔️ ${attacker.name} attacks ${target.name}! ${result.log}`, attacker.playerId, result.attackRoll);

      if (target.hp <= 0) {
        this.addLog('system', `💀 ${target.name} has fallen!`);
      }
    } else {
      this.addLog('action', `⚔️ ${attacker.name} attacks ${target.name}! ${result.log}`, attacker.playerId, result.attackRoll);
    }
  }

  private resolveBattleDefend(character: DndCharacter): void {
    const log = resolveDefend(character);
    this.tempBonuses.push({
      playerId: character.playerId,
      acBonus: 2,
      expiresAfterTurn: true,
    });
    this.addLog('action', `🛡️ ${log}`, character.playerId);
  }

  private resolveBattleSpell(caster: DndCharacter, targetId?: string): void {
    // Get first available damage spell for this class
    const spells = getAvailableSpells(caster.class).filter((s) => s.damage);
    if (spells.length === 0) {
      this.addLog('system', `${caster.name} has no attack spells!`);
      return;
    }

    // Use the strongest available spell
    const spell = spells[0];
    const targets: DndCharacter[] = [];

    if (spell.aoe) {
      // AoE targets all other characters (enemies — in PvE this would be monsters)
      // For simplicity, target all other alive characters
      targets.push(...this.state.characters.filter(
        (c) => c.id !== caster.id && c.hp > 0
      ));
    } else if (targetId) {
      const target = this.state.characters.find((c: DndCharacter) => c.id === targetId);
      if (target && target.hp > 0) targets.push(target);
    }

    if (targets.length === 0) {
      this.addLog('system', `${caster.name} casts ${spell.name} but there are no targets!`);
      return;
    }

    const result = resolveSpell(caster, spell, targets);

    // Apply damage
    for (const r of result.results) {
      const target = this.state.characters.find((c: DndCharacter) => c.id === r.targetId);
      if (target) {
        target.hp = Math.max(0, target.hp - r.amount);
        if (target.hp <= 0) {
          this.addLog('system', `💀 ${target.name} has fallen!`);
        }
      }
    }

    this.addLog('action', `✨ ${result.log}`, caster.playerId, result.roll);
  }

  private resolveBattleHeal(healer: DndCharacter, targetId?: string): void {
    // Get healing spell
    const spells = getAvailableSpells(healer.class).filter((s) => s.healing);
    if (spells.length === 0) {
      this.addLog('system', `${healer.name} has no healing abilities!`);
      return;
    }

    const spell = spells[0];
    const targets: DndCharacter[] = [];

    if (spell.aoe) {
      targets.push(...this.state.characters.filter((c: DndCharacter) => c.hp > 0 && c.hp < c.maxHp));
    } else if (targetId) {
      const target = this.state.characters.find((c: DndCharacter) => c.id === targetId);
      if (target) targets.push(target);
    } else {
      // Self-heal
      targets.push(healer);
    }

    if (targets.length === 0) {
      this.addLog('system', `${healer.name} tries to heal but finds no one who needs it!`);
      return;
    }

    const result = resolveSpell(healer, spell, targets);

    // Apply healing
    for (const r of result.results) {
      const target = this.state.characters.find((c: DndCharacter) => c.id === r.targetId);
      if (target) {
        target.hp = Math.min(target.maxHp, target.hp + r.amount);
      }
    }

    this.addLog('action', `💚 ${result.log}`, healer.playerId, result.roll);
  }

  private resolveBattleFlee(character: DndCharacter): void {
    const result = resolveFlee(character);
    this.addLog('action', `🏃 ${result.log}`, character.playerId, result.roll);

    if (result.success) {
      // Remove from turn order
      if (this.state.turnOrder) {
        this.state.turnOrder = this.state.turnOrder.filter((id: string) => id !== character.playerId);
      }
    }
  }

  private resolveBattleItem(character: DndCharacter, _targetId?: string): void {
    // Use first potion in inventory
    const potionIndex = character.inventory.findIndex((i) => i.type === 'potion' && i.quantity > 0);
    if (potionIndex === -1) {
      this.addLog('system', `${character.name} has no potions to use!`);
      return;
    }

    const potion = character.inventory[potionIndex];
    const healRoll = rollDice('2d4+2');
    const healed = healRoll.total;
    character.hp = Math.min(character.maxHp, character.hp + healed);
    potion.quantity--;

    if (potion.quantity <= 0) {
      character.inventory.splice(potionIndex, 1);
    }

    this.addLog(
      'action',
      `🧪 ${character.name} uses ${potion.name}! Heals for ${healed} HP.`,
      character.playerId,
      healRoll,
    );
  }

  // ===== Turn Management =====

  private advanceTurn(): void {
    this.clearTurnTimer();

    // Clear expired temp bonuses for current turn player
    this.tempBonuses = this.tempBonuses.filter((b) => {
      if (b.playerId === this.state.currentTurn && b.expiresAfterTurn) return false;
      return true;
    });

    if (!this.state.turnOrder || this.state.turnOrder.length === 0) {
      this.handleBattleEnd(this.dmPlayerId);
      return;
    }

    // Remove dead players from turn order
    this.state.turnOrder = this.state.turnOrder.filter((pid: string) => {
      const char = this.characterMap.get(pid);
      return char && char.hp > 0;
    });

    if (this.state.turnOrder.length <= 1) {
      // Only one player left — battle over
      this.handleBattleEnd(this.dmPlayerId);
      return;
    }

    // Find next turn
    const currentIndex = this.state.turnOrder.indexOf(this.state.currentTurn!);
    const nextIndex = (currentIndex + 1) % this.state.turnOrder.length;
    this.state.currentTurn = this.state.turnOrder[nextIndex];

    this.io.to(this.roomId).emit('dnd:turnChange', this.state.currentTurn);
    this.broadcastState();
    this.saveState();

    this.startTurnTimer();
  }

  private startTurnTimer(): void {
    this.clearTurnTimer();
    // 60 second turn timer — auto-defend if time runs out
    this.turnTimer = setTimeout(() => {
      if (this.state.currentTurn) {
        const character = this.characterMap.get(this.state.currentTurn);
        if (character) {
          this.addLog('system', `⏰ ${character.name} ran out of time — defending!`);
          this.resolveBattleDefend(character);
        }
        this.advanceTurn();
      }
    }, 60_000);
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  // ==================== DM Commands ====================

  /**
   * DM can damage or heal characters directly (for monsters, traps, etc).
   */
  handleDmModifyHp(playerId: string, targetCharacterId: string, amount: number): void {
    if (playerId !== this.dmPlayerId) return;

    const character = this.state.characters.find((c: DndCharacter) => c.id === targetCharacterId);
    if (!character) return;

    if (amount > 0) {
      character.hp = Math.min(character.maxHp, character.hp + amount);
      this.addLog('system', `🎲 DM heals ${character.name} for ${amount} HP.`);
    } else {
      character.hp = Math.max(0, character.hp + amount);
      this.addLog('system', `🎲 DM deals ${Math.abs(amount)} damage to ${character.name}.`);
      if (character.hp <= 0) {
        this.addLog('system', `💀 ${character.name} has fallen!`);
      }
    }

    this.broadcastState();
    this.saveState();
  }

  // ==================== Helpers ====================

  private addLog(type: DndLogEntry['type'], text: string, playerId?: string, roll?: DiceRoll): void {
    const entry: DndLogEntry = {
      timestamp: Date.now(),
      type,
      text,
      playerId,
      roll,
    };
    this.state.log.push(entry);

    // Keep log manageable — last 200 entries
    if (this.state.log.length > 200) {
      this.state.log = this.state.log.slice(-200);
    }
  }

  private broadcastState(): void {
    this.io.to(this.roomId).emit('dnd:stateUpdate', this.state);
  }

  private saveState(): void {
    this.db
      .prepare(
        `INSERT INTO game_states (room_id, state, updated_at)
         VALUES (?, ?, unixepoch())
         ON CONFLICT(room_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
      )
      .run(this.roomId, JSON.stringify(this.state));
  }

  /** Clean up timers. */
  destroy(): void {
    this.clearTurnTimer();
  }
}
