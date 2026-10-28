import { StateCreator } from 'zustand';
import { GameStore } from '../useGameStore';
import { CompanyState, Employee, CompanyTier } from '../../types/game';
import { INITIAL_EMPLOYEES } from '../../data/initialData';

/**
 * Yrityksen organisaatiorakenne ja henkilöstönhallinta (Company Slice)
 *
 * Senioriarkkitehdin opetus juniorille:
 * Yrityksen kasvu siirtää pelin luonteen "manuaalisesta raadannasta"
 * "organisaation johtamiseen ja kassavirtariskin hallintaan".
 *
 * Työntekijöiden kiinteät viikkopalkat nostavat kiinteää kulurakennetta (burn rate).
 * Jos markkina hiljenee ja keikkoja ei ole, työntekijöiden palkat juoksevat silti!
 */

export interface CompanySlice {
  company: CompanyState;

  // Toiminnot (Actions)
  hireEmployee: (candidate: Omit<Employee, 'id' | 'hiredAtWeek'>) => {
    success: boolean;
    message: string;
  };
  fireEmployee: (employeeId: string) => { success: boolean; message: string };
  promoteEmployee: (employeeId: string) => { success: boolean; message: string };
  upgradeCompanyTier: () => { success: boolean; message: string };
  addCompanyReputation: (repDelta: number) => void;
}

const INITIAL_COMPANY: CompanyState = {
  name: 'Virtanen & Kumppanit Oy',
  tier: 'freelancer',
  companyRep: 45,
  employees: [],
  vanCapacity: 2,
  establishedAtWeek: 1,
};

export const createCompanySlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  CompanySlice
> = (set, get) => ({
  company: INITIAL_COMPANY,

  /**
   * Palkkaa uuden asentajan tai insinöörin yritykseen.
   */
  hireEmployee: (candidate) => {
    const state = get();
    const currentEmployees = state.company.employees;

    // Tarkistetaan kaluston ja toimitilojen kapasiteetti
    if (currentEmployees.length >= state.company.vanCapacity * 2) {
      return {
        success: false,
        message: `Kapasiteetti täynnä! Kalusto ja toimitilat vetävät max ${state.company.vanCapacity * 2} henkilöä. Päivitä kalustoa (Huoltoauto) ensin.`,
      };
    }

    // Rekrytointipalkkio ja perehdytyskulu (esim. 500 €)
    const onboardingCost = 500;
    const canAfford = state.spendCash(
      onboardingCost,
      'salary',
      `Rekrytointi- ja varustekulut: ${candidate.name}`
    );

    if (!canAfford) {
      return {
        success: false,
        message: `Käteinen ei riitä rekrytointikuluihin (${onboardingCost} €).`,
      };
    }

    const newEmployee: Employee = {
      ...candidate,
      id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      hiredAtWeek: state.week,
    };

    set(
      (s) => ({
        company: {
          ...s.company,
          employees: [...s.company.employees, newEmployee],
        },
      }),
      false,
      'company/hireEmployee'
    );

    return {
      success: true,
      message: `${candidate.name} palkattu! Tuottavuus kasvoi +${candidate.dailyOutputEur} €/pv.`,
    };
  },

  /**
   * Irtisanoo työntekijän kiinteiden kulujen leikkaamiseksi.
   */
  fireEmployee: (employeeId) => {
    const state = get();
    const employee = state.company.employees.find((e) => e.id === employeeId);

    if (!employee) {
      return { success: false, message: 'Työntekijää ei löytynyt yrityksen kirjoilta.' };
    }

    set(
      (s) => ({
        company: {
          ...s.company,
          employees: s.company.employees.filter((e) => e.id !== employeeId),
        },
      }),
      false,
      'company/fireEmployee'
    );

    return {
      success: true,
      message: `${employee.name} irtisanottu. Viikkopalkkakulut laskivat -${employee.weeklyCostEur} €/vk.`,
    };
  },

  /**
   * Kouluttaa työntekijän seuraavalle taitotasolle.
   */
  promoteEmployee: (employeeId) => {
    const state = get();
    const emp = state.company.employees.find((e) => e.id === employeeId);

    if (!emp) return { success: false, message: 'Työntekijää ei löytynyt.' };
    if (emp.skillLevel >= 5) return { success: false, message: 'Henkilö on jo huippuasiantuntija (Taso 5).' };

    const trainingCost = emp.skillLevel * 450;
    const paid = state.spendCash(
      trainingCost,
      'upgrade',
      `Täydennyskoulutus: ${emp.name} (Taso ${emp.skillLevel + 1})`
    );

    if (!paid) {
      return { success: false, message: `Ei tarpeeksi käteistä koulutukseen (${trainingCost} €).` };
    }

    set(
      (s) => ({
        company: {
          ...s.company,
          employees: s.company.employees.map((e) =>
            e.id === employeeId
              ? {
                  ...e,
                  skillLevel: e.skillLevel + 1,
                  dailyOutputEur: Math.round(e.dailyOutputEur * 1.4),
                  weeklyCostEur: Math.round(e.weeklyCostEur * 1.25),
                }
              : e
          ),
        },
      }),
      false,
      'company/promoteEmployee'
    );

    return {
      success: true,
      message: `${emp.name} koulutettu tasolle ${emp.skillLevel + 1}! Tuottavuus ja laatu paranivat.`,
    };
  },

  /**
   * Kasvattaa yritysmuotoa (Tmi -> Oy -> Konserni).
   */
  upgradeCompanyTier: () => {
    const state = get();
    const tier = state.company.tier;

    let targetTier: CompanyTier = 'limited_company';
    let cost = 5000;
    let repReq = 60;
    let title = 'Osakeyhtiö (Oy)';

    if (tier === 'limited_company') {
      targetTier = 'corporation';
      cost = 25000;
      repReq = 120;
      title = 'Teollisuuskonserni Oyj';
    } else if (tier === 'corporation') {
      return { success: false, message: 'Yritys on jo korkeimmassa konserniluokassa!' };
    }

    if (state.company.companyRep < repReq) {
      return {
        success: false,
        message: `Maine ei riitä (${state.company.companyRep} < ${repReq} REP). Tee lisää laatureittejä!`,
      };
    }

    const paid = state.spendCash(cost, 'upgrade', `Yritysmuodon korotus: ${title}`);
    if (!paid) {
      return {
        success: false,
        message: `Kassa ei riitä perustamispääomaan ja lakikuluihin (${cost.toLocaleString('fi-FI')} €).`,
      };
    }

    set(
      (s) => ({
        company: {
          ...s.company,
          tier: targetTier,
          vanCapacity: s.company.vanCapacity + 3,
          companyRep: s.company.companyRep + 25,
        },
      }),
      false,
      'company/upgradeTier'
    );

    return {
      success: true,
      message: `Yritysmuoto korotettu: ${title}! Kapasiteetti ja luottoluokitus kasvoivat.`,
    };
  },

  addCompanyReputation: (repDelta) => {
    set(
      (s) => ({
        company: {
          ...s.company,
          companyRep: Math.max(0, s.company.companyRep + repDelta),
        },
      }),
      false,
      'company/addReputation'
    );
  },
});
