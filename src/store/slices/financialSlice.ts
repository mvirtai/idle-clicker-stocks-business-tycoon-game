import { StateCreator } from 'zustand';
import { GameStore } from '../useGameStore';
import { TransactionRecord } from '../../types/game';

/**
 * Taloushallinnon tila ja toiminnot (Financial Slice)
 *
 * Senioriarkkitehdin opetus juniorille:
 * 1. Liukulukujen epätarkkuus (IEEE 754 Floating-point drift):
 *    JavaScriptissä `0.1 + 0.2 === 0.30000000000000004`. Rahapeleissä tämä
 *    aiheuttaa ärsyttäviä senttiheittoja. Siksi pyöristämme jokaisen
 *    rahansiirron 2 desimaalin tarkkuudelle (`Math.round(val * 100) / 100`).
 * 2. Tapahtumaloki (Ledger):
 *    Sen sijaan että vain muuttaisimme `cash`-lukua hiljaisesti, jokainen
 *    rahansiirto kirjaa `TransactionRecord`-olion. Tämä mahdollistaa
 *    reaaliaikaisen kassavirtakaavion ja tilinpäätökset!
 */

export interface DailyPassiveBreakdown {
  upgradeDailyEur: number;
  teamDailyEur: number;
  totalDailyEur: number;
  isWorkday: boolean;
}

export interface FinancialSlice {
  cash: number;
  lifetimeCash: number;
  transactions: TransactionRecord[];

  // Toiminnot (Actions) & Valitsimet (Selectors)
  addCash: (
    amount: number,
    category: TransactionRecord['category'],
    description: string,
    type?: TransactionRecord['type']
  ) => void;

  spendCash: (
    amount: number,
    category: TransactionRecord['category'],
    description: string
  ) => boolean;

  performManualClick: (comboMultiplier?: number) => number;
  getDailyPassiveBreakdown: (forDay?: TransactionRecord['day']) => DailyPassiveBreakdown;
  processDailyPassiveIncome: () => {
    totalEarned: number;
    upgradeIncome: number;
    teamIncome: number;
    description: string;
  };
  processPassiveTick: (deltaTimeSeconds: number) => void;
  resetLedger: () => void;
}

