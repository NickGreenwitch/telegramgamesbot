/**
 * Character creation and class/race definitions for D&D.
 */

import type { DndCharacter, DndClass, DndRace, DndStats, DndItem } from '@party-games/shared';
import { rollAbilityScore, abilityModifier } from './dice.js';
import { nanoid } from 'nanoid';

// ===== Race bonuses =====

export const RACE_BONUSES: Record<DndRace, Partial<DndStats>> = {
  human:    { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
  elf:      { dexterity: 2, intelligence: 1 },
  dwarf:    { constitution: 2, wisdom: 1 },
  halfling: { dexterity: 2, charisma: 1 },
  orc:      { strength: 2, constitution: 1 },
  tiefling: { charisma: 2, intelligence: 1 },
};

export const RACE_HP_BONUS: Record<DndRace, number> = {
  human: 0,
  elf: 0,
  dwarf: 1,     // Dwarven toughness
  halfling: 0,
  orc: 1,       // Relentless endurance
  tiefling: 0,
};

// ===== Class definitions =====

export interface ClassDef {
  hitDie: number;           // HP per level die size (d6, d8, d10, d12)
  primaryStat: keyof DndStats;
  savingThrows: (keyof DndStats)[];
  startingItems: Omit<DndItem, 'id'>[];
  skills: string[];         // Available starting skills
  baseAC: number;           // Base armor class with starting gear
}

export const CLASS_DEFS: Record<DndClass, ClassDef> = {
  warrior: {
    hitDie: 10,
    primaryStat: 'strength',
    savingThrows: ['strength', 'constitution'],
    startingItems: [
      { name: 'Longsword', description: '1d8 slashing', type: 'weapon', quantity: 1 },
      { name: 'Shield', description: '+2 AC', type: 'armor', quantity: 1 },
      { name: 'Chain Mail', description: 'AC 16', type: 'armor', quantity: 1 },
      { name: 'Health Potion', description: 'Restore 2d4+2 HP', type: 'potion', quantity: 2 },
    ],
    skills: ['Athletics', 'Intimidation', 'Perception', 'Survival'],
    baseAC: 18, // Chain mail + shield
  },
  mage: {
    hitDie: 6,
    primaryStat: 'intelligence',
    savingThrows: ['intelligence', 'wisdom'],
    startingItems: [
      { name: 'Staff', description: '1d6 bludgeoning', type: 'weapon', quantity: 1 },
      { name: 'Spellbook', description: 'Contains your spells', type: 'misc', quantity: 1 },
      { name: 'Robes', description: 'AC 10', type: 'armor', quantity: 1 },
      { name: 'Mana Potion', description: 'Restore 1 spell slot', type: 'potion', quantity: 2 },
    ],
    skills: ['Arcana', 'History', 'Investigation', 'Insight'],
    baseAC: 10,
  },
  rogue: {
    hitDie: 8,
    primaryStat: 'dexterity',
    savingThrows: ['dexterity', 'intelligence'],
    startingItems: [
      { name: 'Dagger', description: '1d4 piercing, finesse', type: 'weapon', quantity: 2 },
      { name: 'Shortbow', description: '1d6 piercing, range 80/320', type: 'weapon', quantity: 1 },
      { name: 'Leather Armor', description: 'AC 11 + Dex', type: 'armor', quantity: 1 },
      { name: 'Thieves\' Tools', description: 'Lockpicking and traps', type: 'misc', quantity: 1 },
    ],
    skills: ['Stealth', 'Sleight of Hand', 'Acrobatics', 'Deception'],
    baseAC: 13, // Leather + typical dex
  },
  cleric: {
    hitDie: 8,
    primaryStat: 'wisdom',
    savingThrows: ['wisdom', 'charisma'],
    startingItems: [
      { name: 'Mace', description: '1d6 bludgeoning', type: 'weapon', quantity: 1 },
      { name: 'Holy Symbol', description: 'Divine focus', type: 'misc', quantity: 1 },
      { name: 'Scale Mail', description: 'AC 14 + Dex (max 2)', type: 'armor', quantity: 1 },
      { name: 'Health Potion', description: 'Restore 2d4+2 HP', type: 'potion', quantity: 3 },
    ],
    skills: ['Medicine', 'Religion', 'Insight', 'Persuasion'],
    baseAC: 16, // Scale mail + shield
  },
  ranger: {
    hitDie: 10,
    primaryStat: 'dexterity',
    savingThrows: ['strength', 'dexterity'],
    startingItems: [
      { name: 'Longbow', description: '1d8 piercing, range 150/600', type: 'weapon', quantity: 1 },
      { name: 'Shortsword', description: '1d6 piercing, finesse', type: 'weapon', quantity: 1 },
      { name: 'Studded Leather', description: 'AC 12 + Dex', type: 'armor', quantity: 1 },
      { name: 'Explorer\'s Pack', description: 'Rope, torch, rations', type: 'misc', quantity: 1 },
    ],
    skills: ['Animal Handling', 'Nature', 'Perception', 'Stealth'],
    baseAC: 14, // Studded leather + typical dex
  },
  bard: {
    hitDie: 8,
    primaryStat: 'charisma',
    savingThrows: ['dexterity', 'charisma'],
    startingItems: [
      { name: 'Rapier', description: '1d8 piercing, finesse', type: 'weapon', quantity: 1 },
      { name: 'Lute', description: 'Musical instrument', type: 'misc', quantity: 1 },
      { name: 'Leather Armor', description: 'AC 11 + Dex', type: 'armor', quantity: 1 },
      { name: 'Health Potion', description: 'Restore 2d4+2 HP', type: 'potion', quantity: 2 },
    ],
    skills: ['Performance', 'Persuasion', 'Deception', 'Acrobatics'],
    baseAC: 13,
  },
};

// ===== Character Creation =====

/**
 * Generate random ability scores using 4d6-drop-lowest method.
 */
export function generateRandomStats(): DndStats {
  return {
    strength: rollAbilityScore().total,
    dexterity: rollAbilityScore().total,
    constitution: rollAbilityScore().total,
    intelligence: rollAbilityScore().total,
    wisdom: rollAbilityScore().total,
    charisma: rollAbilityScore().total,
  };
}

/**
 * Standard point-buy array: 15, 14, 13, 12, 10, 8
 * Player assigns them to stats.
 */
export const STANDARD_ARRAY: number[] = [15, 14, 13, 12, 10, 8];

/**
 * Apply racial bonuses to stats.
 */
export function applyRaceBonuses(stats: DndStats, race: DndRace): DndStats {
  const bonuses = RACE_BONUSES[race];
  return {
    strength: stats.strength + (bonuses.strength || 0),
    dexterity: stats.dexterity + (bonuses.dexterity || 0),
    constitution: stats.constitution + (bonuses.constitution || 0),
    intelligence: stats.intelligence + (bonuses.intelligence || 0),
    wisdom: stats.wisdom + (bonuses.wisdom || 0),
    charisma: stats.charisma + (bonuses.charisma || 0),
  };
}

/**
 * Calculate starting HP: hit die max + constitution modifier + racial bonus.
 */
export function calculateStartingHP(cls: DndClass, race: DndRace, constitution: number): number {
  const classDef = CLASS_DEFS[cls];
  const conMod = abilityModifier(constitution);
  return classDef.hitDie + conMod + RACE_HP_BONUS[race];
}

/**
 * Calculate armor class from class base + dexterity modifier.
 * Warriors/clerics in heavy armor don't add dex.
 */
export function calculateAC(cls: DndClass, dexterity: number): number {
  const classDef = CLASS_DEFS[cls];
  const dexMod = abilityModifier(dexterity);

  switch (cls) {
    case 'warrior':
      return classDef.baseAC; // Heavy armor, no dex bonus
    case 'cleric':
      return 14 + Math.min(dexMod, 2) + 2; // Scale mail + shield
    case 'rogue':
    case 'bard':
      return 11 + dexMod; // Leather
    case 'ranger':
      return 12 + dexMod; // Studded leather
    case 'mage':
      return 10 + dexMod; // Robes
  }
}

/**
 * Get the attack modifier for a character's primary attack.
 */
export function getAttackModifier(character: DndCharacter): number {
  const classDef = CLASS_DEFS[character.class];
  const stat = character.stats[classDef.primaryStat];
  const proficiency = Math.floor((character.level - 1) / 4) + 2; // Prof bonus by level
  return abilityModifier(stat) + proficiency;
}

/**
 * Get the weapon damage dice for a character's class.
 */
export function getWeaponDamage(cls: DndClass): string {
  switch (cls) {
    case 'warrior':  return '1d8';   // Longsword
    case 'mage':     return '1d6';   // Staff
    case 'rogue':    return '1d4';   // Dagger (but gets sneak attack)
    case 'cleric':   return '1d6';   // Mace
    case 'ranger':   return '1d8';   // Longbow
    case 'bard':     return '1d8';   // Rapier
  }
}

/**
 * Create a new character with all stats computed.
 */
export function createCharacter(
  playerId: string,
  name: string,
  race: DndRace,
  cls: DndClass,
  baseStats: DndStats,
): DndCharacter {
  const stats = applyRaceBonuses(baseStats, race);
  const hp = calculateStartingHP(cls, race, stats.constitution);
  const classDef = CLASS_DEFS[cls];

  const inventory: DndItem[] = classDef.startingItems.map((item) => ({
    ...item,
    id: nanoid(8),
  }));

  return {
    id: nanoid(),
    playerId,
    name,
    race,
    class: cls,
    level: 1,
    hp,
    maxHp: hp,
    stats,
    inventory,
    skills: classDef.skills.slice(0, 2), // Pick first 2 by default
  };
}
