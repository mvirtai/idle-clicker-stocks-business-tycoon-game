import { StateCreator } from 'zustand';
import { GameStore } from '../useGameStore';
import { PerkId, PlayerState } from '../../types/game';
import { INITIAL_PLAYER } from '../../data/initialData';
import { PERK_CATALOG, canUnlockPerk } from '../../data/perksData';

/**
 * Pelaajan henkilökohtainen tila ja kehitys (Player Slice)
 *
 * Senioriarkkitehdin opetus juniorille:
 * Pelaajan stamina ja maine (Rep) ovat pelillisiä resursseja,
 * jotka rajoittavat sitä, kuinka usein ja mihin hintaan töitä voidaan tehdä.
 * Reunaehtojen tarkistus (`Math.clamp` 0 - max) pitää huolen siitä, ettei
 * stamina karkaa negatiiviseksi tai maine yli maksimin (200).
 */

export interface StaminaEfficiencyBreakdown {
  totalReductionPercent: number;
  upgradeReductionPercent: number;
  levelReductionPercent: number;
  teamReductionPercent: number;
}

export interface PlayerSlice {
  player: PlayerState;

  // Toiminnot (Actions) & Johdetut laskimet (Selectors)
  getEffectiveStaminaCost: (baseCost: number) => number;
  getStaminaEfficiencyBreakdown: () => StaminaEfficiencyBreakdown;
  consumeStamina: (amount: number) => void;
  restoreStamina: (amount: number) => void;
  addXp: (amount: number) => { levelUp: boolean; newLevel: number };
  addReputation: (amount: number, reason?: string) => void;
  addCertification: (certId: string) => void;
  unlockPerk: (perkId: PerkId) => { success: boolean; message: string };
  respecPerks: () => { success: boolean; message: string };
  resetPlayerStats: () => void;
}

export const createPlayerSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  PlayerSlice
> = (set, get) => ({
  player: INITIAL_PLAYER,

  getStaminaEfficiencyBreakdown: () => {
    const state = get();

    // 1. Pajan kalusto-, sertifikaatti- ja automaatiopäivitykset
    let upgradeReduction = 0;
    state.upgrades.forEach((u) => {
      if (u.level > 0 && u.staminaDrainReduction > 0) {
        upgradeReduction += u.staminaDrainReduction;
      }
    });

    // 2. Hahmon ammattitaso (2 % kevennys per taso tason 1 jälkeen, max 20 %)
    const levelReduction = Math.min(0.2, Math.max(0, (state.player.level - 1) * 0.02));

    // 3. Yrityksen työntekijöiden tuoma delegointihyöty (staminaEfficiency)
    let teamReduction = 0;
    if (state.hasCompanyBought && state.company?.employees) {
      state.company.employees.forEach((emp) => {
        teamReduction += emp.staminaEfficiency;
      });
    }

    // Kokonaiskevennys rajataan korkeintaan 75 prosenttiin (pelitasapaino)
    const totalReduction = Math.min(0.75, upgradeReduction + levelReduction + teamReduction);

    return {
      totalReductionPercent: Math.round(totalReduction * 100),
      upgradeReductionPercent: Math.round(upgradeReduction * 100),
      levelReductionPercent: Math.round(levelReduction * 100),
      teamReductionPercent: Math.round(teamReduction * 100),
    };
  },

  getEffectiveStaminaCost: (baseCost) => {
    if (baseCost <= 0) return 0;
    const { totalReductionPercent } = get().getStaminaEfficiencyBreakdown();
    const multiplier = 1 - totalReductionPercent / 100;
    return Math.max(0.5, Math.round(baseCost * multiplier * 10) / 10);
  },

  consumeStamina: (amount) => {
    if (amount <= 0) return;
    set(
      (s) => {
        const nextStamina = Math.max(0, Math.round((s.player.stamina - amount) * 10) / 10);
        return {
          player: {
            ...s.player,
            stamina: nextStamina,
            burnoutTurnsRemaining: nextStamina === 0 ? 2 : s.player.burnoutTurnsRemaining,
          },
        };
      },
      false,
      'player/consumeStamina'
    );
  },

  restoreStamina: (amount) => {
    if (amount <= 0) return;
    set(
      (s) => ({
        player: {
          ...s.player,
          stamina: Math.min(s.player.maxStamina, Math.round((s.player.stamina + amount) * 10) / 10),
          burnoutTurnsRemaining: 0,
        },
      }),
      false,
      'player/restoreStamina'
    );
  },

  addXp: (amount) => {
    const s = get();
    const currentXp = s.player.xp + amount;
    const reqXp = s.player.level * 150;

    if (currentXp >= reqXp) {
      const nextLevel = s.player.level + 1;
      const remainderXp = currentXp - reqXp;

      set(
        (state) => ({
          player: {
            ...state.player,
            level: nextLevel,
            xp: remainderXp,
            maxStamina: Math.min(150, state.player.maxStamina + 5),
            perkPoints: state.player.perkPoints + 1, // Jokainen taso antaa 1 taitopisteen!
          },
        }),
        false,
        'player/levelUp'
      );

      return { levelUp: true, newLevel: nextLevel };
    }

    set(
      (state) => ({
        player: { ...state.player, xp: currentXp },
      }),
      false,
      'player/addXp'
    );

    return { levelUp: false, newLevel: s.player.level };
  },

  unlockPerk: (perkId) => {
    const s = get();
    const perk = PERK_CATALOG.find((p) => p.id === perkId);
    if (!perk) {
      return { success: false, message: 'Tuntematon erikoistumistaito.' };
    }

    const { canUnlock, reason } = canUnlockPerk(s.player, perk);
    if (!canUnlock) {
      return { success: false, message: reason || 'Taitoa ei voi avata.' };
    }

    set(
      (state) => ({
        player: {
          ...state.player,
          perkPoints: state.player.perkPoints - perk.cost,
          unlockedPerks: [...state.player.unlockedPerks, perk.id],
        },
      }),
      false,
      'player/unlockPerk'
    );

    return {
      success: true,
      message: `Taito avattu: ${perk.name}! ${perk.tagline}`,
    };
  },

  respecPerks: () => {
    const s = get();
    const count = s.player.unlockedPerks.length;
    if (count === 0) {
      return { success: false, message: 'Sinulla ei ole vielä avattuja taitoja nollattavaksi.' };
    }

    set(
      (state) => ({
        player: {
          ...state.player,
          perkPoints: state.player.perkPoints + count,
          unlockedPerks: [],
        },
      }),
      false,
      'player/respecPerks'
    );

    return {
      success: true,
      message: `Taidot nollattu! Sait takaisin ${count} taitopistettä.`,
    };
  },

  addReputation: (amount, _reason) => {
    set(
      (s) => ({
        player: {
          ...s.player,
          personalRep: Math.min(200, Math.max(0, s.player.personalRep + amount)),
        },
      }),
      false,
      'player/addReputation'
    );
  },

  addCertification: (certId) => {
    set(
      (s) => {
        if (s.player.certifications.includes(certId)) return s;
        return {
          player: {
            ...s.player,
            certifications: [...s.player.certifications, certId],
          },
        };
      },
      false,
      'player/addCert'
    );
  },

  resetPlayerStats: () => {
    set({ player: INITIAL_PLAYER }, false, 'player/reset');
  },
});
