/**
 * Dice rolling utility for D&D.
 * Supports notation like: d20, 2d6, 1d8+3, 4d6-1
 */

export interface DiceResult {
  dice: string;       // Original notation
  results: number[];  // Individual die results
  modifier: number;   // +/- modifier
  total: number;      // Sum of results + modifier
}

/**
 * Parse and roll dice notation.
 * Examples: "d20", "2d6", "1d8+3", "4d6-1", "d100"
 */
export function rollDice(notation: string): DiceResult {
  const match = notation.trim().toLowerCase().match(/^(\d+)?d(\d+)([+-]\d+)?$/);
  if (!match) {
    return { dice: notation, results: [0], modifier: 0, total: 0 };
  }

  const count = parseInt(match[1] || '1', 10);
  const sides = parseInt(match[2], 10);
  const modifier = parseInt(match[3] || '0', 10);

  // Sanity limits
  if (count < 1 || count > 100 || sides < 1 || sides > 1000) {
    return { dice: notation, results: [0], modifier: 0, total: 0 };
  }

  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }

  const total = results.reduce((a, b) => a + b, 0) + modifier;

  return { dice: notation, results, modifier, total };
}

/**
 * Roll for ability score generation: 4d6 drop lowest.
 */
export function rollAbilityScore(): { results: number[]; dropped: number; total: number } {
  const results = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  results.sort((a, b) => a - b);
  const dropped = results[0];
  const kept = results.slice(1);
  const total = kept.reduce((a, b) => a + b, 0);
  return { results, dropped, total };
}

/**
 * Calculate ability modifier: (score - 10) / 2, rounded down.
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Roll initiative: d20 + dexterity modifier.
 */
export function rollInitiative(dexterity: number): DiceResult {
  const mod = abilityModifier(dexterity);
  const result = rollDice(`d20${mod >= 0 ? '+' + mod : String(mod)}`);
  return result;
}

/**
 * Roll attack: d20 + modifier, compare to AC.
 */
export function rollAttack(
  attackModifier: number
): { roll: DiceResult; natural: number } {
  const result = rollDice(`d20${attackModifier >= 0 ? '+' + attackModifier : String(attackModifier)}`);
  const natural = result.results[0]; // The d20 roll before modifier
  return { roll: result, natural };
}
