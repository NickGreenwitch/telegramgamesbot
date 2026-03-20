import type { MafiaRole, MafiaSettings } from '@party-games/shared';

/**
 * Role distribution presets by player count.
 * 
 * Balance principles:
 * - Mafia team ≈ 25-33% of players
 * - Don appears at 7+ players
 * - Special roles scale with player count
 * - Maniac (solo killer) only at 8+ players
 */

export interface RolePreset {
  minPlayers: number;
  maxPlayers: number;
  roles: MafiaRole[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    // 4 players: 1 mafia, 1 detective, 2 citizens
    minPlayers: 4,
    maxPlayers: 4,
    roles: ['mafia', 'detective', 'citizen', 'citizen'],
  },
  {
    // 5 players: 1 mafia, 1 detective, 1 doctor, 2 citizens
    minPlayers: 5,
    maxPlayers: 5,
    roles: ['mafia', 'detective', 'doctor', 'citizen', 'citizen'],
  },
  {
    // 6 players: 2 mafia, 1 detective, 1 doctor, 2 citizens
    minPlayers: 6,
    maxPlayers: 6,
    roles: ['mafia', 'mafia', 'detective', 'doctor', 'citizen', 'citizen'],
  },
  {
    // 7 players: 1 don, 1 mafia, 1 detective, 1 doctor, 3 citizens
    minPlayers: 7,
    maxPlayers: 7,
    roles: ['don', 'mafia', 'detective', 'doctor', 'citizen', 'citizen', 'citizen'],
  },
  {
    // 8 players: 1 don, 1 mafia, 1 detective, 1 doctor, 1 maniac, 3 citizens
    minPlayers: 8,
    maxPlayers: 8,
    roles: ['don', 'mafia', 'detective', 'doctor', 'maniac', 'citizen', 'citizen', 'citizen'],
  },
  {
    // 9 players: 1 don, 2 mafia, 1 detective, 1 doctor, 1 maniac, 3 citizens
    minPlayers: 9,
    maxPlayers: 9,
    roles: ['don', 'mafia', 'mafia', 'detective', 'doctor', 'maniac', 'citizen', 'citizen', 'citizen'],
  },
  {
    // 10 players: 1 don, 2 mafia, 1 detective, 1 doctor, 1 maniac, 1 prostitute, 3 citizens
    minPlayers: 10,
    maxPlayers: 10,
    roles: ['don', 'mafia', 'mafia', 'detective', 'doctor', 'maniac', 'prostitute', 'citizen', 'citizen', 'citizen'],
  },
  {
    // 11 players: 1 don, 2 mafia, 1 detective, 1 doctor, 1 maniac, 1 prostitute, 1 bodyguard, 3 citizens
    minPlayers: 11,
    maxPlayers: 11,
    roles: ['don', 'mafia', 'mafia', 'detective', 'doctor', 'maniac', 'prostitute', 'bodyguard', 'citizen', 'citizen', 'citizen'],
  },
  {
    // 12+ players: 1 don, 3 mafia, 1 detective, 1 doctor, 1 maniac, 1 prostitute, 1 bodyguard, 1 barman, rest citizens
    minPlayers: 12,
    maxPlayers: 20,
    roles: ['don', 'mafia', 'mafia', 'mafia', 'detective', 'doctor', 'maniac', 'prostitute', 'bodyguard', 'barman'],
  },
];

/**
 * Get roles for a given player count.
 * If custom roles are provided in settings, use those instead.
 */
export function distributeRoles(
  playerIds: string[],
  settings?: Partial<MafiaSettings>
): Record<string, MafiaRole> {
  const count = playerIds.length;
  
  let roles: MafiaRole[];
  
  if (settings?.roles && settings.roles.length === count) {
    // Custom role list from settings
    roles = [...settings.roles];
  } else {
    // Find preset
    const preset = ROLE_PRESETS.find(
      (p) => count >= p.minPlayers && count <= p.maxPlayers
    );
    
    if (!preset) {
      // Fallback for large games: use 12+ preset and pad with citizens
      const bigPreset = ROLE_PRESETS[ROLE_PRESETS.length - 1];
      roles = [...bigPreset.roles];
      while (roles.length < count) {
        roles.push('citizen');
      }
    } else {
      roles = [...preset.roles];
      // Pad with citizens if needed (shouldn't happen with correct presets)
      while (roles.length < count) {
        roles.push('citizen');
      }
    }
  }
  
  // Shuffle roles (Fisher-Yates)
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  // Assign to players
  const assignment: Record<string, MafiaRole> = {};
  playerIds.forEach((id, index) => {
    assignment[id] = roles[index];
  });
  
  return assignment;
}

/**
 * Check if a role belongs to the mafia team.
 */
export function isMafiaTeam(role: MafiaRole): boolean {
  return role === 'mafia' || role === 'don';
}

/**
 * Get the night action priority order.
 * Lower number = acts first.
 */
export function getNightPriority(role: MafiaRole): number {
  const priorities: Record<string, number> = {
    prostitute: 1,  // Blocks target first
    barman: 2,       // Blocks target's ability
    mafia: 3,        // Mafia kills (don votes with mafia)
    don: 3,          // Don checks + kills with mafia
    detective: 4,    // Detective checks
    maniac: 5,       // Maniac kills
    doctor: 6,       // Doctor heals (after kills decided)
    bodyguard: 7,    // Bodyguard protects (after kills decided)
    citizen: 99,     // No night action
  };
  return priorities[role] ?? 99;
}

/**
 * Default game settings.
 */
export function getDefaultSettings(): MafiaSettings {
  return {
    roles: [],
    discussionTime: 120,  // 2 minutes
    voteTime: 60,          // 1 minute
    lastWordsTime: 30,     // 30 seconds
    revealRoleOnDeath: true,
  };
}
