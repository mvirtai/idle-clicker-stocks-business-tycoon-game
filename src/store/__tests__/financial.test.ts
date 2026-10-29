import { PriceHistoryBuffer } from '../../utils/circularBuffer';
import { useGameStore, calculateBusinessMetrics } from '../useGameStore';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Assertion failed (${message}): Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed (${message}): Condition evaluated to false.`);
  }
}

function runFinancialAndStoreTests(): void {
  // 1. Initial State Test: Solo Entrepreneur (0 EUR/day passive income, 420 EUR starting cash)
  useGameStore.getState().restartGame();
  const initialState = useGameStore.getState();

  assertEqual(initialState.cash, 420.0, 'Starting cash should be 420.00 EUR');
  assertEqual(initialState.hasCompanyBought, false, 'Company should not be bought initially');
  assertEqual(initialState.company.employees.length, 0, 'Should start with 0 employees');

  const initialPassive = initialState.getDailyPassiveBreakdown('MA');
  assertEqual(initialPassive.upgradeDailyEur, 0, 'Initial upgrade passive income should be 0 EUR/day');
  assertEqual(initialPassive.teamDailyEur, 0, 'Initial team passive income should be 0 EUR/day');
  assertEqual(initialPassive.totalDailyEur, 0, 'Initial total daily settlement should be 0 EUR/day');

  const initialMetrics = calculateBusinessMetrics(initialState);
  assertEqual(initialMetrics.dailyPassiveIncome, 0, 'Metrics dailyPassiveIncome should be 0 initially');
  assertEqual(initialMetrics.collateralRiskPercent, 0, 'Collateral risk before loan should be 0%');

  // 2. Ledger Coalescing & Manual Workshop Labor
  const firstClick = useGameStore.getState().performManualClick(1.0);
  const secondClick = useGameStore.getState().performManualClick(1.0);
  assertTrue(firstClick > 0, 'Manual workshop click should yield positive cash');
  assertEqual(firstClick, secondClick, 'Same-level clicks should yield identical amounts');

  const afterClicks = useGameStore.getState();
  assertEqual(
    afterClicks.transactions.length,
    2,
    'Same-day manual clicks should coalesce into a single click_labor ledger entry'
  );
  assertEqual(afterClicks.transactions[0].category, 'click_labor', 'Newest ledger entry should be click_labor');
  assertEqual(
    afterClicks.transactions[0].amount,
    Math.round((firstClick + secondClick) * 100) / 100,
    'Coalesced ledger entry amount should match sum of clicks'
  );
  assertEqual(
    afterClicks.transactions[0].balanceAfter,
    afterClicks.cash,
    'Ledger balanceAfter should match current cash'
  );

  // 3. Calendar-Synchronized Daily Gig (Unique 1x Execution, Stamina & Game Clock Gating)
  const checkBeforeGig = useGameStore.getState().canExecuteTodayGig();
  assertEqual(checkBeforeGig.canExecute, true, 'Monday scheduled gig should be executable initially');
  assertEqual(checkBeforeGig.gig?.id, 'gig-club', 'Monday scheduled gig should be gig-club');

  const staminaBeforeGig = useGameStore.getState().player.stamina;
  const hourBeforeGig = useGameStore.getState().hour;
  const minuteBeforeGig = useGameStore.getState().minute;

  const gigRes = useGameStore.getState().completeMinigame(0.95);
  assertTrue(gigRes.pay > 0, 'Completing a scheduled gig should award pay');
  assertTrue(gigRes.staminaConsumed > 0, 'Completing a scheduled gig should consume Stamina');
  assertEqual(gigRes.minutesElapsed, 240, 'Tier 1 gig should advance game clock by 240 minutes (4h)');

  const afterGig = useGameStore.getState();
  assertTrue(
    afterGig.player.stamina < staminaBeforeGig,
    'Player Stamina should decrease after gig execution'
  );
  assertEqual(
    afterGig.hour * 60 + afterGig.minute,
    hourBeforeGig * 60 + minuteBeforeGig + 240,
    'Game clock should advance by exactly 4 hours (240 minutes)'
  );
  assertEqual(afterGig.activeGig, null, 'activeGig should reset to null once today gig is completed');
  assertTrue(
    afterGig.completedGigIdsThisWeek.includes('gig-club'),
    'Completed 1-day gig should be recorded in completedGigIdsThisWeek'
  );

  // Attempt duplicate execution on the same day -> Blocked by guard clause
  const checkAfterGig = useGameStore.getState().canExecuteTodayGig();
  assertEqual(
    checkAfterGig.canExecute,
    false,
    'Completed daily gig cannot be executed a second time on the same day'
  );
  const duplicateRes = useGameStore.getState().completeMinigame(1.0);
  assertEqual(duplicateRes.pay, 0, 'Duplicate execution attempt on the same day must return 0 EUR');

  // 4. Company Acquisition (45,000 EUR Loan + 2 Technicians) & End-of-Day Settlement (MA -> TI)
  useGameStore.getState().buyCompanyWithLoan();
  const cashBeforeDayEnd = useGameStore.getState().cash;

  useGameStore.getState().advanceDay();
  const afterDayEnd = useGameStore.getState();

  assertEqual(afterDayEnd.dayOfWeek, 'TI', 'Day should advance to Tuesday (TI)');
  assertEqual(
    afterDayEnd.activeGig?.id,
    'gig-coffee',
    'Tuesday scheduled gig (gig-coffee) should automatically sync into activeGig'
  );
  assertTrue(afterDayEnd.cash > cashBeforeDayEnd, 'Daily settlement should increase cash on day transition');
  assertEqual(
    afterDayEnd.transactions[0].category,
    'passive_revenue',
    'Daily settlement should be recorded under passive_revenue category'
  );
  assertEqual(
    afterDayEnd.transactions[0].balanceAfter,
    afterDayEnd.cash,
    'Daily settlement balanceAfter should match current cash'
  );

  // 5. PriceHistoryBuffer (Circular Buffer) O(1) Ring Buffer Test
  const buf = new PriceHistoryBuffer(3);
  buf.push(10);
  buf.push(20);
  buf.push(30);
  buf.push(40);
  assertEqual(buf.toArray(), [20, 30, 40], 'PriceHistoryBuffer should retain the 3 most recent values');

  console.log('✓ All financial, calendar gig, ledger, and circular buffer test suites (5/5) passed!');
}

runFinancialAndStoreTests();
