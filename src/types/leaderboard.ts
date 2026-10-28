/**
 * TULOSTAULUJEN JA MINIPELIEN PISTEYTYKSEN TIETOMALLIT (LEADERBOARDS & TELEMETRY)
 *
 * Senioriarkkitehdin opetus:
 * Pelillistetyssä simulaatiossa pelkkä "onnistui / epäonnistui" ei riitä
 * pitämään yllä motivaatiota. Tallentamalla jokaisesta minipelisuorituksesta
 * moniulotteisen telemetrian (tarkkuus %, suoritusaika sekunteina, virheet,
 * pisin putki ja yhdistelmäpisteet) voimme rakentaa:
 * 1. Lajikohtaiset huipputulostaulut (Vaihetahdistus, Keskuskytkentä, Vianetsintä)
 * 2. Henkilökohtaisen kehityshistorian ja ennätysseurannan (Personal Best)
 * 3. Valtakunnallisen Urakoitsija- ja Pörssiparonien kokonaisrankingin (Net Worth Leaderboard)
 */

export type LeaderboardMinigameType = 'timing' | 'wiring' | 'troubleshooting';

export interface MinigameScoreEntry {
  id: string;
  playerName: string;
  companyName: string;
  isPlayer: boolean;
  minigameType: LeaderboardMinigameType;
  gigName: string;
  score: number; // Yhdistelmäpisteet (Tarkkuus + Nopeusbonus + Putkibonus - Virhesakko)
  precision: number; // 0 - 100 %
  durationSeconds: number; // Suoritusaika sekunteina
  grade: 'perfect' | 'good' | 'fail';
  details: string; // Esim. "24/24 sykliä · Putki 14x" tai "12/12 johdinta · 0 virhettä"
  week: number;
  timestamp: number;
}

export interface RivalContractor {
  id: string;
  name: string;
  companyName: string;
  specialty: string;
  netWorth: number;
  reputation: number;
  completedGigs: number;
  badge: string;
}

export interface MinigameSubmissionPayload {
  minigameType: LeaderboardMinigameType;
  gigName: string;
  precision: number;
  durationSeconds: number;
  bonusPoints?: number;
  details: string;
}

export interface MinigameSubmissionResult {
  entry: MinigameScoreEntry;
  rank: number;
  isNewPersonalBest: boolean;
  isNewTrackRecord: boolean;
}
