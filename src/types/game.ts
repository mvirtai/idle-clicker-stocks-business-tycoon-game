/**
 * FROM GIGS TO GIANTS — Pelin ydinmallit ja tyyppimääritelmät
 *
 * Arkkitehdin huomio:
 * Tyyppiturvallisuus on pelin talousjärjestelmässä kriittinen. Erityisesti
 * lainalaskenta, korkojen kumuloituminen ja yrityksen kiinteät kulut
 * vaativat tarkat sopimukset tilan ja toimintojen välillä.
 */

export type DayOfWeek = 'MA' | 'TI' | 'KE' | 'TO' | 'PE' | 'LA' | 'SU';

export type UpgradeCategory = 'tools' | 'certs' | 'equipment' | 'company';

export type MinigameType = 'timing' | 'wiring' | 'troubleshooting' | 'rhythm';

export type ActivityType = 'empty' | 'gig' | 'education' | 'rest' | 'burnout';

export type CompanyTier = 'freelancer' | 'sole_proprietorship' | 'limited_company' | 'corporation';

/**
 * Kirjanpidon tilitapahtuma (Ledger entry)
 * Arkkitehtuurivalinta: Älä muuta rahasaldoa 'näkymättömästi' ilman
 * tapahtumalokia, jotta kassavirta-analyysi ja tilinpäätökset ovat auditoitavissa.
 */
export interface TransactionRecord {
  id: string;
  timestamp: number; // Pelin virtuaalinen tai todellinen aikaleima
  week: number;
  day: DayOfWeek;
  type: 'income' | 'expense' | 'loan_draw' | 'loan_repay' | 'payroll' | 'living_costs';
  category: 'click_labor' | 'gig_completion' | 'passive_revenue' | 'upgrade' | 'debt_service' | 'salary' | 'living';
  amount: number; // Positiivinen = tulovirta, Negatiivinen = menovirta
  description: string;
  balanceAfter: number;
}

/**
 * Hahmonkehityksen erikoistumispuut (Perk Trees)
 */
export type PerkBranch = 'field' | 'market';

export type PerkId =
  // Kenttämestari (Field Specialist)
  | 'craftsman_flow'     // Tier 1: Käsityön virtaus
  | 'precision_grip'     // Tier 2: Tarkkuusote
  | 'jobsite_innovator'  // Tier 3: Työmaainnovaattori

  // Pörssihai (Market Analyst / Tycoon)
  | 'candle_focus'       // Tier 1: Kynttiläfokus
  | 'insider_network'    // Tier 2: Sisäpiiriverkosto
  | 'arbitrage_master';  // Tier 3: Arbitraasimestari

export interface PerkDefinition {
  id: PerkId;
  branch: PerkBranch;
  tier: 1 | 2 | 3;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  requiresPerkId?: PerkId;
  cost: number;
}

/**
 * Pelaajan henkilökohtainen tila
 */
export interface PlayerState {
  level: number;
  xp: number;
  stamina: number; // 0 - 100
  maxStamina: number;
  personalRep: number; // 0 - 200 (Maine kentällä)
  baseClickValue: number; // Perustuntipalkkio klikkauksesta (€)
  certifications: string[]; // Esim. "electrical_safety_1", "plc_basics"
  totalClicks: number;
  burnoutTurnsRemaining: number; // Jos stamina tippuu 0:aan

  // Erikoistumispisteet ja avatut taidot
  perkPoints: number;
  unlockedPerks: PerkId[];
}

/**
 * Pankkilaina ja perheen kodin kiinnitys (High-Stakes Tycoon Mechanic)
 *
 * Taustatarina & Rahoitusmekaniikka:
 * Yrityskauppa tai laitehankinnat on rahoitettu pankkilainalla, jonka
 * vakuutena on pelaajan perheen koti (arvo 180 000 €).
 * Jos viikkomaksuja jää rästiin (missedPayments >= 3), pankki realisoi asunnon.
 */
export interface LoanState {
  principal: number; // Jäljellä oleva pääoma (€)
  initialPrincipal: number; // Alkuperäinen velkamäärä (esim. 45 000 €)
  weeklyInterestRate: number; // Viikkokorko desimaalina (esim. 0.018 = 1.8 % / vk)
  weeklyPayment: number; // Viikottainen vakiolyhennys (€/vk)
  homeCollateralValue: number; // Kodin vakuusarvo (esim. 180 000 €)
  missedPayments: number; // Rästissä olevat lyhennykset
  maxMissedPayments: number; // Konkurssi / ulosottoraja (esim. 3)
  totalInterestPaid: number; // Kumulatiiviset maksetut korot
  totalPrincipalRepaid: number; // Kumulatiiviset maksetut lyhennykset
  isDefaulted: boolean; // Menetettiinkö koti?
}

