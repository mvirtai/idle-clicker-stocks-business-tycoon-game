import { StateCreator } from 'zustand';
import { GameStore } from '../useGameStore';
import { UpgradeItem } from '../../types/game';
import { INITIAL_UPGRADES } from '../../data/initialData';

/**
 * Paja-, työkalu- ja kalustopäivitysten tilanhallinta (Asset Slice)
 *
 * Senioriarkkitehdin opetus juniorille:
 * 1. Eksponentiaalinen kustannuskäyrä:
 *    Klikkeripeleissä kustannusten pitää kasvaa nopeammin kuin lineaarinen tuotto,
 *    muuten peli "lumipalloituu" liian nopeasti.
 *    Kaava: `BaseCost * (Multiplier ^ Level)`
 * 2. Immutabiliteetti (Immutable state updates):
 *    Päivityksen osto päivittää taulukon elementin uuteen kopioon (`.map()`),
 *    jolloin Reactin ja Zustand-valitsimien muistiosoitevertailu (`Object.is`)
 *    tunnistaa muutoksen välittömästi ilman syväkloonausta.
 */

export interface AssetSlice {
  upgrades: UpgradeItem[];

  // Toiminnot (Actions)
  purchaseUpgrade: (upgradeId: string) => { success: boolean; message: string };
  getUpgradeCost: (upgrade: UpgradeItem) => number;
  unlockUpgrade: (upgradeId: string) => void;
}

export const createAssetSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  AssetSlice
> = (set, get) => ({
  upgrades: INITIAL_UPGRADES,

  /**
   * Laskee päivityksen hinnan nykyisellä tasolla.
   */
  getUpgradeCost: (upgrade: UpgradeItem) => {
    if (upgrade.level >= upgrade.maxLevel) return Infinity;
    return Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
  },

  /**
   * Ostaa päivityksen, veloittaa kassan ja aktivoi uudet kyvyt/bonukset.
   */
  purchaseUpgrade: (upgradeId: string) => {
    const state = get();
    const targetUpgrade = state.upgrades.find((u) => u.id === upgradeId);

    if (!targetUpgrade) {
      return { success: false, message: 'Päivitystä ei löytynyt katalogista.' };
    }

    if (targetUpgrade.level >= targetUpgrade.maxLevel) {
      return { success: false, message: 'Päivitys on jo asennettu korkeimmalle tasolle (MAX).' };
    }

    // Tarkistetaan tasovaatimus
    if (targetUpgrade.requiredLevel && state.player.level < targetUpgrade.requiredLevel) {
      return {
        success: false,
        message: `Vaatii tason ${targetUpgrade.requiredLevel} (Oma tasosi: ${state.player.level}).`,
      };
    }

    // Lasketaan hinta
    const cost = Math.round(
      targetUpgrade.baseCost * Math.pow(targetUpgrade.costMultiplier, targetUpgrade.level)
    );

    // Yritetään veloittaa kassa
    const purchaseApproved = state.spendCash(
      cost,
      'upgrade',
      `Kalustopäivitys: ${targetUpgrade.name} (Taso ${targetUpgrade.level + 1})`
    );

    if (!purchaseApproved) {
      return {
        success: false,
        message: `Käteisvarat eivät riitä. Hinta: ${cost.toLocaleString('fi-FI')} €, Kassassa: ${state.cash.toLocaleString('fi-FI')} €.`,
      };
    }

    // Päivitetään päivityskatalogi immutaabelisti
    const nextLevel = targetUpgrade.level + 1;
    const updatedUpgrades = state.upgrades.map((u) =>
      u.id === upgradeId ? { ...u, level: nextLevel, unlocked: true } : u
    );

    // Jos kyseessä oli sertifikaatti, lisätään se suoraan pelaajan sertifiointilistaan
    if (targetUpgrade.category === 'certs') {
      if (upgradeId === 'certs-plc-tia' && !state.player.certifications.includes('plc_basics')) {
        set(
          (s) => ({
            player: {
              ...s.player,
              certifications: [...s.player.certifications, 'plc_basics'],
            },
          }),
          false,
          'asset/unlockCertPlc'
        );
      } else if (
        upgradeId === 'certs-knx-automation' &&
        !state.player.certifications.includes('knx_expert')
      ) {
        set(
          (s) => ({
            player: {
              ...s.player,
              certifications: [...s.player.certifications, 'knx_expert'],
            },
          }),
          false,
          'asset/unlockCertKnx'
        );
      }
    }

    // Jos kyseessä on "comp-debt-reduction-package", lyhennetään samalla pääomaa 2 000 €!
    if (upgradeId === 'comp-debt-reduction-package') {
      set(
        (s) => ({
          loan: {
            ...s.loan,
            principal: Math.max(0, s.loan.principal - 2000),
            totalPrincipalRepaid: s.loan.totalPrincipalRepaid + 2000,
          },
        }),
        false,
        'asset/debtReductionPackage'
      );
    }

    // Lisätään päivityksen tuoma maine (Rep)
    if (targetUpgrade.repBonus > 0) {
      state.addReputation(targetUpgrade.repBonus, `Päivitys: ${targetUpgrade.name}`);
    }

    set({ upgrades: updatedUpgrades }, false, 'asset/purchaseSuccess');

    return {
      success: true,
      message: `Asennettu: ${targetUpgrade.name} (Taso ${nextLevel}/${targetUpgrade.maxLevel})!`,
    };
  },

  unlockUpgrade: (upgradeId: string) => {
    set(
      (s) => ({
        upgrades: s.upgrades.map((u) => (u.id === upgradeId ? { ...u, unlocked: true } : u)),
      }),
      false,
      'asset/unlockUpgrade'
    );
  },
});
