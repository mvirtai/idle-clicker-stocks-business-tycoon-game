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

export interface GigResourceRequirements {
  staminaCost: number;
  durationMinutes: number;
  durationHours: number;
}

export interface TodayGigExecutionCheck {
  canExecute: boolean;
  reason: string | null;
  gig: Gig | null;
  slot: WeekSlot;
  staminaCost: number;
  durationMinutes: number;
  durationHours: number;
}

export interface RootState {
  week: number;
  dayOfWeek: DayOfWeek;
  hour: number;
  minute: number;
  activeTab: ActiveTab;
  activeGig: Gig | null;
  availableGigs: Gig[];
  weekSchedule: Record<DayOfWeek, WeekSlot>;
  completedGigIdsThisWeek: string[];
  isGameOver: boolean;
  gameOverReason: string | null;
  isVictory: boolean;
  hasCompanyBought: boolean;

  // Root actions & selectors
  advanceMinute: (minutes: number) => void;
  advanceDay: () => { weekCompleted: boolean; message: string };
  setActiveTab: (tab: ActiveTab) => void;
  setActiveGig: (gig: Gig | null) => void;
  getGigResourceRequirements: (gig: Gig) => GigResourceRequirements;
  canExecuteTodayGig: () => TodayGigExecutionCheck;
  scheduleGigInCalendar: (
    gigId: string,
    preferredStartDay?: DayOfWeek
  ) => { success: boolean; message: string; assignedDays: DayOfWeek[] };
  unscheduleGigFromDay: (day: DayOfWeek) => { success: boolean; message: string };
  assignGigToDay: (day: DayOfWeek, gig: Gig) => boolean;
  completeMinigame: (precision: number) => {
    grade: 'perfect' | 'good' | 'fail';
    pay: number;
    xp: number;
    rep: number;
    staminaConsumed: number;
    minutesElapsed: number;
    intelAwarded?: boolean;
    blockedReason?: string | null;
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

function resolveActiveGigForDay(
  schedule: Record<DayOfWeek, WeekSlot>,
  day: DayOfWeek,
  catalog: Gig[]
): Gig | null {
  const slot = schedule[day];
  if (!slot || slot.type !== 'gig' || !slot.gigId || slot.result) {
    return null;
  }
  return catalog.find((g) => g.id === slot.gigId) || null;
}

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
      activeGig: resolveActiveGigForDay(INITIAL_WEEK_SCHEDULE, 'MA', AVAILABLE_GIGS_CATALOG),
      availableGigs: AVAILABLE_GIGS_CATALOG,
      weekSchedule: INITIAL_WEEK_SCHEDULE,
      completedGigIdsThisWeek: [],
      isGameOver: false,
      gameOverReason: null,
      isVictory: false,
      hasCompanyBought: false,

      setActiveTab: (tab) => set({ activeTab: tab }, false, 'root/setActiveTab'),
      setActiveGig: (gig) => set({ activeGig: gig }, false, 'root/setActiveGig'),

      /**
       * Laskee keikan vaatiman staminakulutuksen ja työpäivän keston (minuutteina ja tunteina).
       * Huomioi keikan vaativuustason (Tier 1..3), pelaajan työkalut/sertifikaatit/tiimin
       * sekä 'precision_grip' -erikoistumistaidon.
       */
      getGigResourceRequirements: (gig) => {
        const state = get();
        const baseStaminaByTier = gig.tier === 1 ? 25 : gig.tier === 2 ? 35 : 45;
        let effectiveStamina = state.getEffectiveStaminaCost
          ? state.getEffectiveStaminaCost(baseStaminaByTier)
          : baseStaminaByTier;

        // Tarkkuusote ('precision_grip') keventää urakoiden fyysistä rasitusta vielä -20 %
        if (state.player.unlockedPerks?.includes('precision_grip')) {
          effectiveStamina = Math.max(8, Math.round(effectiveStamina * 0.8 * 10) / 10);
        } else {
          effectiveStamina = Math.max(10, Math.round(effectiveStamina * 10) / 10);
        }

        // Keikan kesto pelikellossa per työpäivä: Tier 1 = 4h (240m), Tier 2 = 5h (300m), Tier 3 = 6h (360m)
        const durationHours = gig.tier === 1 ? 4 : gig.tier === 2 ? 5 : 6;
        const durationMinutes = durationHours * 60;

        return {
          staminaCost: effectiveStamina,
          durationMinutes,
          durationHours,
        };
      },

      /**
       * Tarkistaa kaikki reunaehdot sille, voiko pelaaja suorittaa kuluvan päivän toimeksiannon:
       * 1. Onko kalenterissa tälle päivälle sovittu keikka?
       * 2. Onko tämän päivän keikkaosuus jo suoritettu (estää loputtoman farmaamisen)?
       * 3. Riittääkö pelaajan stamina?
       * 4. Riittääkö työpäivässä pelikelloaikaa (työpäivä päättyy klo 22:00)?
       */
      canExecuteTodayGig: () => {
        const state = get();
        const slot = state.weekSchedule[state.dayOfWeek];

        if (!slot || slot.type === 'rest') {
          return {
            canExecute: false,
            reason:
              'Tänään on kalenteriin merkitty lepopäivä. Lepää ja siirry seuraavaan päivään.',
            gig: null,
            slot: slot || { day: state.dayOfWeek, type: 'rest' },
            staminaCost: 0,
            durationMinutes: 0,
            durationHours: 0,
          };
        }

        if (slot.type !== 'gig' || !slot.gigId) {
          return {
            canExecute: false,
            reason:
              'Tälle päivälle ei ole sovittua asiakaskeikkaa kalenterissa. Varaa keikka Keikkapörssistä!',
            gig: null,
            slot,
            staminaCost: 0,
            durationMinutes: 0,
            durationHours: 0,
          };
        }

        const gig =
          state.availableGigs.find((g) => g.id === slot.gigId) || state.activeGig || null;

        if (!gig) {
          return {
            canExecute: false,
            reason: 'Toimeksiannon tietoja ei löytynyt katalogista.',
            gig: null,
            slot,
            staminaCost: 0,
            durationMinutes: 0,
            durationHours: 0,
          };
        }

        const { staminaCost, durationMinutes, durationHours } =
          state.getGigResourceRequirements(gig);

        if (slot.result) {
          return {
            canExecute: false,
            reason:
              'Tämän päivän sovittu toimeksianto on jo suoritettu! Voit tehdä pientöitä verstaalla tai päättää työpäivän.',
            gig,
            slot,
            staminaCost,
            durationMinutes,
            durationHours,
          };
        }

        if (state.player.stamina < staminaCost) {
          return {
            canExecute: false,
            reason: `Stamina ei riitä urakkaan (${Math.round(state.player.stamina)}% < ${staminaCost}%). Päätä päivä ja lepää.`,
            gig,
            slot,
            staminaCost,
            durationMinutes,
            durationHours,
          };
        }

        const currentMinutesOfDay = state.hour * 60 + state.minute;
        const maxWorkdayMinutes = 22 * 60; // Klo 22:00
        if (currentMinutesOfDay + durationMinutes > maxWorkdayMinutes) {
          const formattedClock = `${state.hour.toString().padStart(2, '0')}:${state.minute
            .toString()
            .padStart(2, '0')}`;
          return {
            canExecute: false,
            reason: `Kello on jo ${formattedClock}. Tämä ${durationHours} tunnin urakka täytyy aloittaa viimeistään klo ${
              22 - durationHours
            }:00.`,
            gig,
            slot,
            staminaCost,
            durationMinutes,
            durationHours,
          };
        }

        return {
          canExecute: true,
          reason: null,
          gig,
          slot,
          staminaCost,
          durationMinutes,
          durationHours,
        };
      },

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

      /**
       * Aikatauluttaa uniikin keikan viikkokalenteriin.
       * - Estää jo tällä viikolla suoritetun tai kalenterissa jo olevan keikan tuplavarauksen.
       * - Varaa `gig.durationDays` verran työpäiviä (MA–PE) alkaen joko valitusta päivästä tai
       *   ensimmäisestä vapaasta arkipäivästä kuluvasta päivästä eteenpäin.
       */
      scheduleGigInCalendar: (gigId, preferredStartDay) => {
        const state = get();
        const gig = state.availableGigs.find((g) => g.id === gigId);
        if (!gig) {
          return {
            success: false,
            message: 'Toimeksiantoa ei löytynyt keikkakatalogista.',
            assignedDays: [],
          };
        }

        // Tarkistetaan maine- ja sertifikaattivaatimukset
        if (state.player.personalRep < gig.requiredRep) {
          return {
            success: false,
            message: `Maineesi ei vielä riitä tähän urakkaan (${state.player.personalRep} < ${gig.requiredRep} REP).`,
            assignedDays: [],
          };
        }

        const missingCert = gig.requiredCerts.find(
          (c) => !state.player.certifications.includes(c)
        );
        if (missingCert) {
          return {
            success: false,
            message: `Urakka vaatii pätevyyden: ${missingCert}. Hanki sertifikaatti Paja-välilehdeltä.`,
            assignedDays: [],
          };
        }

        // Uniikkiustarkistus 1: Onko keikka jo suoritettu tällä viikolla?
        if (state.completedGigIdsThisWeek.includes(gig.id)) {
          return {
            success: false,
            message: `${gig.clientName} on jo suoritettu tällä viikolla! Jokainen sopimus voidaan suorittaa vain kerran viikossa.`,
            assignedDays: [],
          };
        }

        // Uniikkiustarkistus 2: Onko keikka jo aikataulutettu kalenteriin?
        const alreadyScheduledDays = INITIAL_WEEK_DAYS.filter(
          (d) => state.weekSchedule[d]?.type === 'gig' && state.weekSchedule[d]?.gigId === gig.id
        );
        if (alreadyScheduledDays.length > 0) {
          return {
            success: false,
            message: `${gig.clientName} on jo varattu kalenteriin päiville: ${alreadyScheduledDays.join(', ')}.`,
            assignedDays: alreadyScheduledDays,
          };
        }

        const workdays: DayOfWeek[] = ['MA', 'TI', 'KE', 'TO', 'PE'];
        const curDayIdx = INITIAL_WEEK_DAYS.indexOf(state.dayOfWeek);
        const startIdx = preferredStartDay
          ? INITIAL_WEEK_DAYS.indexOf(preferredStartDay)
          : curDayIdx;

        if (startIdx < curDayIdx) {
          return {
            success: false,
            message: 'Et voi aikatauluttaa keikkaa jo menneelle viikonpäivälle.',
            assignedDays: [],
          };
        }

        // Etsitään ensin täysin vapaat ('empty') arkipäivät kuluvasta päivästä eteenpäin
        const candidateDays: DayOfWeek[] = [];
        for (let i = startIdx; i < workdays.length; i++) {
          const d = workdays[i];
          const slot = state.weekSchedule[d];
          if (slot && !slot.result && (slot.type === 'empty' || d === preferredStartDay)) {
            candidateDays.push(d);
            if (candidateDays.length === gig.durationDays) break;
          }
        }

        // Jos täysin tyhjiä päiviä ei ollut tarpeeksi, sallitaan vielä suorittamattomien arkipäivien korvaaminen
        if (candidateDays.length < gig.durationDays) {
          candidateDays.length = 0;
          for (let i = startIdx; i < workdays.length; i++) {
            const d = workdays[i];
            const slot = state.weekSchedule[d];
            if (slot && !slot.result) {
              candidateDays.push(d);
              if (candidateDays.length === gig.durationDays) break;
            }
          }
        }

        if (candidateDays.length < gig.durationDays) {
          return {
            success: false,
            message: `Tällä viikolla ei ole tarpeeksi vapaita arkipäiviä (MA–PE) tälle ${gig.durationDays} päivän urakalle.`,
            assignedDays: [],
          };
        }

        const updatedSchedule = { ...state.weekSchedule };

        // Jos korvasimme jonkin osan aiemmasta monipäiväisestä keikasta, siivotaan sen orvot suorittamattomat osat
        const replacedGigIds = new Set<string>();
        candidateDays.forEach((d) => {
          const prev = updatedSchedule[d];
          if (prev?.type === 'gig' && prev.gigId && !prev.result) {
            replacedGigIds.add(prev.gigId);
          }
        });
        replacedGigIds.forEach((oldId) => {
          workdays.forEach((wd) => {
            if (updatedSchedule[wd]?.gigId === oldId && !updatedSchedule[wd]?.result) {
              updatedSchedule[wd] = { day: wd, type: 'empty' };
            }
          });
        });

        // Asetetaan uusi keikka valituille päiville
        candidateDays.forEach((d, idx) => {
          const partSuffix =
            gig.durationDays > 1 ? ` (Osa ${idx + 1}/${gig.durationDays})` : '';
          updatedSchedule[d] = {
            day: d,
            type: 'gig',
            gigId: gig.id,
            title: `${gig.clientName}${partSuffix}`,
          };
        });

        const nextActiveGig = resolveActiveGigForDay(
          updatedSchedule,
          state.dayOfWeek,
          state.availableGigs
        );

        set(
          {
            weekSchedule: updatedSchedule,
            activeGig: nextActiveGig,
          },
          false,
          'root/scheduleGigInCalendar'
        );

        return {
          success: true,
          message: `${gig.clientName} varattu kalenteriin päiville: ${candidateDays.join(', ')}!`,
          assignedDays: candidateDays,
        };
      },

      unscheduleGigFromDay: (day) => {
        const state = get();
        const slot = state.weekSchedule[day];
        if (!slot || slot.type !== 'gig' || !slot.gigId) {
          return { success: false, message: 'Päivällä ei ole varattua keikkaa.' };
        }
        if (slot.result) {
          return {
            success: false,
            message: 'Jo suoritettua keikkaa ei voi poistaa kalenterista.',
          };
        }

        const targetGigId = slot.gigId;
        const updatedSchedule = { ...state.weekSchedule };
        INITIAL_WEEK_DAYS.forEach((d) => {
          if (updatedSchedule[d]?.gigId === targetGigId && !updatedSchedule[d]?.result) {
            updatedSchedule[d] = { day: d, type: 'empty' };
          }
        });

        const nextActiveGig = resolveActiveGigForDay(
          updatedSchedule,
          state.dayOfWeek,
          state.availableGigs
        );

        set(
          {
            weekSchedule: updatedSchedule,
            activeGig: nextActiveGig,
          },
          false,
          'root/unscheduleGigFromDay'
        );

        return {
          success: true,
          message: `Keikan varaus (${slot.title}) vapautettu kalenterista.`,
        };
      },

      assignGigToDay: (day, gig) => {
        const res = get().scheduleGigInCalendar(gig.id, day);
        return res.success;
      },

      completeMinigame: (precision) => {
        const state = get();
        const execCheck = state.canExecuteTodayGig();

        // Ehdoton reunaehtosuojaus: Estetään suoritus, jos kalenterissa ei ole keikkaa,
        // se on jo suoritettu tänään, tai stamina/pelikello ei riitä!
        if (!execCheck.canExecute || !execCheck.gig) {
          return {
            grade: 'fail',
            pay: 0,
            xp: 0,
            rep: 0,
            staminaConsumed: 0,
            minutesElapsed: 0,
            intelAwarded: false,
            blockedReason: execCheck.reason,
          };
        }

        const gig = execCheck.gig;
        const { staminaCost, durationMinutes } = execCheck;

        let grade: 'perfect' | 'good' | 'fail' = 'good';
        let multiplier = 0.85;

        if (precision >= 90) {
          grade = 'perfect';
          multiplier = 1.25;
        } else if (precision < 55) {
          grade = 'fail';
          multiplier = 0.4;
        }

        // Jos kyseessä on monipäiväinen urakka, päiväkohtainen tilitys vastaa päivän osuutta
        // kokonaisurakasta (tai täyttä palkkiota 1 pv keikoissa)
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

        const curDay = state.dayOfWeek;
        const slotTitle = state.weekSchedule[curDay]?.title || gig.clientName;

        // 1. Kulutetaan pelaajan Staminaa ja siirretään pelikelloa (esim. 4–6 tuntia)
        state.consumeStamina(staminaCost);
        state.advanceMinute(durationMinutes);

        // 2. Lisätään keikkapalkkio kassa- ja tapahtumalokiin
        state.addCash(
          pay,
          'gig_completion',
          `Keikkapalkkio (${curDay}): ${slotTitle} · Tarkkuus ${precision.toFixed(1)} % (${grade.toUpperCase()})`
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

        // 3. Lisätään XP ja Maine
        state.addXp(xp);
        state.addReputation(rep, `Keikka: ${slotTitle}`);

        // 4. Kokeillaan ansaita sisäpiirivihje (Insider Intel)
        const intel = state.awardInsiderIntelFromGig(gig.description, gig.clientName, precision);

        // 5. Urakan kesto edistää myös pörssimarkkinaa
        if (state.tickMarketPrices) {
          state.tickMarketPrices(durationMinutes * 60, '60m');
        }

        // 6. Merkitään nykyisen päivän tulos kalenteriin ja lukitaan keikka tältä päivältä
        set(
          (s) => {
            const updatedSchedule: Record<DayOfWeek, WeekSlot> = {
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
            };

            // Tarkistetaan, onko tällä keikalla vielä suorittamattomia päiviä tällä viikolla
            const hasRemainingParts = INITIAL_WEEK_DAYS.some(
              (d) =>
                updatedSchedule[d]?.type === 'gig' &&
                updatedSchedule[d]?.gigId === gig.id &&
                !updatedSchedule[d]?.result
            );

            const updatedCompletedIds =
              !hasRemainingParts && !s.completedGigIdsThisWeek.includes(gig.id)
                ? [...s.completedGigIdsThisWeek, gig.id]
                : s.completedGigIdsThisWeek;

            return {
              weekSchedule: updatedSchedule,
              completedGigIdsThisWeek: updatedCompletedIds,
              activeGig: null, // Päivän toimeksianto on nyt suoritettu!
            };
          },
          false,
          'root/completeMinigame'
        );

        return {
          grade,
          pay,
          xp,
          rep,
          staminaConsumed: staminaCost,
          minutesElapsed: durationMinutes,
          intelAwarded: !!intel,
          blockedReason: null,
        };
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

        // 2. Lepo palauttaa aina vähintään 25 staminaa (viikonloppulepo LA/SU palauttaa +45)
        const isRestDay = state.weekSchedule[state.dayOfWeek]?.type === 'rest';
        state.restoreStamina(isRestDay ? 45 : 25);

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

          const newWeekSchedule: Record<DayOfWeek, WeekSlot> = {
            MA: { day: 'MA', type: 'empty' },
            TI: { day: 'TI', type: 'empty' },
            KE: { day: 'KE', type: 'empty' },
            TO: { day: 'TO', type: 'empty' },
            PE: { day: 'PE', type: 'empty' },
            LA: { day: 'LA', type: 'rest', title: 'Lauantailepo' },
            SU: { day: 'SU', type: 'rest', title: 'Sunnuntai & Viikkoselvitys' },
          };

          // Nollataan viikon kalenteri ja suoritetut keikat uudelle viikolle
          set(
            {
              week: nextWeek,
              dayOfWeek: nextDay,
              hour: 8,
              minute: 0,
              completedGigIdsThisWeek: [],
              weekSchedule: newWeekSchedule,
              activeGig: null,
            },
            false,
            'root/newWeek'
          );

          return {
            weekCompleted: true,
            message: `Viikko ${nextWeek} alkoi! Varaa uuden viikon urakat Keikkapörssistä. ${debtResult.message}${settlementSuffix}`,
          };
        }

        // Normipäivän vaihto: synkronoidaan activeGig suoraan seuraavan päivän kalenterimerkinnästä!
        const nextActiveGig = resolveActiveGigForDay(
          state.weekSchedule,
          nextDay,
          state.availableGigs
        );

        set(
          {
            dayOfWeek: nextDay,
            hour: 8,
            minute: 0,
            activeGig: nextActiveGig,
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
            activeGig: resolveActiveGigForDay(INITIAL_WEEK_SCHEDULE, 'MA', AVAILABLE_GIGS_CATALOG),
            weekSchedule: INITIAL_WEEK_SCHEDULE,
            completedGigIdsThisWeek: [],
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
