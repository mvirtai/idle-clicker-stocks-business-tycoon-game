import { StateCreator } from 'zustand';
import { GameStore } from '../useGameStore';
import { LoanState } from '../../types/game';
import { INITIAL_LOAN } from '../../data/initialData';

/**
 * Pankkilainan ja kodin kiinnityksen tilanhallinta (Loan Slice)
 *
 * Senioriarkkitehdin opetus juniorille:
 * Tycoon-peleissä korkolaskenta ja lainanhoitomenot ovat pelillisen
 * jännityksen keskiössä.
 *
 * Reunaehtojen käsittely:
 * 1. Pääoma ei voi koskaan mennä negatiiviseksi (`Math.max(0, principal)`).
 * 2. Lyhennyksen kohdistus: Lainanhoitomaksusta maksetaan ensin korko,
 *    ja ylijäävä osuus lyhentää varsinaista pääomaa (annuiteetti/tasalyhennys).
 * 3. Maksuhäiriöt (Missed payments): Jos kassassa ei ole varoja viikon
 *    lyhennykseen, laskuri kasvaa. 3 rästiä = koti realisoidaan pankin toimesta!
 */

export interface LoanSlice {
  loan: LoanState;

  // Toiminnot (Actions)
  repayLoanPrincipal: (amount: number) => { success: boolean; paidAmount: number; message: string };
  processWeeklyDebtService: () => {
    success: boolean;
    interestCharged: number;
    principalPaid: number;
    defaultTriggered: boolean;
    message: string;
  };
  takeAdditionalCredit: (amount: number) => { success: boolean; message: string };
  rescueRefinance: () => { success: boolean; message: string };
}

