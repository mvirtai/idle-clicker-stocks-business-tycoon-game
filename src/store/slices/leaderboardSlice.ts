import { StateCreator } from 'zustand';
import { GameStore } from '../useGameStore';
import {
  LeaderboardMinigameType,
  MinigameScoreEntry,
  MinigameSubmissionPayload,
  MinigameSubmissionResult,
  RivalContractor,
} from '../../types/leaderboard';

const STORAGE_KEY_SCORES = 'gigs_to_giants_scores_v1';
const STORAGE_KEY_CALLSIGN = 'gigs_to_giants_callsign_v1';

export const INITIAL_RIVAL_CONTRACTORS: RivalContractor[] = [
  {
    id: 'rival-1',
    name: 'Kalle Vuorinen',
    companyName: 'Nordic Grid Automation Oyj',
    specialty: 'Voimalaitosten tahdistus & pörssisijoitukset',
    netWorth: 285000,
    reputation: 190,
    completedGigs: 84,
    badge: 'Teollisuusmagnaatti',
  },
  {
    id: 'rival-2',
    name: 'Sari Lindholm',
    companyName: 'KvanttiSähkö & Logiikka Oy',
    specialty: 'Sairaalaverkot & KNX-automaatio',
    netWorth: 142000,
    reputation: 155,
    completedGigs: 52,
    badge: 'Pääurakoitsija',
  },
  {
    id: 'rival-3',
    name: 'Jukka Korhonen',
    companyName: 'Pohjolan Keskusasennus Oy',
    specialty: 'Teollisuuskeskukset & moottorilähdöt',
    netWorth: 68500,
    reputation: 115,
    completedGigs: 34,
    badge: 'Kokenut Urakoitsija',
  },
  {
    id: 'rival-4',
    name: 'Mikko Salonen',
    companyName: 'Tmi Automaatio-Salonen',
    specialty: 'Taajuusmuuttajat & vianetsintä',
    netWorth: 24800,
    reputation: 78,
    completedGigs: 19,
    badge: 'Kenttämestari',
  },
  {
    id: 'rival-5',
    name: 'Pentti Rantanen',
    companyName: 'Sähkö-Pena Ky',
    specialty: 'Kiinteistöhuolto & sulaketaulut',
    netWorth: 4200,
    reputation: 42,
    completedGigs: 9,
    badge: 'Keikka-asentaja',
  },
];

