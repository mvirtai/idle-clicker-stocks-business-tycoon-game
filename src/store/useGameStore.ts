import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  BusinessMetrics,
  DayOfWeek,
  Gig,
  WeekSlot,
} from '../types/game';
import {
  AVAILABLE_GIGS_CATALOG,
  INITIAL_EMPLOYEES,
  INITIAL_LOAN,
  INITIAL_UPGRADES,
  INITIAL_WEEK_DAYS,
  INITIAL_WEEK_SCHEDULE,
} from '../data/initialData';
import { createPlayerSlice, PlayerSlice } from './slices/playerSlice';
import { createLoanSlice, LoanSlice } from './slices/loanSlice';
import { createCompanySlice, CompanySlice } from './slices/companySlice';
import { createFinancialSlice, FinancialSlice } from './slices/financialSlice';
import { createAssetSlice, AssetSlice } from './slices/assetSlice';
import { createMarketSlice, MarketSlice } from './slices/marketSlice';
import { createLeaderboardSlice, LeaderboardSlice } from './slices/leaderboardSlice';

export type ActiveTab =
  | 'workstation'
  | 'gigs'
  | 'calendar'
  | 'company'
  | 'upgrades'
  | 'market'
  | 'leaderboards';

export interface RootState {
  week: number;
  dayOfWeek: DayOfWeek;
  hour: number;
  minute: number;
  activeTab: ActiveTab;
  activeGig: Gig | null;
  availableGigs: Gig[];
  weekSchedule: Record<DayOfWeek, WeekSlot>;
  isGameOver: boolean;
  gameOverReason: string | null;
  isVictory: boolean;
  hasCompanyBought: boolean;

  // Root actions
  advanceMinute: (minutes: number) => void;
  advanceDay: () => { weekCompleted: boolean; message: string };
  setActiveTab: (tab: ActiveTab) => void;
  setActiveGig: (gig: Gig | null) => void;
  assignGigToDay: (day: DayOfWeek, gig: Gig) => boolean;
  completeMinigame: (precision: number) => {
    grade: 'perfect' | 'good' | 'fail';
    pay: number;
    xp: number;
    rep: number;
    intelAwarded?: boolean;
  };
  buyCompanyWithLoan: () => { success: boolean; message: string };
  restartGame: () => void;
}