export const createFinancialSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  FinancialSlice
> = (set, get) => ({
  cash: 420.0,
  lifetimeCash: 420.0,
  transactions: [
    {
      id: 'tx-init-1',
      timestamp: Date.now() - 86400000,
      week: 1,
      day: 'MA',
      type: 'income',
      category: 'click_labor',
      amount: 420.0,
      description: 'Aloituspääoma ja edellisen viikon urakkasaatavat',
      balanceAfter: 420.0,
    },
  ],

  /**
   * Lisää rahaa kassaan ja kirjaa tapahtuman tilikirjaan
   */
  addCash: (amount, category, description, type = 'income') => {
    if (amount <= 0) return;
    const roundedAmount = Math.round(amount * 100) / 100;

    set(
      (state) => {
        const newCash = Math.round((state.cash + roundedAmount) * 100) / 100;
        const newLifetime = Math.round((state.lifetimeCash + roundedAmount) * 100) / 100;

        const newRecord: TransactionRecord = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          week: state.week,
          day: state.dayOfWeek,
          type,
          category,
          amount: roundedAmount,
          description,
          balanceAfter: newCash,
        };

        // Pidetään loki järkevän kokoisena (viimeisimmät 60 tapahtumaa) suorituskyvyn vuoksi
        const updatedTransactions = [newRecord, ...state.transactions].slice(0, 60);

        return {
          cash: newCash,
          lifetimeCash: newLifetime,
          transactions: updatedTransactions,
        };
      },
      false,
      'financial/addCash'
    );
  },

  /**
   * Veloittaa rahaa kassasta vain, jos saldo riittää.
   * Palauttaa `true` jos osto onnistui, `false` jos varat eivät riitä.
   */
  spendCash: (amount, category, description) => {
    if (amount <= 0) return true;
    const roundedAmount = Math.round(amount * 100) / 100;
    const currentCash = get().cash;

    if (currentCash < roundedAmount) {
      return false; // Estetään negatiivinen saldo ostotapahtumissa
    }

    set(
      (state) => {
        const newCash = Math.round((state.cash - roundedAmount) * 100) / 100;

        const newRecord: TransactionRecord = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          week: state.week,
          day: state.dayOfWeek,
          type: 'expense',
          category,
          amount: -roundedAmount,
          description,
          balanceAfter: newCash,
        };

        return {
          cash: newCash,
          transactions: [newRecord, ...state.transactions].slice(0, 60),
        };
      },
      false,
      'financial/spendCash'
    );

    return true;
  },

  /**
   * Suorittaa manuaalisen työkilkkauksen.
   * Huomioi työkalujen antamat bonukset, staminan kulutuksen, tasonnousun
   * sekä koostaa (coalesce) saman päivän manuaalityöt yhteen tilikirjariviin!
   */
  performManualClick: (comboMultiplier = 1.0) => {
    const state = get();
    const player = state.player;

    // Jos stamina on 0 (burnout), tuottavuus romahtaa 80 %
    const staminaPenalty = player.stamina <= 0 ? 0.2 : 1.0;

    // Lasketaan klikkivoima: perustaso + kaikki aktiiviset työkalubonukset
    let clickPower = player.baseClickValue + player.level * 1.5;
    state.upgrades.forEach((u) => {
      if (u.level > 0 && u.clickBonus > 0) {
        clickPower += u.clickBonus * u.level;
      }
    });

    // Jos pelaajalla on 'craftsman_flow' -erikoistuminen (Kenttämestari haara)
    const hasCraftsmanFlow = player.unlockedPerks?.includes('craftsman_flow');
    if (hasCraftsmanFlow) {
      clickPower *= 1.25; // +25 % manuaalityön lisätuotto
    }

    const finalEarned = Math.round(clickPower * comboMultiplier * staminaPenalty * 100) / 100;

    // Lasketaan tehollinen staminakulutus (huomioi työkalut, sertifikaatit, hahmotason, tiimin ja taitopuun)
    let actualStaminaCost = state.getEffectiveStaminaCost(1.2);
    if (hasCraftsmanFlow) {
      actualStaminaCost = Math.max(0.5, Math.round(actualStaminaCost * 0.8 * 10) / 10); // -20 % staminakulutus
    }
    const newStamina = Math.max(0, Math.round((player.stamina - actualStaminaCost) * 10) / 10);

    // Kokemuspisteet (XP) ja tasonnousulogiikka
    const xpGained = Math.max(1, Math.round(2 * comboMultiplier));
    let newXp = player.xp + xpGained;
    let newLevel = player.level;
    let earnedPerkPoints = 0;
    const requiredXp = player.level * 150;

    if (newXp >= requiredXp) {
      newLevel += 1;
      newXp -= requiredXp;
      earnedPerkPoints = 1;
      // Tasonnousu palauttaa osan staminasta ja nostaa mainetta!
      state.addReputation(5, `Tasonnousu tasolle ${newLevel}!`);
    }

    // Päivitetään pelaajan tila, kassa ja tilikirjan päiväkohtainen pientöiden koontirivi atomisesti
    set(
      (prevState) => {
        const newCash = Math.round((prevState.cash + finalEarned) * 100) / 100;
        const newLifetime = Math.round((prevState.lifetimeCash + finalEarned) * 100) / 100;

        // Ledger Coalescing: Jos viimeisin tapahtuma on saman päivän manuaalityö (eikä aloituspääoma),
        // kasvatetaan sen summaa sen sijaan, että luotaisiin kymmeniä pikkurivejä.
        const latestTx = prevState.transactions[0];
        let updatedTransactions: TransactionRecord[];

        if (
          latestTx &&
          latestTx.id !== 'tx-init-1' &&
          latestTx.category === 'click_labor' &&
          latestTx.week === prevState.week &&
          latestTx.day === prevState.dayOfWeek
        ) {
          const combinedAmount = Math.round((latestTx.amount + finalEarned) * 100) / 100;
          const coalescedRecord: TransactionRecord = {
            ...latestTx,
            timestamp: Date.now(),
            amount: combinedAmount,
            description: `Verstaan kokoonpano- ja kaapelointityöt (${prevState.dayOfWeek})`,
            balanceAfter: newCash,
          };
          updatedTransactions = [coalescedRecord, ...prevState.transactions.slice(1)];
        } else {
          const newRecord: TransactionRecord = {
            id: `tx-click-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: Date.now(),
            week: prevState.week,
            day: prevState.dayOfWeek,
            type: 'income',
            category: 'click_labor',
            amount: finalEarned,
            description: `Verstaan kokoonpano- ja kaapelointityöt (${prevState.dayOfWeek})`,
            balanceAfter: newCash,
          };
          updatedTransactions = [newRecord, ...prevState.transactions].slice(0, 60);
        }

        return {
          cash: newCash,
          lifetimeCash: newLifetime,
          transactions: updatedTransactions,
          player: {
            ...prevState.player,
            stamina: newStamina,
            xp: newXp,
            level: newLevel,
            perkPoints: prevState.player.perkPoints + earnedPerkPoints,
            maxStamina:
              earnedPerkPoints > 0
                ? Math.min(150, prevState.player.maxStamina + 5)
                : prevState.player.maxStamina,
            totalClicks: prevState.player.totalClicks + 1,
          },
        };
      },
      false,
      'financial/performManualClick'
    );

    // Kellonajan pieni edistyminen jokaisesta työsuoritteesta
    state.advanceMinute(1);

    return finalEarned;
  },

  /**
   * Laskee päiväkohtaisen passiivisen ja tiimin laskutuksen erittelyn (Derived Selector).
   * Huomioi:
   * 1. Kalusto- ja huoltosopimuspäivitykset (u.passiveIncomeBonus * u.level)
   * 2. Yrityksen palkatut asentajat VAIN jos yritys on ostettu (hasCompanyBought) ja on arkipäivä (MA-PE)
   */
  getDailyPassiveBreakdown: (forDay) => {
    const state = get();
    const targetDay = forDay || state.dayOfWeek;
    const isWorkday = targetDay !== 'LA' && targetDay !== 'SU';

    let upgradeDailyEur = 0;
    state.upgrades.forEach((u) => {
      if (u.level > 0 && u.passiveIncomeBonus > 0) {
        upgradeDailyEur += u.passiveIncomeBonus * u.level;
      }
    });

    let teamDailyEur = 0;
    if (state.hasCompanyBought && isWorkday && state.company?.employees) {
      state.company.employees.forEach((emp) => {
        teamDailyEur += emp.dailyOutputEur * emp.skillLevel;
      });
    }

    upgradeDailyEur = Math.round(upgradeDailyEur * 100) / 100;
    teamDailyEur = Math.round(teamDailyEur * 100) / 100;
    const totalDailyEur = Math.round((upgradeDailyEur + teamDailyEur) * 100) / 100;

    return {
      upgradeDailyEur,
      teamDailyEur,
      totalDailyEur,
      isWorkday,
    };
  },

  /**
   * Tapahtumapohjainen päiväselvitys (Domain Event Settlement):
   * Kutsutaan aina työpäivän päättyessä (`advanceDay`).
   * Kirjaa sopimus- ja tiimilaskutuksen yhtenä selkeänä koontirivinä tilikirjaan (Ledger).
   */
  processDailyPassiveIncome: () => {
    const state = get();
    const { upgradeDailyEur, teamDailyEur, totalDailyEur } = state.getDailyPassiveBreakdown(
      state.dayOfWeek
    );

    if (totalDailyEur <= 0) {
      return {
        totalEarned: 0,
        upgradeIncome: 0,
        teamIncome: 0,
        description: '',
      };
    }

    const parts: string[] = [];
    if (teamDailyEur > 0) {
      parts.push(`Asentajatiimi +${teamDailyEur.toFixed(0)} €`);
    }
    if (upgradeDailyEur > 0) {
      parts.push(`Sopimukset & automaatio +${upgradeDailyEur.toFixed(0)} €`);
    }

    const description = `Päivän sopimus- ja tiimitilitys (${state.dayOfWeek}): ${parts.join(' · ')}`;

    state.addCash(totalDailyEur, 'passive_revenue', description, 'income');

    return {
      totalEarned: totalDailyEur,
      upgradeIncome: upgradeDailyEur,
      teamIncome: teamDailyEur,
      description,
    };
  },

  /**
   * Vanhentunut reaaliaikainen sekuntitikki on korvattu pelikelloon sidotulla
   * `processDailyPassiveIncome()`-koontitilityksellä (`advanceDay`).
   * Pidetään tyhjänä suojametodina rajapintayhteensopivuuden vuoksi.
   */
  processPassiveTick: (_deltaTimeSeconds) => {
    // Ei reaaliaikaista taustalaskuria — kassavirta tilitetään päivän vaihtuessa tilikirjaan.
  },

  resetLedger: () => {
    set(
      {
        transactions: [
          {
            id: 'tx-init-1',
            timestamp: Date.now() - 86400000,
            week: 1,
            day: 'MA',
            type: 'income',
            category: 'click_labor',
            amount: 420.0,
            description: 'Aloituspääoma ja edellisen viikon urakkasaatavat',
            balanceAfter: 420.0,
          },
        ],
      },
      false,
      'financial/resetLedger'
    );
  },
});
