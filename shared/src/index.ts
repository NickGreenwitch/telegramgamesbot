// ===== Room Types =====

export interface Room {
  id: string;
  code: string; // 6-char join code
  game: GameType;
  hostId: string;
  players: Player[];
  status: RoomStatus;
  settings: GameSettings;
  createdAt: number;
}

export type GameType = 'mafia' | 'dnd';
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string;
  telegramId: number;
  name: string;
  avatar?: string;
  isHost: boolean;
  isConnected: boolean;
}

// ===== Mafia Types =====

export type MafiaRole =
  | 'citizen'    // Мирный житель
  | 'mafia'      // Мафия
  | 'don'        // Дон мафии
  | 'detective'  // Комиссар
  | 'doctor'     // Доктор
  | 'maniac'     // Маньяк
  | 'prostitute' // Путана
  | 'bodyguard'  // Телохранитель
  | 'barman';    // Бармен

export type MafiaPhase = 'night' | 'day' | 'vote' | 'lastWords';

export interface MafiaState {
  phase: MafiaPhase;
  day: number;
  alivePlayers: string[];
  roles: Record<string, MafiaRole>;
  votes: Record<string, string>; // voterId -> targetId
  nightActions: NightAction[];
  eliminatedToday?: string;
  winner?: 'mafia' | 'citizens' | 'maniac';
}

export interface NightAction {
  playerId: string;
  role: MafiaRole;
  targetId: string;
}

export interface MafiaSettings {
  roles: MafiaRole[];
  discussionTime: number; // seconds
  voteTime: number;
  lastWordsTime: number;
  revealRoleOnDeath: boolean;
}

// ===== D&D Types =====

export type DndClass = 'warrior' | 'mage' | 'rogue' | 'cleric' | 'ranger' | 'bard';
export type DndRace = 'human' | 'elf' | 'dwarf' | 'halfling' | 'orc' | 'tiefling';

export interface DndCharacter {
  id: string;
  playerId: string;
  name: string;
  race: DndRace;
  class: DndClass;
  level: number;
  hp: number;
  maxHp: number;
  stats: DndStats;
  inventory: DndItem[];
  skills: string[];
}

export interface DndStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface DndItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'potion' | 'misc';
  quantity: number;
}

export interface DndState {
  dungeonMasterId: string;
  characters: DndCharacter[];
  currentScene: string;
  battleMode: boolean;
  turnOrder?: string[];
  currentTurn?: string;
  log: DndLogEntry[];
  availableSpells?: DndSpellInfo[];
}

export interface DndSpellInfo {
  name: string;
  description: string;
  isHealing: boolean;
  isAoe: boolean;
}

export interface DndLogEntry {
  timestamp: number;
  type: 'narrative' | 'roll' | 'action' | 'system';
  playerId?: string;
  text: string;
  roll?: DiceRoll;
}

export interface DiceRoll {
  dice: string; // e.g., "2d6+3"
  results: number[];
  modifier: number;
  total: number;
}

export interface DndSettings {
  maxPlayers: number;
  allowCustomCharacters: boolean;
}

// ===== D&D Character Creation Payload =====

export interface CreateCharacterPayload {
  name: string;
  race: DndRace;
  class: DndClass;
  stats: DndStats;
}

// ===== Game Settings Union =====

export type GameSettings = MafiaSettings | DndSettings;

// ===== Socket Events =====

export interface ServerToClientEvents {
  'room:updated': (room: Room) => void;
  'room:playerJoined': (player: Player) => void;
  'room:playerLeft': (playerId: string) => void;
  'game:started': () => void;
  'game:ended': (winner?: string) => void;

  // Mafia
  'mafia:stateUpdate': (state: MafiaState) => void;
  'mafia:phaseChange': (phase: MafiaPhase, day: number) => void;
  'mafia:roleAssigned': (role: MafiaRole) => void;
  'mafia:elimination': (playerId: string, role?: MafiaRole) => void;
  'mafia:voteUpdate': (votes: Record<string, string>) => void;

  // D&D
  'dnd:stateUpdate': (state: DndState) => void;
  'dnd:narrative': (text: string) => void;
  'dnd:rollResult': (entry: DndLogEntry) => void;
  'dnd:turnChange': (playerId: string) => void;
  'dnd:battleStart': (turnOrder: string[]) => void;
  'dnd:battleEnd': () => void;
  'dnd:characterCreated': (character: DndCharacter) => void;
  'dnd:error': (message: string) => void;
}

export interface ClientToServerEvents {
  'room:join': (code: string, player: Omit<Player, 'isHost' | 'isConnected'>) => void;
  'room:leave': () => void;
  'game:start': () => void;

  // Mafia
  'mafia:vote': (targetId: string) => void;
  'mafia:nightAction': (targetId: string) => void;

  // D&D
  'dnd:createCharacter': (payload: CreateCharacterPayload) => void;
  'dnd:action': (text: string) => void;
  'dnd:roll': (dice: string) => void;
  'dnd:narrative': (text: string) => void; // DM only
  'dnd:battleStart': () => void;           // DM only
  'dnd:battleEnd': () => void;             // DM only
  'dnd:battleAction': (action: string, targetId?: string) => void;
  'dnd:modifyHp': (targetCharacterId: string, amount: number) => void; // DM only
}

// ===== i18n =====

export type Locale = 'ru' | 'en';