export const INITIAL_MINIGAME_BENCHMARKS: MinigameScoreEntry[] = [
  // Vaihetahdistus (Timing)
  {
    id: 'bench-tim-1',
    playerName: 'Kalle Vuorinen',
    companyName: 'Nordic Grid Automation',
    isPlayer: false,
    minigameType: 'timing',
    gigName: 'Kaupunkipanimo & Tislaamo',
    score: 1480,
    precision: 96.4,
    durationSeconds: 34.2,
    grade: 'perfect',
    details: '24/24 sykliä · Putki 18x 🔥',
    week: 1,
    timestamp: Date.now() - 86400000 * 5,
  },
  {
    id: 'bench-tim-2',
    playerName: 'Sari Lindholm',
    companyName: 'KvanttiSähkö Oy',
    isPlayer: false,
    minigameType: 'timing',
    gigName: 'Kattoterassi Skybar',
    score: 1310,
    precision: 91.2,
    durationSeconds: 38.5,
    grade: 'perfect',
    details: '22/24 sykliä · Putki 11x 🔥',
    week: 1,
    timestamp: Date.now() - 86400000 * 4,
  },
  {
    id: 'bench-tim-3',
    playerName: 'Jukka Korhonen',
    companyName: 'Pohjolan Keskusasennus',
    isPlayer: false,
    minigameType: 'timing',
    gigName: 'Kattoterassi Skybar',
    score: 1120,
    precision: 82.5,
    durationSeconds: 41.0,
    grade: 'good',
    details: '20/24 sykliä · Putki 7x 🔥',
    week: 1,
    timestamp: Date.now() - 86400000 * 3,
  },
  {
    id: 'bench-tim-4',
    playerName: 'Pentti Rantanen',
    companyName: 'Sähkö-Pena Ky',
    isPlayer: false,
    minigameType: 'timing',
    gigName: 'Varavoimageneraattori',
    score: 890,
    precision: 68.0,
    durationSeconds: 46.8,
    grade: 'good',
    details: '17/24 sykliä · Putki 4x',
    week: 1,
    timestamp: Date.now() - 86400000 * 2,
  },

  // Keskuskytkentä (Wiring)
  {
    id: 'bench-wir-1',
    playerName: 'Jukka Korhonen',
    companyName: 'Pohjolan Keskusasennus',
    isPlayer: false,
    minigameType: 'wiring',
    gigName: 'Keskussairaalan Valoverkko',
    score: 1520,
    precision: 100.0,
    durationSeconds: 18.4,
    grade: 'perfect',
    details: '12/12 johdinta · 0 virhettä · SFS 6000 OK',
    week: 1,
    timestamp: Date.now() - 86400000 * 5,
  },
  {
    id: 'bench-wir-2',
    playerName: 'Sari Lindholm',
    companyName: 'KvanttiSähkö Oy',
    isPlayer: false,
    minigameType: 'wiring',
    gigName: 'Yökerho Bassoclub',
    score: 1380,
    precision: 100.0,
    durationSeconds: 26.2,
    grade: 'perfect',
    details: '12/12 johdinta · 0 virhettä · SFS 6000 OK',
    week: 1,
    timestamp: Date.now() - 86400000 * 4,
  },
  {
    id: 'bench-wir-3',
    playerName: 'Mikko Salonen',
    companyName: 'Tmi Automaatio-Salonen',
    isPlayer: false,
    minigameType: 'wiring',
    gigName: 'Yökerho Bassoclub',
    score: 1160,
    precision: 91.7,
    durationSeconds: 34.0,
    grade: 'perfect',
    details: '12/12 johdinta · 1 korjaus',
    week: 1,
    timestamp: Date.now() - 86400000 * 3,
  },
  {
    id: 'bench-wir-4',
    playerName: 'Pentti Rantanen',
    companyName: 'Sähkö-Pena Ky',
    isPlayer: false,
    minigameType: 'wiring',
    gigName: 'Pumppaamon ohjauskeskus',
    score: 910,
    precision: 75.0,
    durationSeconds: 49.5,
    grade: 'good',
    details: '10/12 johdinta · 2 virhekytkentää',
    week: 1,
    timestamp: Date.now() - 86400000 * 2,
  },

  // Vianetsintä (Troubleshooting)
  {
    id: 'bench-trb-1',
    playerName: 'Mikko Salonen',
    companyName: 'Tmi Automaatio-Salonen',
    isPlayer: false,
    minigameType: 'troubleshooting',
    gigName: 'Retro Arcadia Pelihalli',
    score: 1490,
    precision: 100.0,
    durationSeconds: 15.2,
    grade: 'perfect',
    details: '2 mittausta · 0 turhaa osaa · Sulake F1',
    week: 1,
    timestamp: Date.now() - 86400000 * 5,
  },
  {
    id: 'bench-trb-2',
    playerName: 'Kalle Vuorinen',
    companyName: 'Nordic Grid Automation',
    isPlayer: false,
    minigameType: 'troubleshooting',
    gigName: 'Kahvila & Bistro Kulttikupla',
    score: 1360,
    precision: 97.0,
    durationSeconds: 22.8,
    grade: 'perfect',
    details: '4 mittausta · 0 turhaa osaa · Lämpörele F2',
    week: 1,
    timestamp: Date.now() - 86400000 * 4,
  },
  {
    id: 'bench-trb-3',
    playerName: 'Sari Lindholm',
    companyName: 'KvanttiSähkö Oy',
    isPlayer: false,
    minigameType: 'troubleshooting',
    gigName: 'Kahvila & Bistro Kulttikupla',
    score: 1180,
    precision: 88.0,
    durationSeconds: 31.4,
    grade: 'perfect',
    details: '6 mittausta · 0 turhaa osaa · Kontaktori K1',
    week: 1,
    timestamp: Date.now() - 86400000 * 3,
  },
  {
    id: 'bench-trb-4',
    playerName: 'Pentti Rantanen',
    companyName: 'Sähkö-Pena Ky',
    isPlayer: false,
    minigameType: 'troubleshooting',
    gigName: 'Ilmanvaihtokoneikko',
    score: 840,
    precision: 70.0,
    durationSeconds: 45.0,
    grade: 'good',
    details: '5 mittausta · 1 turha varaosavaihto',
    week: 1,
    timestamp: Date.now() - 86400000 * 2,
  },
];

function loadSavedScores(): MinigameScoreEntry[] {
  try {
    if (typeof window === 'undefined') return INITIAL_MINIGAME_BENCHMARKS;
    const raw = window.localStorage.getItem(STORAGE_KEY_SCORES);
    if (!raw) return INITIAL_MINIGAME_BENCHMARKS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Fallback
  }
  return INITIAL_MINIGAME_BENCHMARKS;
}