export type GameStore = PlayerSlice &
  LoanSlice &
  CompanySlice &
  FinancialSlice &
  AssetSlice &
  MarketSlice &
  LeaderboardSlice &
  RootState;

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get, api) => ({
      ...createPlayerSlice(set, get, api),
      ...createLoanSlice(set, get, api),
      ...createCompanySlice(set, get, api),
      ...createFinancialSlice(set, get, api),
      ...createAssetSlice(set, get, api),
      ...createMarketSlice(set, get, api),
      ...createLeaderboardSlice(set, get, api),

      // Juuritila
      week: 1,
      dayOfWeek: 'MA',
      hour: 8,
      minute: 30,
      activeTab: 'workstation',
      activeGig: AVAILABLE_GIGS_CATALOG[0],
      availableGigs: AVAILABLE_GIGS_CATALOG,
      weekSchedule: INITIAL_WEEK_SCHEDULE,
      isGameOver: false,
      gameOverReason: null,
      isVictory: false,
      hasCompanyBought: false,

      setActiveTab: (tab) => set({ activeTab: tab }, false, 'root/setActiveTab'),
      setActiveGig: (gig) => set({ activeGig: gig }, false, 'root/setActiveGig'),

      advanceMinute: (minutes) => {
        set(
          (s) => {
            let nextMin = s.minute + minutes;
            let nextHr = s.hour;
            if (nextMin >= 60) {
              nextHr += Math.floor(nextMin / 60);
              nextMin = nextMin % 60;
            }
            if (nextHr >= 22) {
              nextHr = 22;
              nextMin = 0;
            }
            return { hour: nextHr, minute: nextMin };
          },
          false,
          'root/advanceMinute'
        );
      },

      assignGigToDay: (day, gig) => {
        set(
          (s) => ({
            weekSchedule: {
              ...s.weekSchedule,
              [day]: {
                day,
                type: 'gig',
                gigId: gig.id,
                title: gig.clientName,
              },
            },
          }),
          false,
          'root/assignGigToDay'
        );
        return true;
      },

      completeMinigame: (precision) => {
        const state = get();
        const gig = state.activeGig || AVAILABLE_GIGS_CATALOG[0];

        let grade: 'perfect' | 'good' | 'fail' = 'good';
        let multiplier = 0.85;

        if (precision >= 90) {
          grade = 'perfect';
          multiplier = 1.25;
        } else if (precision < 55) {
          grade = 'fail';
          multiplier = 0.4;
        }

        const pay = Math.round(
          (gig.payMin + (gig.payMax - gig.payMin) * (precision / 100)) * multiplier
        );
        const xp = Math.max(10, Math.round(gig.tier * 45 * (precision / 100)));
        let rep = grade === 'fail' ? -5 : gig.reputationAward;

        // Jos pelaajalla on 'jobsite_innovator' -erikoistuminen (Kenttämestari Tier 3)
        const hasJobsiteInnovator = state.player.unlockedPerks?.includes('jobsite_innovator');
        if (rep > 0 && hasJobsiteInnovator) {
          rep = Math.round(rep * 1.5); // +50 % maine (Rep)
        }

        // Lisätään tulo kassa- ja tapahtumalokiin
        state.addCash(
          pay,
          'gig_completion',
          `Keikkapalkkio: ${gig.clientName} (Tarkkuus ${precision.toFixed(1)} %, Arvosana: ${grade.toUpperCase()})`
        );

        // Työmaainnovaattorin ylijäämäkomponenttien talteenotto (35 % mahdollisuus)
        if (hasJobsiteInnovator && Math.random() < 0.35) {
          const scrapCash = Math.round(50 + Math.random() * 100);
          state.addCash(
            scrapCash,
            'gig_completion',
            `Työmaainnovaattori: Ylijäämäkaapeleiden ja -komponenttien talteenotto (+${scrapCash} €)`
          );
        }

        // Lisätään XP ja Maine
        state.addXp(xp);
        state.addReputation(rep, `Keikka: ${gig.clientName}`);

        // Kulutetaan staminaa suorituksesta ('precision_grip' alentaa kulutuksen 15 -> 11)
        const hasPrecisionGrip = state.player.unlockedPerks?.includes('precision_grip');
        const staminaCost = hasPrecisionGrip ? 11 : 15;
        state.consumeStamina(staminaCost);

        // Kokeillaan ansaita sisäpiirivihje (Insider Intel)
        const intel = state.awardInsiderIntelFromGig(gig.description, gig.clientName, precision);

        // Keikan suoritus vie 30 minuuttia peliaikaa ja sulkee 30m markkinakynttilän
        state.advanceMinute(30);
        if (state.tickMarketPrices) {
          state.tickMarketPrices(1800, '30m');
        }

        // Merkitään nykyisen päivän tulos kalenteriin
        const curDay = state.dayOfWeek;
        set(
          (s) => ({
            weekSchedule: {
              ...s.weekSchedule,
              [curDay]: {
                ...s.weekSchedule[curDay],
                result: {
                  grade,
                  precision,
                  payEarned: pay,
                  xpEarned: xp,
                  repDelta: rep,
                },
              },
            },
          }),
          false,
          'root/completeMinigame'
        );

        return { grade, pay, xp, rep, intelAwarded: !!intel };
      },

      buyCompanyWithLoan: () => {
        const state = get();
        if (state.hasCompanyBought) {
          return { success: false, message: 'Yritys on jo ostettu!' };
        }

        // Otetaan pankkilaina (45 000 € lisätään kassaan sijoituksena) ja siirretään yrityksen
        // olemassa oleva asentajatiimi (Matti & Eveliina) pelaajan alaisuuteen.
        set(
          (s) => ({
            hasCompanyBought: true,
            activeTab: 'company',
            company: {
              ...s.company,
              tier: 'sole_proprietorship',
              employees: s.company.employees.length > 0 ? s.company.employees : INITIAL_EMPLOYEES,
            },
            loan: {
              ...s.loan,
              principal: 45000,
              initialPrincipal: 45000,
              missedPayments: 0,
              isDefaulted: false,
            },
          }),
          false,
          'root/buyCompanyWithLoan'
        );

        state.addCash(
          45000,
          'debt_service',
          'Pankkilaina yrityskauppaan (Koti kiinnitetty 180 000 €, mukana 2 asentajaa)',
          'loan_draw'
        );

        return {
          success: true,
          message:
            'Yrityskauppa vahvistettu! 45 000 € siirretty tilille ja 2 asentajaa siirtyi tiimiisi. Muista hoitaa viikoittaiset 450 € lyhennykset!',
        };
      },

      advanceDay: () => {
        const state = get();
        const curIdx = INITIAL_WEEK_DAYS.indexOf(state.dayOfWeek);
        const nextIdx = (curIdx + 1) % 7;
        const nextDay = INITIAL_WEEK_DAYS[nextIdx];

        // 1. Tilitetään päättyvän päivän sopimus-, automaatio- ja tiimilaskutus tilikirjaan (Ledger)
        const dailySettlement = state.processDailyPassiveIncome
          ? state.processDailyPassiveIncome()
          : { totalEarned: 0, upgradeIncome: 0, teamIncome: 0, description: '' };

        // 2. Lepo palauttaa aina vähintään 25 staminaa
        state.restoreStamina(25);

        // 3. Päivän vaihtuminen sulkee uuden 1d-päiväkynttilän pörssissä
        if (state.tickMarketPrices) {
          state.tickMarketPrices(86400, '1d');
        }

        const settlementSuffix =
          dailySettlement.totalEarned > 0
            ? ` · Päivätilitys +${dailySettlement.totalEarned.toFixed(0)} € kirjattu tilikirjaan`
            : '';

        // Siirrytäänkö seuraavaan viikkoon?
        if (nextIdx === 0) {
          const nextWeek = state.week + 1;

          // Maksetaan pörssiosakkeiden viikko-osingot ennen kulujen veloitusta
          if (state.processWeeklyDividends) {
            state.processWeeklyDividends();
          }

          // Suoritetaan velanhoito
          let debtResult = { defaultTriggered: false, message: '' };
          if (state.hasCompanyBought && state.loan.principal > 0) {
            debtResult = state.processWeeklyDebtService();
          }

          // Tarkistetaan työntekijöiden viikkopalkat (vain jos yritys on ostettu)
          if (state.hasCompanyBought && state.company?.employees.length > 0) {
            let totalSalaries = 0;
            state.company.employees.forEach((e) => (totalSalaries += e.weeklyCostEur));
            state.spendCash(
              totalSalaries,
              'salary',
              `Työntekijöiden viikkopalkat (${state.company.employees.length} hlö)`
            );
          }

          // Tarkistetaan konkurssi
          if (debtResult.defaultTriggered || state.loan.isDefaulted) {
            set(
              {
                isGameOver: true,
                gameOverReason:
                  'Pankki realisoi perheen kodin kolmen maksurästin takia. Yritystoiminta ajautui konkurssiin.',
              },
              false,
              'root/gameOver'
            );
            return {
              weekCompleted: true,
              message: 'KONKURSSI: Kodin pantti realisoitiin!',
            };
          }

          // Tarkistetaan voitto (laina maksettu pois ja yrityksen arvo korkea)
          if (state.hasCompanyBought && state.loan.principal <= 0 && get().cash >= 25000) {
            set({ isVictory: true }, false, 'root/victory');
          }

          // Nollataan viikon kalenteri uudelle viikolle
          set(
            {
              week: nextWeek,
              dayOfWeek: nextDay,
              hour: 8,
              minute: 0,
              weekSchedule: {
                MA: { day: 'MA', type: 'empty' },
                TI: { day: 'TI', type: 'empty' },
                KE: { day: 'KE', type: 'empty' },
                TO: { day: 'TO', type: 'empty' },
                PE: { day: 'PE', type: 'empty' },
                LA: { day: 'LA', type: 'rest', title: 'Lauantailepo' },
                SU: { day: 'SU', type: 'rest', title: 'Sunnuntai & Viikkoselvitys' },
              },
            },
            false,
            'root/newWeek'
          );

          return {
            weekCompleted: true,
            message: `Viikko ${nextWeek} alkoi! ${debtResult.message}${settlementSuffix}`,
          };
        }

        // Normipäivän vaihto
        set(
          {
            dayOfWeek: nextDay,
            hour: 8,
            minute: 0,
          },
          false,
          'root/advanceDay'
        );

        return {
          weekCompleted: false,
          message: `Siirrytty päivään: ${nextDay}${settlementSuffix}`,
        };
      },

      restartGame: () => {
        set(
          {
            week: 1,
            dayOfWeek: 'MA',
            hour: 8,
            minute: 30,
            cash: 420.0,
            lifetimeCash: 420.0,
            activeTab: 'workstation',
            activeGig: AVAILABLE_GIGS_CATALOG[0],
            weekSchedule: INITIAL_WEEK_SCHEDULE,
            isGameOver: false,
            gameOverReason: null,
            isVictory: false,
            hasCompanyBought: false,
            portfolio: {},
            upgrades: INITIAL_UPGRADES,
            loan: INITIAL_LOAN,
            company: {
              name: 'Virtanen & Kumppanit Oy',
              tier: 'freelancer',
              companyRep: 45,
              employees: [],
              vanCapacity: 2,
              establishedAtWeek: 1,
            },
          },
          false,
          'root/restart'
        );
        get().resetPlayerStats();
        get().resetLedger();
      },
    }),
    { name: 'FromGigsToGiantsStore' }
  )
);

