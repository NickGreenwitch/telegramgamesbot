/**
 * Battle system for D&D.
 * Handles initiative, turn order, attacks, spells, and damage resolution.
 */

import type { DndCharacter, DndClass, DndLogEntry, DiceRoll } from '@party-games/shared';
import { rollDice, rollInitiative, rollAttack, abilityModifier } from './dice.js';
import { getAttackModifier, getWeaponDamage, CLASS_DEFS } from './characters.js';

// ===== Battle Actions =====

export type BattleActionType = 'attack' | 'defend' | 'spell' | 'heal' | 'flee' | 'item';

export interface BattleAction {
  type: BattleActionType;
  actorId: string;
  targetId?: string;
  spellName?: string;
}

// ===== Spell Definitions (simplified) =====

export interface SpellDef {
  name: string;
  damage?: string;       // Dice notation, e.g. "3d6"
  healing?: string;       // Dice notation for healing
  aoe: boolean;           // Hits all enemies?
  description: string;
  availableTo: DndClass[];
}

export const SPELLS: SpellDef[] = [
  // Damage spells
  {
    name: 'Fireball',
    damage: '3d6',
    aoe: true,
    description: 'A ball of fire explodes, hitting all enemies',
    availableTo: ['mage'],
  },
  {
    name: 'Magic Missile',
    damage: '2d4+2',
    aoe: false,
    description: 'Bolts of magical force strike unerringly',
    availableTo: ['mage'],
  },
  {
    name: 'Lightning Bolt',
    damage: '3d8',
    aoe: false,
    description: 'A stroke of lightning blasts the target',
    availableTo: ['mage'],
  },
  // Healing
  {
    name: 'Cure Wounds',
    healing: '1d8+3',
    aoe: false,
    description: 'Divine energy heals an ally',
    availableTo: ['cleric', 'bard'],
  },
  {
    name: 'Healing Word',
    healing: '1d4+3',
    aoe: false,
    description: 'A whispered word restores health',
    availableTo: ['cleric', 'bard'],
  },
  {
    name: 'Mass Healing Word',
    healing: '1d4+2',
    aoe: true,
    description: 'A healing word reaches all allies',
    availableTo: ['cleric'],
  },
  // Utility/damage
  {
    name: 'Smite',
    damage: '2d8',
    aoe: false,
    description: 'Divine fury strikes down an enemy',
    availableTo: ['cleric'],
  },
  {
    name: 'Sneak Attack',
    damage: '2d6',
    aoe: false,
    description: 'Strike from the shadows for extra damage',
    availableTo: ['rogue'],
  },
  {
    name: 'Hunter\'s Mark',
    damage: '1d6',
    aoe: false,
    description: 'Mark a target — all attacks deal extra damage',
    availableTo: ['ranger'],
  },
  {
    name: 'Bardic Inspiration',
    healing: '1d6',
    aoe: false,
    description: 'Inspire an ally, boosting their resolve',
    availableTo: ['bard'],
  },
  {
    name: 'Heroic Strike',
    damage: '2d10',
    aoe: false,
    description: 'A devastating blow with all your might',
    availableTo: ['warrior'],
  },
];

/**
 * Get available spells for a character class.
 */
export function getAvailableSpells(cls: DndClass): SpellDef[] {
  return SPELLS.filter((s) => s.availableTo.includes(cls));
}

// ===== Initiative =====

export interface InitiativeEntry {
  playerId: string;
  characterId: string;
  roll: number;
}

/**
 * Roll initiative for all characters and return sorted turn order.
 */
export function rollAllInitiative(characters: DndCharacter[]): InitiativeEntry[] {
  const entries: InitiativeEntry[] = characters.map((c) => {
    const roll = rollInitiative(c.stats.dexterity);
    return {
      playerId: c.playerId,
      characterId: c.id,
      roll: roll.total,
    };
  });

  // Sort descending (highest goes first)
  entries.sort((a, b) => b.roll - a.roll);
  return entries;
}

// ===== Combat Resolution =====

export interface AttackResult {
  hit: boolean;
  critical: boolean;
  fumble: boolean;
  attackRoll: DiceRoll;
  damageRoll?: DiceRoll;
  totalDamage: number;
  log: string;
}