function loadSavedCallsign(): string {
  try {
    if (typeof window === 'undefined') return 'Valtteri Virtanen';
    return window.localStorage.getItem(STORAGE_KEY_CALLSIGN) || 'Valtteri Virtanen';
  } catch {
    return 'Valtteri Virtanen';
  }
}

export interface LeaderboardSlice {
  playerCallsign: string;
  minigameScores: MinigameScoreEntry[];
  rivalContractors: RivalContractor[];
  setPlayerCallsign: (name: string) => void;
  recordMinigameScore: (payload: MinigameSubmissionPayload) => MinigameSubmissionResult;
  getScoresByMinigame: (type: LeaderboardMinigameType) => MinigameScoreEntry[];
  getPlayerBestScore: (type: LeaderboardMinigameType) => MinigameScoreEntry | null;
  resetLeaderboardScores: () => void;
}

export const createLeaderboardSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  LeaderboardSlice
> = (set, get) => ({
  playerCallsign: loadSavedCallsign(),
  minigameScores: loadSavedScores(),
  rivalContractors: INITIAL_RIVAL_CONTRACTORS,

  setPlayerCallsign: (name) => {
    const clean = name.trim() || 'Valtteri Virtanen';
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY_CALLSIGN, clean);
      }
    } catch {
      // Ignore storage error
    }
    set({ playerCallsign: clean }, false, 'leaderboard/setPlayerCallsign');
  },

  recordMinigameScore: (payload) => {
    const state = get();
    const { minigameType, gigName, precision, durationSeconds, bonusPoints = 0, details } = payload;

    // Pistekaava:
    // Tarkkuus (max 1000p) + Nopeusbonus (max 360p) + Erikoisbonus (putki/virheettömyys)
    const basePrecisionPoints = Math.round(precision * 10);
    const targetDuration = minigameType === 'timing' ? 50 : 45;
    const speedBonus = Math.max(0, Math.round((targetDuration - durationSeconds) * 8));
    const compositeScore = Math.max(100, basePrecisionPoints + speedBonus + Math.round(bonusPoints));

    const grade: 'perfect' | 'good' | 'fail' =
      precision >= 85 ? 'perfect' : precision >= 55 ? 'good' : 'fail';

    const existingForType = state.minigameScores.filter(
      (s) => s.minigameType === minigameType
    );
    const existingPlayerBest = existingForType
      .filter((s) => s.isPlayer)
      .reduce<number>((max, s) => Math.max(max, s.score), 0);
    const existingTrackBest = existingForType.reduce<number>(
      (max, s) => Math.max(max, s.score),
      0
    );

    const newEntry: MinigameScoreEntry = {
      id: `score-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      playerName: state.playerCallsign,
      companyName: state.hasCompanyBought ? state.company.name : 'Freelance Sähkö & Automaatio',
      isPlayer: true,
      minigameType,
      gigName,
      score: compositeScore,
      precision: Math.round(precision * 10) / 10,
      durationSeconds: Math.round(durationSeconds * 10) / 10,
      grade,
      details,
      week: state.week,
      timestamp: Date.now(),
    };

    const updatedScores = [newEntry, ...state.minigameScores].sort((a, b) => b.score - a.score);

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(updatedScores.slice(0, 80)));
      }
    } catch {
      // Ignore storage error
    }

    set({ minigameScores: updatedScores }, false, 'leaderboard/recordMinigameScore');

    const sortedType = updatedScores.filter((s) => s.minigameType === minigameType);
    const rank = sortedType.findIndex((s) => s.id === newEntry.id) + 1;

    return {
      entry: newEntry,
      rank: rank > 0 ? rank : 1,
      isNewPersonalBest: compositeScore > existingPlayerBest,
      isNewTrackRecord: compositeScore > existingTrackBest,
    };
  },

  getScoresByMinigame: (type) => {
    return get()
      .minigameScores.filter((s) => s.minigameType === type)
      .sort((a, b) => b.score - a.score);
  },

  getPlayerBestScore: (type) => {
    const playerScores = get()
      .minigameScores.filter((s) => s.minigameType === type && s.isPlayer)
      .sort((a, b) => b.score - a.score);
    return playerScores[0] || null;
  },

  resetLeaderboardScores: () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY_SCORES);
      }
    } catch {
      // Ignore
    }
    set({ minigameScores: INITIAL_MINIGAME_BENCHMARKS }, false, 'leaderboard/resetScores');
  },
});