/**
 * Työntekijä yrityksessä
 */
export interface Employee {
  id: string;
  name: string;
  role: string;
  skillLevel: number; // 1 - 5
  weeklyCostEur: number; // Palkkakulu viikossa
  dailyOutputEur: number; // Tuottavuus päivässä
  staminaEfficiency: number; // Vähentää omistajan työtaakkaa
  hiredAtWeek: number;
}

/**
 * Yrityksen organisaatiotila
 */
export interface CompanyState {
  name: string;
  tier: CompanyTier;
  companyRep: number;
  employees: Employee[];
  vanCapacity: number; // Kuinka montaa kohdetta voidaan operoida samanaikaisesti
  establishedAtWeek: number;
}

/**
 * Paja- ja kalustopäivitykset (Exponential cost curve)
 */
export interface UpgradeItem {
  id: string;
  name: string;
  category: UpgradeCategory;
  icon: string;
  description: string;
  lore: string;
  baseCost: number;
  costMultiplier: number; // Oletuksena 1.45
  level: number;
  maxLevel: number;
  clickBonus: number; // Lisää manuaalisen työn tuottoa per klikkaus
  passiveIncomeBonus: number; // Lisää päiväkohtaista sopimus-/automaatiolaskutusta (€/pv)
  staminaDrainReduction: number; // Vähentää väsymistä (0.05 = 5%)
  repBonus: number; // Kasvattaa mainetta
  unlocked: boolean;
  requiredLevel?: number;
  requiredCert?: string;
}

/**
 * Keikkapörssin toimeksianto
 */
export interface Gig {
  id: string;
  clientId: string;
  clientName: string;
  tier: 1 | 2 | 3;
  durationDays: number;
  payMin: number;
  payMax: number;
  requiredCerts: string[];
  requiredRep: number;
  minigameType: MinigameType;
  description: string;
  expiresAtWeek: number;
  reputationAward: number;
}

/**
 * Viikkosuunnitelman päiväpaikka
 */
export interface WeekSlot {
  day: DayOfWeek;
  type: ActivityType;
  gigId?: string;
  title?: string;
  result?: {
    grade: 'perfect' | 'good' | 'fail';
    precision: number;
    payEarned: number;
    xpEarned: number;
    repDelta: number;
  };
}

/**
 * Johdetut liiketoiminnan kasvumittarit (Business Growth & Health Metrics)
 *
 * Arkkitehdin huomio:
 * Nämä lasketaan dynaamisesti (Derived State / Selectors).
 * Älä tallenna näitä kantaan tai päästoreen, koska ne ovat suoraa
 * seurausta muista arvoista. Näin vältetään tilan epäsynkronointi.
 */
export interface BusinessMetrics {
  // Varallisuus ja tasapaino
  netWorth: number; // Käteisvarat + Kaluston arvo - Velat
  totalAssetValue: number; // Kaluston, työkalujen ja yrityksen investointiarvo
  collateralRiskPercent: number; // (Pääoma / Kodin vakuusarvo) * 100

  // Kassavirta ja kannattavuus
  weeklyRevenueEstimate: number; // Sopimustuotto (7 pv) + tiimilaskutus (5 arkipäivää)
  weeklyExpenses: number; // Elinkustannukset + Viikkopalkat + Lainanlyhennys
  netWeeklyCashflow: number; // Arvioitu viikkotulos
  burnRatePerWeek: number; // Kiinteä kulurakenne
  cashRunwayWeeks: number; // Montako viikkoa käteinen riittää ilman lisätuloja

  // Tuottavuusluvut
  manualClickPower: number; // € per klikkaus kertoimineen
  passiveIncomePerSecond: number; // Säilytetään yhteensopivuuden vuoksi (= dailyPassiveIncome)
  dailyPassiveIncome: number; // Päiväkohtainen sopimus- ja tiimilaskutus (€/pv)
  dailyUpgradeIncome: number; // Kaluston ja sopimusten osuus (€/pv)
  dailyTeamIncome: number; // Asentajatiimin osuus arkipäivinä (€/pv)
  grossMarginPercent: number; // Arvioitu katetuotto

  // Yrityksen status
  solvencyGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'CRITICAL';
  debtToEquityRatio: number;
}