// Johdettujen liiketoimintamittareiden dynaaminen laskentafunktio (Selector)
export function calculateBusinessMetrics(state: GameStore): BusinessMetrics {
  const principal = state.hasCompanyBought ? state.loan?.principal || 0 : 0;
  const homeValue = state.loan?.homeCollateralValue || 180000;
  const risk = Math.min(100, Math.max(0, (principal / homeValue) * 100));

  let employeeBurn = 0;
  if (state.hasCompanyBought && state.company?.employees) {
    state.company.employees.forEach((e) => (employeeBurn += e.weeklyCostEur));
  }
  const weeklyDebtCost =
    state.hasCompanyBought && state.loan?.principal > 0 ? state.loan.weeklyPayment : 0;
  const burnRatePerWeek = employeeBurn + weeklyDebtCost + 150; // 150 € peruselinkulut

  // Lasketaan päiväkohtaiset sopimus- ja tiimituotot (€/pv)
  let upgradeDaily = 0;
  state.upgrades.forEach((u) => {
    if (u.level > 0 && u.passiveIncomeBonus > 0) {
      upgradeDaily += u.passiveIncomeBonus * u.level;
    }
  });

  let teamDaily = 0;
  if (state.hasCompanyBought && state.company?.employees) {
    state.company.employees.forEach((emp) => {
      teamDaily += emp.dailyOutputEur * emp.skillLevel;
    });
  }

  // Viikkoliikevaihtoennuste: sopimukset 7 pv/vk + asentajatiimi 5 työpäivää/vk (MA-PE)
  const weeklyPassiveRev = upgradeDaily * 7 + teamDaily * 5;
  const dailyTotalPassive = upgradeDaily + teamDaily;
  const runway = burnRatePerWeek > 0 ? Math.min(99, state.cash / burnRatePerWeek) : 99;

  let solvency: BusinessMetrics['solvencyGrade'] = 'A';
  if (state.hasCompanyBought && state.loan?.missedPayments >= 2) solvency = 'CRITICAL';
  else if (state.hasCompanyBought && state.loan?.missedPayments === 1) solvency = 'D';
  else if (risk > 25) solvency = 'C';
  else if (risk > 10) solvency = 'B';
  else if (risk === 0 && state.cash > 10000) solvency = 'A+';

  const portfolioVal = state.getPortfolioValue ? state.getPortfolioValue() : 0;

  return {
    netWorth: Math.round((state.cash + portfolioVal - principal) * 100) / 100,
    totalAssetValue: 180000 + state.cash + portfolioVal,
    collateralRiskPercent: Math.round(risk * 10) / 10,
    weeklyRevenueEstimate: Math.round(weeklyPassiveRev),
    weeklyExpenses: Math.round(burnRatePerWeek),
    netWeeklyCashflow: Math.round(weeklyPassiveRev - burnRatePerWeek),
    burnRatePerWeek: Math.round(burnRatePerWeek),
    cashRunwayWeeks: Math.round(runway * 10) / 10,
    manualClickPower: state.player.baseClickValue + state.player.level * 1.5,
    passiveIncomePerSecond: Math.round(dailyTotalPassive * 100) / 100, // Edustaa nyt päivälaskutusta (€/pv)
    dailyPassiveIncome: Math.round(dailyTotalPassive * 100) / 100,
    dailyUpgradeIncome: Math.round(upgradeDaily * 100) / 100,
    dailyTeamIncome: Math.round(teamDaily * 100) / 100,
    grossMarginPercent: 68,
    solvencyGrade: solvency,
    debtToEquityRatio: Math.round((principal / Math.max(1, state.cash)) * 10) / 10,
  };
}