export const createLoanSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  LoanSlice
> = (set, get) => ({
  loan: INITIAL_LOAN,

  /**
   * Pelaajan tekemä ylimääräinen lyhennys suoraan pääomaan (esim. 250 €, 1 000 € tai koko velka).
   */
  repayLoanPrincipal: (amount) => {
    const state = get();
    const currentPrincipal = state.loan.principal;

    if (currentPrincipal <= 0) {
      return { success: false, paidAmount: 0, message: 'Laina on jo maksettu kokonaan pois!' };
    }

    if (amount <= 0) {
      return { success: false, paidAmount: 0, message: 'Virheellinen lyhennyssumma.' };
    }

    // Maksetaan enintään jäljellä oleva pääoma
    const actualPay = Math.min(amount, currentPrincipal);

    // Tarkistetaan kassan riittävyys
    if (state.cash < actualPay) {
      return {
        success: false,
        paidAmount: 0,
        message: `Kassassa ei ole riittävästi varoja (${state.cash.toFixed(2)} € < ${actualPay.toFixed(2)} €).`,
      };
    }

    // Veloitetaan kassa
    state.spendCash(
      actualPay,
      'debt_service',
      `Ylimääräinen lainanlyhennys (${actualPay.toFixed(0)} €)`
    );

    const newPrincipal = Math.max(0, Math.round((currentPrincipal - actualPay) * 100) / 100);
    const newTotalRepaid = Math.round((state.loan.totalPrincipalRepaid + actualPay) * 100) / 100;

    set(
      (prevState) => ({
        loan: {
          ...prevState.loan,
          principal: newPrincipal,
          totalPrincipalRepaid: newTotalRepaid,
          // Jos velka kuitataan kokonaan, nollataan mahdolliset rästimerkinnät
          missedPayments: newPrincipal === 0 ? 0 : prevState.loan.missedPayments,
        },
      }),
      false,
      'loan/repayPrincipal'
    );

    const riskNow = (newPrincipal / state.loan.homeCollateralValue) * 100;
    const isFree = newPrincipal <= 0;

    return {
      success: true,
      paidAmount: actualPay,
      message: isFree
        ? '🎉 KAIKKI VELAT MAKSETTU! Perheen koti on 100 % vapaa pankin pantista!'
        : `Lainaa lyhennetty ${actualPay.toLocaleString('fi-FI')} €. Kodin panttiriski laski ${riskNow.toFixed(1)} %:iin.`,
    };
  },

  /**
   * Viikoittainen lainanhoitomaksu (kutsutaan sunnuntain päättyessä viikkoselvityksessä).
   */
  processWeeklyDebtService: () => {
    const state = get();
    const loan = state.loan;

    // Jos velka on jo maksettu, ei peritä mitään
    if (loan.principal <= 0) {
      return {
        success: true,
        interestCharged: 0,
        principalPaid: 0,
        defaultTriggered: false,
        message: 'Ei aktiivista lainasaldoa.',
      };
    }

    // Lasketaan viikon korko: pääoma * viikkokorko (esim. 45 000 € * 0.018 = 810 €)
    const interest = Math.round(loan.principal * loan.weeklyInterestRate * 100) / 100;
    const requiredTotal = loan.weeklyPayment;

    // Tarkistetaan onko pelaajalla varaa maksuun
    if (state.cash < requiredTotal) {
      // Maksuhäiriö!
      const newMissed = loan.missedPayments + 1;
      const defaulted = newMissed >= loan.maxMissedPayments;

      set(
        (prevState) => ({
          loan: {
            ...prevState.loan,
            missedPayments: newMissed,
            isDefaulted: defaulted,
          },
        }),
        false,
        'loan/missedPayment'
      );

      return {
        success: false,
        interestCharged: interest,
        principalPaid: 0,
        defaultTriggered: defaulted,
        message: defaulted
          ? '🚨 KONKURSSI JA ULOSOTTO: 3 rästilyhennystä ylittyi! Pankki on realisoinut kotisi!'
          : `⚠️ MAKSURÄSTI (#${newMissed}/${loan.maxMissedPayments}): Kassassa ei ollut varoja ${requiredTotal.toFixed(0)} € viikkomaksuun!`,
      };
    }

    // Pelaajalla on varat: veloitetaan
    state.spendCash(
      requiredTotal,
      'debt_service',
      `Viikoittainen lainanhoito: korko ${interest.toFixed(0)} € + lyhennys`
    );

    // Korko vähennetään maksusta, loput lyhentävät pääomaa
    const principalAmortized = Math.max(0, requiredTotal - interest);
    const newPrincipal = Math.max(0, Math.round((loan.principal - principalAmortized) * 100) / 100);

    set(
      (prevState) => ({
        loan: {
          ...prevState.loan,
          principal: newPrincipal,
          totalInterestPaid: Math.round((prevState.loan.totalInterestPaid + interest) * 100) / 100,
          totalPrincipalRepaid:
            Math.round((prevState.loan.totalPrincipalRepaid + principalAmortized) * 100) / 100,
          // Onnistunut maksu nollaa yhden rästimerkinnän
          missedPayments: Math.max(0, prevState.loan.missedPayments - 1),
        },
      }),
      false,
      'loan/weeklyDebtServiceSuccess'
    );

    return {
      success: true,
      interestCharged: interest,
      principalPaid: principalAmortized,
      defaultTriggered: false,
      message: `Pankkilyhennys hoidettu (-${requiredTotal.toFixed(0)} €). Pääoma lyheni ${principalAmortized.toFixed(0)} €.`,
    };
  },

  /**
   * Nostaa lisälainaa panttia vastaan (enintään 75 % kodin arvosta = 135 000 €).
   */
  takeAdditionalCredit: (amount) => {
    const state = get();
    const loan = state.loan;
    const maxCredit = loan.homeCollateralValue * 0.75; // 135 000 €
    const currentPrincipal = loan.principal;

    if (currentPrincipal + amount > maxCredit) {
      const allowed = Math.max(0, maxCredit - currentPrincipal);
      return {
        success: false,
        message: `Pankki hylkäsi lainahakemuksen. Enimmäisluototusaste 75 % saavutettu (max lisälaina: ${allowed.toLocaleString('fi-FI')} €).`,
      };
    }

    const newPrincipal = Math.round((currentPrincipal + amount) * 100) / 100;

    // Lisätään rahat kassaan
    state.addCash(
      amount,
      'debt_service',
      `Pankkilainan lisänosto yrityksen investointeihin (+${amount.toFixed(0)} €)`,
      'loan_draw'
    );

    set(
      (prevState) => ({
        loan: {
          ...prevState.loan,
          principal: newPrincipal,
        },
      }),
      false,
      'loan/takeAdditionalCredit'
    );

    return {
      success: true,
      message: `Myönnetty ${amount.toLocaleString('fi-FI')} € lisälainaa. Varat siirretty käyttötilille!`,
    };
  },

  /**
   * Hätärahoitus/sukulaistakaus ulosoton ja kodin menetyksen välttämiseksi.
   */
  rescueRefinance: () => {
    set(
      (prevState) => ({
        loan: {
          ...prevState.loan,
          missedPayments: 0,
          isDefaulted: false,
          // Lisätään järjestelypalkkio 2 500 € pääomaan
          principal: prevState.loan.principal + 2500,
        },
      }),
      false,
      'loan/rescueRefinance'
    );

    return {
      success: true,
      message: 'Laina uudelleenjärjestelty! Rästimerkinnät nollattu ja koti toistaiseksi turvattu (+2 500 € järjestelypalkkio pääomaan).',
    };
  },
});
