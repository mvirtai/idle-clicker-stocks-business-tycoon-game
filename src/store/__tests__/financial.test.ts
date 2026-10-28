import { PriceHistoryBuffer } from '../../utils/circularBuffer';
import { useGameStore, calculateBusinessMetrics } from '../useGameStore';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Testivirhe (${message}): Odotettiin ${JSON.stringify(expected)}, saatiin ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Testivirhe (${message}): Ehto ei täyttynyt.`);
  }
}

function runFinancialAndStoreTests(): void {
  // 1. Aloitustilan testi: Yksinyrittäjä (0 €/pv passiivituotto, 420 € kassa)
  useGameStore.getState().restartGame();
  const initialState = useGameStore.getState();

  assertEqual(initialState.cash, 420.0, 'Aloituskassa on 420.00 €');
  assertEqual(initialState.hasCompanyBought, false, 'Yritystä ei ole ostettu alussa');
  assertEqual(initialState.company.employees.length, 0, 'Alussa 0 työntekijää');

  const initialPassive = initialState.getDailyPassiveBreakdown('MA');
  assertEqual(initialPassive.upgradeDailyEur, 0, 'Sopimustuotto alussa 0 €/pv');
  assertEqual(initialPassive.teamDailyEur, 0, 'Tiimituotto alussa 0 €/pv');
  assertEqual(initialPassive.totalDailyEur, 0, 'Kokonaistilitys alussa 0 €/pv');

  const initialMetrics = calculateBusinessMetrics(initialState);
  assertEqual(initialMetrics.dailyPassiveIncome, 0, 'Metrics dailyPassiveIncome alussa 0');
  assertEqual(initialMetrics.collateralRiskPercent, 0, 'Kodin panttiriski ennen lainaa 0 %');

  // 2. Ledger Coalescing & Pelikellon päivätilitys
  const firstClick = useGameStore.getState().performManualClick(1.0);
  const secondClick = useGameStore.getState().performManualClick(1.0);
  assertTrue(firstClick > 0, 'Manuaalinen klikkaus tuottaa rahaa');
  assertEqual(firstClick, secondClick, 'Saman tason klikkaukset tuottavat saman verran');

  const afterClicks = useGameStore.getState();
  assertEqual(
    afterClicks.transactions.length,
    2,
    'Saman päivän manuaalityöt yhdistetään yhdeksi click_labor-riviksi'
  );
  assertEqual(afterClicks.transactions[0].category, 'click_labor', 'Uusin rivi on click_labor');
  assertEqual(
    afterClicks.transactions[0].amount,
    Math.round((firstClick + secondClick) * 100) / 100,
    'Koontirivin summa täsmää klikkauksiin'
  );
  assertEqual(
    afterClicks.transactions[0].balanceAfter,
    afterClicks.cash,
    'Tilikirjan balanceAfter täsmää kassaan'
  );

  // 3. Yrityskauppa (45 000 € laina + 2 asentajaa) ja työpäivän päätös (MA -> TI)
  useGameStore.getState().buyCompanyWithLoan();
  const cashBeforeDayEnd = useGameStore.getState().cash;

  useGameStore.getState().advanceDay();
  const afterDayEnd = useGameStore.getState();

  assertEqual(afterDayEnd.dayOfWeek, 'TI', 'Päivä siirtyi tiistaihin (TI)');
  assertTrue(afterDayEnd.cash > cashBeforeDayEnd, 'Päivätilitys kasvatti kassaa päivän vaihtuessa');
  assertEqual(
    afterDayEnd.transactions[0].category,
    'passive_revenue',
    'Päivätilitys kirjattiin passive_revenue-kategoriaan'
  );
  assertEqual(
    afterDayEnd.transactions[0].balanceAfter,
    afterDayEnd.cash,
    'Päivätilityksen balanceAfter täsmää kassaan'
  );

  // 4. PriceHistoryBuffer (Circular Buffer) O(1) rengaspuskuritesti
  const buf = new PriceHistoryBuffer(3);
  buf.push(10);
  buf.push(20);
  buf.push(30);
  buf.push(40);
  assertEqual(buf.toArray(), [20, 30, 40], 'PriceHistoryBuffer säilyttää 3 viimeisintä arvoa');

  console.log('✓ Kaikki talous-, tilikirja- ja rengaspuskuritestit (4/4) läpäisty!');
}

runFinancialAndStoreTests();
