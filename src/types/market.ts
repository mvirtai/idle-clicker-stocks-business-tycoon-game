/**
 * PÖRSSI- JA RAAKA-AINEKAUPANKÄYNNIN TIETOMALLIT (TRADER TYCOON)
 *
 * Senioriarkkitehdin opetus:
 * 1. Rahoitusteoriassa hinnat eivät ole pelkkää satunnaiskohinaa, vaan
 *    ne heijastavat makrotalouden sykliä (Business Cycle), korkotasoa,
 *    yritysten tuloskehitystä ja toimialakohtaista betaa (Markkinaherkkyys).
 * 2. Moniaikajänteinen OHLC-arkkitehtuuri (Multi-Timeframe Bucketing):
 *    TradingView-tyylisessä järjestelmässä kaavio ei pompi sekunnin välein,
 *    vaan kurssidata aggregoidaan aikajänteisiin (1m, 5m, 10m, 30m, 60m, 3h, 1d).
 *    Jokainen kynttilä (OHLCCandle) tallentaa avaus- (Open), ylimmän (High),
 *    alimman (Low) ja päätöskurssin (Close) sekä volyymin (Volume).
 */

export type AssetType = 'commodity' | 'stock';

export type EconomicRegime = 'expansion' | 'peak' | 'contraction' | 'recovery';

export type MarketTimeframe = '1m' | '5m' | '10m' | '30m' | '60m' | '3h' | '1d';

export interface TimeframeMetadata {
  id: MarketTimeframe;
  label: string;
  minutes: number;
  realTimeSeconds: number;
  volatilityScale: number;
  baseStaminaCost: number;
  description: string;
}

export const TIMEFRAME_ORDER: MarketTimeframe[] = ['1m', '5m', '10m', '30m', '60m', '3h', '1d'];

export const TIMEFRAME_CONFIG: Record<MarketTimeframe, TimeframeMetadata> = {
  '1m': {
    id: '1m',
    label: '1m',
    minutes: 1,
    realTimeSeconds: 60,
    volatilityScale: 0.45,
    baseStaminaCost: 5,
    description: '1 minuutin kynttilät (Tarkka mikrotrendi)',
  },
  '5m': {
    id: '5m',
    label: '5m',
    minutes: 5,
    realTimeSeconds: 300,
    volatilityScale: 0.75,
    baseStaminaCost: 7,
    description: '5 minuutin kynttilät (Päivänsisäinen kaupankäynti)',
  },
  '10m': {
    id: '10m',
    label: '10m',
    minutes: 10,
    realTimeSeconds: 600,
    volatilityScale: 1.0,
    baseStaminaCost: 9,
    description: '10 minuutin kynttilät (Lyhyen aikavälin momentum)',
  },
  '30m': {
    id: '30m',
    label: '30min',
    minutes: 30,
    realTimeSeconds: 1800,
    volatilityScale: 1.35,
    baseStaminaCost: 12,
    description: '30 minuutin kynttilät (Puolen tunnin suhdanne)',
  },
  '60m': {
    id: '60m',
    label: '60min',
    minutes: 60,
    realTimeSeconds: 3600,
    volatilityScale: 1.75,
    baseStaminaCost: 15,
    description: '60 minuutin kynttilät (Tuntitason swing-kauppa)',
  },
  '3h': {
    id: '3h',
    label: '3h',
    minutes: 180,
    realTimeSeconds: 10800,
    volatilityScale: 2.35,
    baseStaminaCost: 20,
    description: '3 tunnin kynttilät (Työpäivän rakenteellinen trendi)',
  },
  '1d': {
    id: '1d',
    label: '1d',
    minutes: 1440,
    realTimeSeconds: 86400,
    volatilityScale: 3.4,
    baseStaminaCost: 28,
    description: '1 päivän kynttilät (Päivätason makrosykli)',
  },
};

export interface OHLCCandle {
  timestamp: number;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20: number;
  ema9: number;
}

export interface MacroEconomy {
  regime: EconomicRegime;
  regimeName: string; // 'Nousukausi', 'Huippusuhdanne', 'Taantuma', 'Elpyminen'
  gdpGrowthPercent: number; // Esim. +2.4 %
  centralBankRatePercent: number; // Ohjauskorko, esim. 3.25 %
  inflationPercent: number; // Inflaatio, esim. 2.1 %
  sentimentScore: number; // 0 - 100 (0 = paniikki, 50 = neutraali, 100 = euforia)
  cycleTicksRemaining: number;
}

export interface MarketAsset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  unit: string; // 'kg', 'ton', 'osake'
  price: number;
  previousPrice: number;
  basePrice: number;
  volatility: number; // 0.01 - 0.05
  priceHistory: number[]; // Yhteensopivuuslista viimeisimmistä päätöskursseista
  candlesByTimeframe: Record<MarketTimeframe, OHLCCandle[]>;
  description: string;
  category: string;

  // Taloustieteelliset mittarit
  beta: number; // 0.5 = defensiivinen, 1.0 = markkinan mukainen, 1.8 = erittäin syklinen/kasvu
  dividendYieldAnnualPercent: number; // Esim. 4.8 % vuotuinen osinkotuotto
  peRatio?: number; // P/E-luku osakkeille
  momentum: number; // Nykyisen trendin jatkuvuuskerroin (-1.0 ... +1.0)
  movingAverage20: number; // 20 jakson liukuva keskiarvo (SMA-20)
}

export interface PortfolioPosition {
  assetId: string;
  quantity: number;
  averageBuyPrice: number;
  totalInvested: number;
  totalDividendsCollected: number;
}

export interface MarketNews {
  id: string;
  title: string;
  description: string;
  affectedAssetId: string;
  priceImpactMultiplier: number;
  durationTicks: number;
  timestamp: number;
  isRead: boolean;
}

export interface InsiderIntel {
  id: string;
  sourceGigClient: string;
  title: string;
  whisperText: string;
  affectedAssetId: string;
  predictedDirection: 'bullish' | 'bearish';
  expectedImpactPercent: number;
  validUntilDay: string;
  confidence: number;
  isUsed: boolean;
  createdAtWeek: number;
}

