import { PerkDefinition, PerkId, PlayerState } from '../types/game';

/**
 * HAHMONKEHITYKSEN ERIKOISTUMISPUUT (SKILL TREES / PERKS)
 *
 * Senioriarkkitehdin opetus juniorille:
 * Pelitaloudessa staattiset tilastopäivitykset (esim. pelkkä tasonumero) käyvät nopeasti tylsiksi.
 * Valittavat erikoistumispuut (Specialization Branches) pakottavat pelaajan tekemään
 * merkityksellisiä arkkitehtonisia ja strategisia valintoja:
 *
 * 1. Haara: "Kenttämestari" (Field Specialist)
 *    - Keskittyy fyysisen asennustyön nopeuttamiseen, minipelien virhemarginaalien parantamiseen,
 *      keikkojen staminasäästöön ja teollisuusasennusten maineeseen.
 *
 * 2. Haara: "Pörssihai" (Market Analyst & Tycoon)
 *    - Keskittyy rahoitusmarkkinoihin: manuaalisen kynttiläkelauksen staminasäästöön,
 *      sisäpiirivihjeiden hyödyntämiseen ja osakekauppojen lisämarginaaleihin.
 */

export const PERK_CATALOG: PerkDefinition[] = [
  // ==========================================
  // HAARA 1: KENTTÄMESTARI (Field Specialist)
  // ==========================================
  {
    id: 'craftsman_flow',
    branch: 'field',
    tier: 1,
    name: 'Käsityön virtaus',
    icon: 'Hammer',
    tagline: 'Optimoitu asennusrytmi verstaalla',
    description: '+25 % manuaalityön tuntituottoon ja -20 % staminakulutus verstaalla asentaessa.',
    cost: 1,
  },
  {
    id: 'precision_grip',
    branch: 'field',
    tier: 2,
    name: 'Tarkkuusote',
    icon: 'Gauge',
    tagline: 'Kylmähermoinen kenttätyö',
    description: 'Minipelien toleranssit kasvavat ja keikkojen suoritus kuluttaa 25 % vähemmän staminaa.',
    requiresPerkId: 'craftsman_flow',
    cost: 1,
  },
  {
    id: 'jobsite_innovator',
    branch: 'field',
    tier: 3,
    name: 'Työmaainnovaattori',
    icon: 'Award',
    tagline: 'Teollisuuden luottokumppani',
    description: '+50 % enemmän mainetta (Rep) keikoista sekä 35 % todennäköisyys löytää arvokkaita ylijäämäkomponentteja verstaalle (+50–150 €).',
    requiresPerkId: 'precision_grip',
    cost: 1,
  },

  // ==========================================
  // HAARA 2: PÖRSSIHAI (Market Analyst)
  // ==========================================
  {
    id: 'candle_focus',
    branch: 'market',
    tier: 1,
    name: 'Kynttiläfokus',
    icon: 'LineChart',
    tagline: 'Markkinanopeus ja data-analyysi',
    description: 'Markkinakynttilöiden manuaalinen kelaus kuluttaa 40 % vähemmän staminaa.',
    cost: 1,
  },
  {
    id: 'insider_network',
    branch: 'market',
    tier: 2,
    name: 'Sisäpiiriverkosto',
    icon: 'Radio',
    tagline: 'Työmaiden kuumimmat huhut',
    description: 'Keikoilta saatavien sisäpiirivihjeiden todennäköisyys kaksinkertaistuu (tarkkuusvaatimus laskee 70 %:iin).',
    requiresPerkId: 'candle_focus',
    cost: 1,
  },
  {
    id: 'arbitrage_master',
    branch: 'market',
    tier: 3,
    name: 'Arbitraasimestari',
    icon: 'Coins',
    tagline: 'Optimaalinen toteutushinta',
    description: 'Pörssin myyntituottoihin +6 % lisämarginaali ja kaupankäynnin transaktiokulut poistuvat.',
    requiresPerkId: 'insider_network',
    cost: 1,
  },
];

/**
 * Puhdas valitsinfunktio (Pure Selector): Onko kyseinen taito avattu?
 */
export function hasPerk(player: PlayerState, perkId: PerkId): boolean {
  return player.unlockedPerks.includes(perkId);
}

/**
 * Puhdas valitsinfunktio: Voiko kyseisen taidon avata?
 */
export function canUnlockPerk(
  player: PlayerState,
  perk: PerkDefinition
): { canUnlock: boolean; reason: string | null } {
  if (player.unlockedPerks.includes(perk.id)) {
    return { canUnlock: false, reason: 'Taito on jo avattu.' };
  }

  if (player.perkPoints < perk.cost) {
    return { canUnlock: false, reason: 'Ei riittävästi taitopisteitä.' };
  }

  if (perk.requiresPerkId && !player.unlockedPerks.includes(perk.requiresPerkId)) {
    const prereq = PERK_CATALOG.find((p) => p.id === perk.requiresPerkId);
    return {
      canUnlock: false,
      reason: `Vaatii edeltävän taidon: ${prereq ? prereq.name : perk.requiresPerkId}`,
    };
  }

  return { canUnlock: true, reason: null };
}