/**
 * Resolve a melee/ranged attack against a target.
 */
export function resolveAttack(
  attacker: DndCharacter,
  targetAC: number,
): AttackResult {
  const mod = getAttackModifier(attacker);
  const { roll, natural } = rollAttack(mod);

  const critical = natural === 20;
  const fumble = natural === 1;
  const hit = fumble ? false : (critical || roll.total >= targetAC);

  let damageRoll: DiceRoll | undefined;
  let totalDamage = 0;

  if (hit) {
    const damageDice = getWeaponDamage(attacker.class);
    damageRoll = rollDice(damageDice);
    totalDamage = damageRoll.total;

    // Critical hit: double dice damage
    if (critical) {
      const extraDamage = rollDice(damageDice);
      totalDamage += extraDamage.total;
      damageRoll.results.push(...extraDamage.results);
    }

    // Add ability modifier to damage
    const classDef = CLASS_DEFS[attacker.class];
    const dmgMod = abilityModifier(attacker.stats[classDef.primaryStat]);
    totalDamage += dmgMod;
    if (totalDamage < 1) totalDamage = 1;
  }

  let log = '';
  if (fumble) {
    log = `Critical fumble! The attack goes wildly off target.`;
  } else if (critical) {
    log = `Critical hit! Devastating blow for ${totalDamage} damage!`;
  } else if (hit) {
    log = `Hit! ${totalDamage} damage.`;
  } else {
    log = `Miss! The attack fails to penetrate defenses (rolled ${roll.total} vs AC ${targetAC}).`;
  }

  return { hit, critical, fumble, attackRoll: roll, damageRoll, totalDamage, log };
}

/**
 * Resolve a spell cast.
 */
export function resolveSpell(
  caster: DndCharacter,
  spell: SpellDef,
  targets: DndCharacter[],
): { results: Array<{ targetId: string; amount: number }>; log: string; roll: DiceRoll } {
  const diceNotation = spell.damage || spell.healing || '0';
  const roll = rollDice(diceNotation);

  // Add spellcasting ability modifier
  const classDef = CLASS_DEFS[caster.class];
  const spellMod = abilityModifier(caster.stats[classDef.primaryStat]);

  const results: Array<{ targetId: string; amount: number }> = [];
  const isHealing = Boolean(spell.healing);

  if (spell.aoe) {
    // AoE: each target takes/heals the same amount
    for (const t of targets) {
      const amount = Math.max(1, roll.total + (isHealing ? spellMod : 0));
      results.push({ targetId: t.id, amount });
    }
  } else {
    // Single target
    const target = targets[0];
    if (target) {
      const amount = Math.max(1, roll.total + spellMod);
      results.push({ targetId: target.id, amount });
    }
  }

  let log = '';
  if (isHealing) {
    const totalHealed = results.reduce((sum, r) => sum + r.amount, 0);
    log = `${caster.name} casts ${spell.name}! Heals for ${totalHealed} HP.`;
  } else {
    const totalDmg = results.reduce((sum, r) => sum + r.amount, 0);
    log = `${caster.name} casts ${spell.name}! ${spell.aoe ? 'Hits all enemies for' : 'Deals'} ${totalDmg} damage!`;
  }

  return { results, log, roll };
}

/**
 * Resolve defend action: gives +2 AC until next turn.
 */
export function resolveDefend(character: DndCharacter): string {
  return `${character.name} takes a defensive stance (+2 AC until next turn).`;
}

/**
 * Resolve flee attempt: d20 + dex mod vs DC 10.
 */
export function resolveFlee(character: DndCharacter): { success: boolean; log: string; roll: DiceRoll } {
  const mod = abilityModifier(character.stats.dexterity);
  const roll = rollDice(`d20${mod >= 0 ? '+' + mod : String(mod)}`);
  const success = roll.total >= 10;

  const log = success
    ? `${character.name} successfully flees from battle!`
    : `${character.name} tries to flee but is blocked! (rolled ${roll.total} vs DC 10)`;

  return { success, log, roll };
}
