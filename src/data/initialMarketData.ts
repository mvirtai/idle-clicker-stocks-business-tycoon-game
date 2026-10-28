import {
  MarketAsset,
  MarketNews,
  InsiderIntel,
  MacroEconomy,
  MarketTimeframe,
  OHLCCandle,
  TIMEFRAME_ORDER,
  TIMEFRAME_CONFIG,
} from '../types/market';

export const INITIAL_MACRO_ECONOMY: MacroEconomy = {
  regime: 'expansion',
  regimeName: 'Nousukausi (Expansion)',
  gdpGrowthPercent: 2.6,
  centralBankRatePercent: 2.75,
  inflationPercent: 2.2,
  sentimentScore: 68,
  cycleTicksRemaining: 10,
};

/**
 * Deterministinen näennäissatunnaisgeneraattori (PRNG) siemenarvolla,
 * jotta jokaisella aikajänteellä (1m, 5m, 10m, 30m, 60m, 3h, 1d) on realistinen,
 * toisistaan erottuva ja matemaattisesti johdonmukainen OHLC-kynttilähistoria.
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function formatTimeframeLabel(tf: MarketTimeframe, indexFromEnd: number, totalCandles: number): string {
  const stepsBack = totalCandles - 1 - indexFromEnd;
  const cfg = TIMEFRAME_CONFIG[tf];

  if (tf === '1d') {
    const days = ['MA', 'TI', 'KE', 'TO', 'PE', 'LA', 'SU'];
    const dayIdx = ((totalCandles - 1 - stepsBack) % 7 + 7) % 7;
    const weekNum = Math.max(1, Math.floor((totalCandles - 1 - stepsBack) / 7) + 1);
    return `Vk${weekNum} ${days[dayIdx]}`;
  }

  if (tf === '3h') {
    const baseHour = 15;
    const totalHoursBack = stepsBack * 3;
    const hr = ((baseHour - totalHoursBack) % 24 + 24) % 24;
    const dayOffset = Math.floor(totalHoursBack / 24);
    return dayOffset > 0 ? `-${dayOffset}pv ${String(hr).padStart(2, '0')}:00` : `${String(hr).padStart(2, '0')}:00`;
  }

  // 1m, 5m, 10m, 30m, 60m
  const baseTotalMinutes = 14 * 60 + 30; // Klo 14:30
  const minsBack = stepsBack * cfg.minutes;
  const targetMins = ((baseTotalMinutes - minsBack) % 1440 + 1440) % 1440;
  const hh = String(Math.floor(targetMins / 60)).padStart(2, '0');
  const mm = String(targetMins % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function generateInitialCandlesByTimeframe(
  assetId: string,
  basePrice: number,
  currentPrice: number,
  volatility: number,
  momentum: number
): Record<MarketTimeframe, OHLCCandle[]> {
  const result = {} as Record<MarketTimeframe, OHLCCandle[]>;
  const candleCount = 36;

  // Muodostetaan merkkijonosta numeerinen siemen
  let baseSeed = 0;
  for (let i = 0; i < assetId.length; i++) {
    baseSeed = (baseSeed * 31 + assetId.charCodeAt(i)) % 1000000;
  }

  TIMEFRAME_ORDER.forEach((tf, tfIdx) => {
    const cfg = TIMEFRAME_CONFIG[tf];
    const rand = seededRandom(baseSeed + (tfIdx + 1) * 7919);
    const tfVol = volatility * cfg.volatilityScale;

    // Generoidaan polku taaksepäin nykyhinnasta, jotta viimeinen kynttilä päättyy tarkasti currentPrice-arvoon
    const closes: number[] = new Array(candleCount);
    closes[candleCount - 1] = currentPrice;

    for (let i = candleCount - 2; i >= 0; i--) {
      const shock = (rand() - 0.5 + momentum * 0.08) * tfVol;
      const meanRev = ((closes[i + 1] - basePrice) / basePrice) * 0.05;
      const prevClose = Math.max(0.25, Math.round(closes[i + 1] / (1 + shock - meanRev) * 100) / 100);
      closes[i] = prevClose;
    }

    const candles: OHLCCandle[] = [];
    let ema9 = closes[0];
    const emaMultiplier = 2 / (9 + 1);

    for (let i = 0; i < candleCount; i++) {
      const close = closes[i];
      const open = i === 0 ? Math.round(close * (1 - (rand() - 0.5) * tfVol * 0.6) * 100) / 100 : closes[i - 1];
      const bodyMax = Math.max(open, close);
      const bodyMin = Math.min(open, close);

      const upperWick = bodyMax * (rand() * tfVol * 0.85 + 0.0015);
      const lowerWick = bodyMin * (rand() * tfVol * 0.85 + 0.0015);

      const high = Math.round((bodyMax + upperWick) * 100) / 100;
      const low = Math.max(0.1, Math.round((bodyMin - lowerWick) * 100) / 100);

      // Lasketaan SMA-20
      const startIdx = Math.max(0, i - 19);
      const slice = closes.slice(startIdx, i + 1);
      const sma20 = Math.round((slice.reduce((acc, v) => acc + v, 0) / slice.length) * 100) / 100;

      // Lasketaan EMA-9
      ema9 = i === 0 ? close : Math.round(((close - ema9) * emaMultiplier + ema9) * 100) / 100;

      // Skaalataan volyymi aikajänteen ja hintaliikkeen mukaan
      const moveRatio = Math.abs(close - open) / Math.max(0.5, open);
      const baseVol = Math.round(180 * Math.sqrt(cfg.minutes) * (0.6 + rand() * 0.9 + moveRatio * 18));

      candles.push({
        timestamp: Date.now() - (candleCount - 1 - i) * cfg.realTimeSeconds * 1000,
        label: formatTimeframeLabel(tf, i, candleCount),
        open,
        high,
        low,
        close,
        volume: baseVol,
        sma20,
        ema9,
      });
    }

    result[tf] = candles;
  });

  return result;
}

export const INITIAL_MARKET_ASSETS: MarketAsset[] = [
  // 1. RAAKA-AINEET (Commodities)
  {
    id: 'cu-copper',
    name: 'Korkealaatuinen Kupari (Cu)',
    symbol: 'CU',
    type: 'commodity',
    unit: 'kg',
    price: 8.65,
    previousPrice: 8.50,
    basePrice: 8.50,
    volatility: 0.022,
    priceHistory: [8.2, 8.25, 8.3, 8.35, 8.4, 8.42, 8.45, 8.48, 8.5, 8.52, 8.55, 8.58, 8.6, 8.65],
    candlesByTimeframe: generateInitialCandlesByTimeframe('cu-copper', 8.50, 8.65, 0.022, 0.12),
    description: 'Sähköjohtimien, muuntajien ja keskuskiskojen elintärkeä raaka-aine.',
    category: 'Metalli',
    beta: 1.35,
    dividendYieldAnnualPercent: 0,
    momentum: 0.12,
    movingAverage20: 8.45,
  },
  {
    id: 'li-lithium',
    name: 'Akkuluokan Litium (Li)',
    symbol: 'LI',
    type: 'commodity',
    unit: 'kg',
    price: 21.80,
    previousPrice: 22.10,
    basePrice: 22.00,
    volatility: 0.035,
    priceHistory: [23.4, 23.2, 23.0, 22.8, 22.6, 22.4, 22.3, 22.1, 22.0, 21.9, 21.8],
    candlesByTimeframe: generateInitialCandlesByTimeframe('li-lithium', 22.00, 21.80, 0.035, -0.08),
    description: 'Varavoimalaitteiden, UPS-akkujen ja sähköautojen kriittinen mineraali.',
    category: 'Akkumetalli',
    beta: 1.75,
    dividendYieldAnnualPercent: 0,
    momentum: -0.08,
    movingAverage20: 22.4,
  },
  {
    id: 'si-silicon',
    name: 'Teollisuuspii & Kiekot (Si)',
    symbol: 'SI',
    type: 'commodity',
    unit: 'kg',
    price: 14.25,
    previousPrice: 14.00,
    basePrice: 14.00,
    volatility: 0.018,
    priceHistory: [13.8, 13.85, 13.9, 13.92, 13.95, 14.0, 14.05, 14.1, 14.15, 14.2, 14.25],
    candlesByTimeframe: generateInitialCandlesByTimeframe('si-silicon', 14.00, 14.25, 0.018, 0.06),
    description: 'Puolijohdekomponenttien ja logiikkapiirien perusrakennusaine.',
    category: 'Puolijohde',
    beta: 1.1,
    dividendYieldAnnualPercent: 0,
    momentum: 0.06,
    movingAverage20: 14.05,
  },

  // 2. YRITYSOSAKKEET (Equities)
  {
    id: 'nord-grid',
    name: 'Nordic Grid Solutions Oyj',
    symbol: 'NORD',
    type: 'stock',
    unit: 'osake',
    price: 34.50,
    previousPrice: 34.00,
    basePrice: 33.50,
    volatility: 0.015,
    priceHistory: [32.8, 33.0, 33.2, 33.4, 33.6, 33.8, 34.0, 34.1, 34.2, 34.3, 34.5],
    candlesByTimeframe: generateInitialCandlesByTimeframe('nord-grid', 33.50, 34.50, 0.015, 0.05),
    description: 'Korkeajänniteverkkojen infrastruktuurijätti. Vakaa osingonmaksaja.',
    category: 'Infrastruktuuri',
    beta: 0.65,
    dividendYieldAnnualPercent: 5.2, // 5.2 % osinkotuotto
    peRatio: 14.5,
    momentum: 0.05,
    movingAverage20: 33.7,
  },
  {
    id: 'robo-tech',
    name: 'RoboTech Automation Oyj',
    symbol: 'ROBO',
    type: 'stock',
    unit: 'osake',
    price: 48.20,
    previousPrice: 49.00,
    basePrice: 47.00,
    volatility: 0.038,
    priceHistory: [44.5, 45.0, 45.8, 46.5, 47.2, 48.0, 48.5, 49.0, 48.8, 48.2],
    candlesByTimeframe: generateInitialCandlesByTimeframe('robo-tech', 47.00, 48.20, 0.038, 0.15),
    description: 'Teollisuusrobottien ja konenäkösovellusten kasvuyhtiö.',
    category: 'Teknologia',
    beta: 1.55,
    dividendYieldAnnualPercent: 1.2,
    peRatio: 26.8,
    momentum: 0.15,
    movingAverage20: 47.4,
  },
  {
    id: 'clean-volt',
    name: 'CleanVolt Energy Systems',
    symbol: 'VOLT',
    type: 'stock',
    unit: 'osake',
    price: 19.80,
    previousPrice: 18.90,
    basePrice: 18.00,
    volatility: 0.045,
    priceHistory: [16.8, 17.2, 17.5, 18.0, 18.4, 18.9, 19.1, 19.4, 19.8],
    candlesByTimeframe: generateInitialCandlesByTimeframe('clean-volt', 18.00, 19.80, 0.045, 0.22),
    description: 'Kiinteistöjen akusto- ja aurinkosähköjärjestelmien toimittaja.',
    category: 'Energia',
    beta: 1.7,
    dividendYieldAnnualPercent: 0.8,
    peRatio: 32.4,
    momentum: 0.22,
    movingAverage20: 18.6,
  },
];

export const INITIAL_MARKET_NEWS: MarketNews[] = [
  {
    id: 'news-init-1',
    title: 'Satamalakko viivästyttää kuparitoimituksia Euroopassa',
    description: 'Rotterdamin sataman työtaistelu rajoittaa jalostetun kuparin virtausta. Hinta nousupaineessa.',
    affectedAssetId: 'cu-copper',
    priceImpactMultiplier: 1.15,
    durationTicks: 25,
    timestamp: Date.now() - 3600000,
    isRead: false,
  },
];

export const INITIAL_INSIDER_INTEL: InsiderIntel[] = [
  {
    id: 'intel-init-1',
    sourceGigClient: 'Kattoterassi Skybar',
    title: 'Aurinkosähköpuistojen jättitilaus varmistumassa',
    whisperText: 'Asiakkaan pääurakoitsija mainitsi neuvottelevansa CleanVolt Energyn kanssa merkittävästä akkutoimituksesta.',
    affectedAssetId: 'clean-volt',
    predictedDirection: 'bullish',
    expectedImpactPercent: 18,
    validUntilDay: 'PE',
    confidence: 85,
    isUsed: false,
    createdAtWeek: 1,
  },
];

