import { StateCreator } from 'zustand';
import { GameStore } from '../useGameStore';
import {
  MarketAsset,
  MarketNews,
  InsiderIntel,
  PortfolioPosition,
  MacroEconomy,
  EconomicRegime,
  MarketTimeframe,
  OHLCCandle,
  TIMEFRAME_CONFIG,
  TIMEFRAME_ORDER,
} from '../../types/market';
import {
  INITIAL_MARKET_ASSETS,
  INITIAL_MARKET_NEWS,
  INITIAL_INSIDER_INTEL,
  INITIAL_MACRO_ECONOMY,
} from '../../data/initialMarketData';

/**
 * Markkinoiden, makrotalouden, moniaikajänteisten OHLC-kynttilöiden ja salkun tilanhallinta
 *
 * Senioriarkkitehdin opetus juniorille:
 * 1. Miksi 1 sekunnin välein päivittyvä taulukko on anti-malli (Anti-Pattern) kaupankäyntinäkymässä?
 *    Jos kaavio ja hinnat muuttuvat joka sekunti, pelaaja ei pysty lukemaan teknisiä indikaattoreita
 *    (kuten SMA-20 tai EMA-9), ja käyttöliittymä tuntuu levottomalta.
 * 2. TradingView-tyylinen Aikajännearkkitehtuuri (Timeframe Bucketing):
 *    Käyttäjä valitsee haluamansa aikajänteen (`1m`, `5m`, `10m`, `30m`, `60m`, `3h`, `1d`).
 *    Päivityssilmukka kytketään suoraan valitun aikajänteen todelliseen kestoon
 *    (esim. 1m = 60 s, 5m = 5 min, 10m = 10 min, 30m = 30 min, 60m = 60 min, 3h = 3 h, 1d = 24 h),
 *    ja jokainen jakso muodostaa aidon OHLCV-kynttilän (Open, High, Low, Close, Volume).
 */

export interface MarketSlice {
  macroEconomy: MacroEconomy;
  marketAssets: MarketAsset[];
  portfolio: Record<string, PortfolioPosition>;
  marketNews: MarketNews[];
  insiderIntel: InsiderIntel[];
  selectedAssetId: string;
  selectedTimeframe: MarketTimeframe;
  chartStyle: 'candles' | 'area';
  lastCandleTimestamp: number;

  // Toiminnot (Actions)
  selectAsset: (assetId: string) => void;
  setSelectedTimeframe: (tf: MarketTimeframe) => void;
  setChartStyle: (style: 'candles' | 'area') => void;
  buyAsset: (assetId: string, quantity: number) => { success: boolean; message: string };
  sellAsset: (assetId: string, quantity: number) => { success: boolean; message: string };
  tickMarketPrices: (deltaTimeSeconds?: number, targetTimeframe?: MarketTimeframe) => void;
  stepMarketCandle: (targetTimeframe?: MarketTimeframe) => {
    success: boolean;
    staminaCost: number;
    xpAwarded: number;
    message: string;
  };
  processWeeklyDividends: () => { totalPaid: number; message: string };
  awardInsiderIntelFromGig: (
    gigTitle: string,
    clientName: string,
    precision: number
  ) => InsiderIntel | null;
  getPortfolioValue: () => number;
  getPortfolioProfitLoss: () => { amount: number; percent: number; totalDividends: number };
}

const REGIME_CONFIG: Record<
  EconomicRegime,
  {
    next: EconomicRegime;
    name: string;
    gdp: number;
    rate: number;
    inflation: number;
    sentiment: number;
    marketDrift: number;
  }
> = {
  expansion: {
    next: 'peak',
    name: 'Nousukausi (Expansion)',
    gdp: 2.8,
    rate: 2.75,
    inflation: 2.3,
    sentiment: 72,
    marketDrift: 0.0025,
  },
  peak: {
    next: 'contraction',
    name: 'Korkeasuhdanne (Peak)',
    gdp: 3.4,
    rate: 4.25,
    inflation: 4.1,
    sentiment: 84,
    marketDrift: 0.0005,
  },
  contraction: {
    next: 'recovery',
    name: 'Taantuma (Contraction)',
    gdp: -1.4,
    rate: 3.5,
    inflation: 1.5,
    sentiment: 28,
    marketDrift: -0.003,
  },
  recovery: {
    next: 'expansion',
    name: 'Elpyminen (Recovery)',
    gdp: 1.2,
    rate: 2.0,
    inflation: 1.8,
    sentiment: 54,
    marketDrift: 0.0018,
  },
};

function buildNextCandleLabel(tf: MarketTimeframe, week: number, dayOfWeek: string, hour: number, minute: number): string {
  if (tf === '1d') {
    return `Vk${week} ${dayOfWeek}`;
  }
  const now = new Date();
  const hh = String(hour || now.getHours()).padStart(2, '0');
  const mm = String(minute ?? now.getMinutes()).padStart(2, '0');
  if (tf === '3h') {
    return `${dayOfWeek} ${hh}:00`;
  }
  return `${hh}:${mm}`;
}

export const createMarketSlice: StateCreator<
  GameStore,
  [['zustand/devtools', never]],
  [],
  MarketSlice
> = (set, get) => ({
  macroEconomy: INITIAL_MACRO_ECONOMY,
  marketAssets: INITIAL_MARKET_ASSETS,
  portfolio: {},
  marketNews: INITIAL_MARKET_NEWS,
  insiderIntel: INITIAL_INSIDER_INTEL,
  selectedAssetId: 'cu-copper',
  selectedTimeframe: '5m',
  chartStyle: 'candles',
  lastCandleTimestamp: Date.now(),

  selectAsset: (assetId) => {
    set({ selectedAssetId: assetId }, false, 'market/selectAsset');
  },

  setSelectedTimeframe: (tf) => {
    set(
      {
        selectedTimeframe: tf,
        lastCandleTimestamp: Date.now(),
      },
      false,
      'market/setSelectedTimeframe'
    );
  },

  setChartStyle: (style) => {
    set({ chartStyle: style }, false, 'market/setChartStyle');
  },

  buyAsset: (assetId, quantity) => {
    const state = get();
    const asset = state.marketAssets.find((a) => a.id === assetId);

    if (!asset) {
      return { success: false, message: 'Kohde-etuutta ei löydy pörssistä.' };
    }

    if (quantity <= 0) {
      return { success: false, message: 'Määrän on oltava suurempi kuin 0.' };
    }

    const totalCost = Math.round(asset.price * quantity * 100) / 100;

    if (state.cash < totalCost) {
      return {
        success: false,
        message: `Kassavarat eivät riitä ostoon (${state.cash.toFixed(2)} € < ${totalCost.toFixed(2)} €).`,
      };
    }

    state.spendCash(
      totalCost,
      'upgrade',
      `Pörssiosto: ${quantity} ${asset.unit} ${asset.symbol} @ ${asset.price.toFixed(2)} €`
    );

    const existingPosition = state.portfolio[assetId];
    let newPosition: PortfolioPosition;

    if (existingPosition) {
      const nextQuantity = existingPosition.quantity + quantity;
      const nextInvested = existingPosition.totalInvested + totalCost;
      newPosition = {
        assetId,
        quantity: nextQuantity,
        totalInvested: Math.round(nextInvested * 100) / 100,
        averageBuyPrice: Math.round((nextInvested / nextQuantity) * 100) / 100,
        totalDividendsCollected: existingPosition.totalDividendsCollected || 0,
      };
    } else {
      newPosition = {
        assetId,
        quantity,
        totalInvested: totalCost,
        averageBuyPrice: asset.price,
        totalDividendsCollected: 0,
      };
    }

    set(
      (s) => ({
        portfolio: {
          ...s.portfolio,
          [assetId]: newPosition,
        },
      }),
      false,
      'market/buyAsset'
    );

    return {
      success: true,
      message: `Ostettu ${quantity} ${asset.unit} ${asset.symbol} yhteishintaan ${totalCost.toFixed(2)} €!`,
    };
  },

  sellAsset: (assetId, quantity) => {
    const state = get();
    const asset = state.marketAssets.find((a) => a.id === assetId);
    const position = state.portfolio[assetId];

    if (!asset || !position || position.quantity <= 0) {
      return { success: false, message: 'Sinulla ei ole tätä kohde-etuutta salkussasi.' };
    }

    const actualQty = Math.min(quantity, position.quantity);
    if (actualQty <= 0) {
      return { success: false, message: 'Virheellinen myyntimäärä.' };
    }

    // Jos pelaajalla on Arbitraasimestari-erikoistuminen (Pörssihai haara)
    const hasArbitrageMaster = state.player.unlockedPerks?.includes('arbitrage_master');
    const bonusMultiplier = hasArbitrageMaster ? 1.06 : 1.0; // +6 % myyntibonus

    const revenue = Math.round(asset.price * actualQty * bonusMultiplier * 100) / 100;
    const costBasis = Math.round(position.averageBuyPrice * actualQty * 100) / 100;
    const profit = Math.round((revenue - costBasis) * 100) / 100;

    state.addCash(
      revenue,
      'passive_revenue',
      `Pörssimyynti: ${actualQty} ${asset.unit} ${asset.symbol} (+${revenue.toFixed(2)} €, voitto: ${
        profit >= 0 ? '+' : ''
      }${profit.toFixed(2)} €)${hasArbitrageMaster ? ' [Arbitraasibonus +6%]' : ''}`
    );

    const remainingQty = position.quantity - actualQty;
    const updatedPortfolio = { ...state.portfolio };

    if (remainingQty <= 0) {
      delete updatedPortfolio[assetId];
    } else {
      const remainingInvested = Math.round((position.totalInvested - costBasis) * 100) / 100;
      updatedPortfolio[assetId] = {
        ...position,
        quantity: remainingQty,
        totalInvested: remainingInvested,
      };
    }

    set({ portfolio: updatedPortfolio }, false, 'market/sellAsset');

    return {
      success: true,
      message: `Myyty ${actualQty} ${asset.unit} ${asset.symbol}! Tuotto: ${revenue.toFixed(2)} € (Voitto: ${
        profit >= 0 ? '+' : ''
      }${profit.toFixed(2)} €).`,
    };
  },

  /**
   * Manuaalinen "+1 kynttilä" -kelaus (Resource-Gated Action).
   *
   * Senioriarkkitehdin opetus:
   * Jos pelaaja voisi kelata kynttilöitä ilmaiseksi ilman kustannusta,
   * syntyisi "Infinite Reroll Exploit" — pelaaja voisi näpytellä kynttilöitä
   * kunnes positio on voitolla. Kytkemällä toiminnon staminakulutukseen
   * (`getEffectiveStaminaCost`) ja pelikelloon (`advanceMinute`), jokaisella
   * markkinaseuranta-askeleella on vaihtoehtoiskustannus (Opportunity Cost),
   * jota hahmonkehitys (taso, työkalut, sertifikaatit ja tiimin delegointi) keventää.
   */
  stepMarketCandle: (targetTimeframe) => {
    const state = get();
    const activeTf = targetTimeframe || state.selectedTimeframe;
    const tfCfg = TIMEFRAME_CONFIG[activeTf];

    // Jos pelaajalla on 'candle_focus' -erikoistuminen (Pörssihai haara), kelauskulu laskee 40 %
    const hasCandleFocus = state.player.unlockedPerks?.includes('candle_focus');
    let staminaCost = state.getEffectiveStaminaCost(tfCfg.baseStaminaCost);
    if (hasCandleFocus) {
      staminaCost = Math.max(0.5, Math.round(staminaCost * 0.6 * 10) / 10);
    }

    // Reunaehto: Tarkistetaan riittääkö pelaajan stamina kynttilän kelaukseen
    if (state.player.stamina < staminaCost) {
      return {
        success: false,
        staminaCost,
        xpAwarded: 0,
        message: `Stamina ei riitä markkinaseurantaan (${state.player.stamina.toFixed(1)} / ${staminaCost.toFixed(1)}). Siirry seuraavaan päivään levätäksesi!`,
      };
    }

    // 1. Kulutetaan tehollinen stamina
    state.consumeStamina(staminaCost);

    // 2. Siirretään pelikelloa eteenpäin (rajataan max 180 min per painallus, 1d hoidetaan päivänvaihdolla tai 3h askeleena)
    const minutesToAdvance = Math.min(180, tfCfg.minutes);
    state.advanceMinute(minutesToAdvance);

    // 3. Simuloidaan uusi OHLC-kynttilä
    state.tickMarketPrices(tfCfg.realTimeSeconds, activeTf);

    // 4. Myönnetään markkina-analyysistä kokemuspisteitä (XP), mikä edistää hahmonkehitystä
    const xpAwarded = Math.max(2, Math.round(tfCfg.baseStaminaCost * 0.4));
    state.addXp(xpAwarded);

    return {
      success: true,
      staminaCost,
      xpAwarded,
      message: `Simuloitu +1 kynttilä (${tfCfg.label}): -${staminaCost.toFixed(1)} Stamina, +${xpAwarded} XP`,
    };
  },

  /**
   * Muodostaa uuden OHLC-kynttilän valitun aikajänteen (1m, 5m, 10m, 30m, 60m, 3h, 1d) mukaisesti.
   * Ei enää päivitä kaaviota sekunnin välein, vaan noudattaa valittua kynttiläväliä.
   */
  tickMarketPrices: (_deltaTimeSeconds, targetTimeframe) => {
    const state = get();
    const activeTf = targetTimeframe || state.selectedTimeframe;
    const tfCfg = TIMEFRAME_CONFIG[activeTf];

    // 1. Päivitetään makrotalouden sykli
    let nextMacro = { ...state.macroEconomy };
    nextMacro.cycleTicksRemaining -= 1;

    if (nextMacro.cycleTicksRemaining <= 0) {
      const nextRegimeKey = REGIME_CONFIG[nextMacro.regime].next;
      const cfg = REGIME_CONFIG[nextRegimeKey];
      nextMacro = {
        regime: nextRegimeKey,
        regimeName: cfg.name,
        gdpGrowthPercent: cfg.gdp,
        centralBankRatePercent: cfg.rate,
        inflationPercent: cfg.inflation,
        sentimentScore: cfg.sentiment,
        cycleTicksRemaining: 35,
      };
    }

    const macroDrift = REGIME_CONFIG[nextMacro.regime].marketDrift;

    // 2. Tarkistetaan aktiivisten uutisten vaikutukset
    const activeNewsMap = new Map<string, number>();
    state.marketNews.forEach((n) => {
      activeNewsMap.set(n.affectedAssetId, n.priceImpactMultiplier);
    });

    // 3. Lasketaan uudet hinnat ja päivitetään OHLC-kynttilät
    const updatedAssets = state.marketAssets.map((asset) => {
      const scaledVol = asset.volatility * tfCfg.volatilityScale;
      const randomShock = (Math.random() - 0.495) * 2;
      const reversionStrength = 0.006;
      const meanReversionDrift = ((asset.basePrice - asset.price) / asset.basePrice) * reversionStrength;

      // Makrotalouden vaikutus skaalattuna kohteen Betalla
      const betaAdjustedMacro = macroDrift * asset.beta;

      // Momentum-vaikutus (trendin jatkuvuus)
      const momentumEffect = asset.momentum * 0.0025;

      // Uutiskerroin
      const newsMultiplier = activeNewsMap.get(asset.id) || 1.0;
      const newsDrift = (newsMultiplier - 1.0) * 0.04;

      const deltaPercent =
        randomShock * scaledVol +
        meanReversionDrift +
        betaAdjustedMacro +
        momentumEffect +
        newsDrift;

      const openPrice = asset.price;
      const closePrice = Math.max(0.25, Math.round(openPrice * (1 + deltaPercent) * 100) / 100);

      // Muodostetaan realistiset High ja Low -piikit (wicks) OHLC-kynttilälle
      const bodyMax = Math.max(openPrice, closePrice);
      const bodyMin = Math.min(openPrice, closePrice);
      const upperWick = bodyMax * (Math.random() * scaledVol * 0.8 + 0.0015);
      const lowerWick = bodyMin * (Math.random() * scaledVol * 0.8 + 0.0015);
      const highPrice = Math.round((bodyMax + upperWick) * 100) / 100;
      const lowPrice = Math.max(0.1, Math.round((bodyMin - lowerWick) * 100) / 100);

      // Päivitetään kynttilätaulukot
      const nextCandlesByTf = { ...asset.candlesByTimeframe };
      const emaMultiplier = 2 / (9 + 1);

      TIMEFRAME_ORDER.forEach((tf) => {
        const currentSeries = nextCandlesByTf[tf] || [];
        if (currentSeries.length === 0) return;

        if (tf === activeTf) {
          // Lisätään uusi sulkeutunut kynttilä valitulle aikajänteelle
          const prevCandle = currentSeries[currentSeries.length - 1];
          const recentCloses = [...currentSeries.slice(-19).map((c) => c.close), closePrice];
          const nextSma20 =
            Math.round((recentCloses.reduce((sum, v) => sum + v, 0) / recentCloses.length) * 100) /
            100;
          const nextEma9 =
            Math.round(((closePrice - prevCandle.ema9) * emaMultiplier + prevCandle.ema9) * 100) /
            100;
          const moveRatio = Math.abs(closePrice - openPrice) / Math.max(0.5, openPrice);
          const nextVol = Math.round(
            180 * Math.sqrt(TIMEFRAME_CONFIG[tf].minutes) * (0.65 + Math.random() * 0.85 + moveRatio * 18)
          );

          const newCandle: OHLCCandle = {
            timestamp: Date.now(),
            label: buildNextCandleLabel(tf, state.week, state.dayOfWeek, state.hour, state.minute),
            open: openPrice,
            high: highPrice,
            low: lowPrice,
            close: closePrice,
            volume: nextVol,
            sma20: nextSma20,
            ema9: nextEma9,
          };

          nextCandlesByTf[tf] = [...currentSeries.slice(-35), newCandle];
        } else {
          // Päivitetään muiden aikajänteiden viimeisimmän (vielä muodostuvan) kynttilän päätösarvo sekä High/Low
          const lastIdx = currentSeries.length - 1;
          const lastCandle = currentSeries[lastIdx];
          const updatedHigh = Math.max(lastCandle.high, closePrice);
          const updatedLow = Math.min(lastCandle.low, closePrice);
          const recentCloses = [...currentSeries.slice(-20, -1).map((c) => c.close), closePrice];
          const updatedSma20 =
            Math.round((recentCloses.reduce((sum, v) => sum + v, 0) / recentCloses.length) * 100) /
            100;
          const prevEma = currentSeries.length > 1 ? currentSeries[lastIdx - 1].ema9 : lastCandle.open;
          const updatedEma9 =
            Math.round(((closePrice - prevEma) * emaMultiplier + prevEma) * 100) / 100;

          const updatedSeries = [...currentSeries];
          updatedSeries[lastIdx] = {
            ...lastCandle,
            high: updatedHigh,
            low: updatedLow,
            close: closePrice,
            sma20: updatedSma20,
            ema9: updatedEma9,
          };
          nextCandlesByTf[tf] = updatedSeries;
        }
      });

      const activeSeries = nextCandlesByTf[activeTf];
      const latestCandle = activeSeries[activeSeries.length - 1];
      const nextHistory = activeSeries.map((c) => c.close);
      const sma20 = latestCandle ? latestCandle.sma20 : closePrice;

      // Päivitetään momentum perustuen hinnan suhteeseen liukuvaan keskiarvoon
      const rawMomentum = (closePrice - sma20) / Math.max(0.1, sma20);
      const nextMomentum = Math.max(-1, Math.min(1, Math.round(rawMomentum * 100) / 100));

      // Päivitetään osakkeiden P/E-luku suhteessa hinnan muutokseen
      const nextPe = asset.peRatio
        ? Math.max(4, Math.round(asset.peRatio * (closePrice / asset.price) * 10) / 10)
        : undefined;

      return {
        ...asset,
        previousPrice: openPrice,
        price: closePrice,
        priceHistory: nextHistory,
        candlesByTimeframe: nextCandlesByTf,
        movingAverage20: sma20,
        momentum: nextMomentum,
        peRatio: nextPe,
      };
    });

    // 4. Satunnainen uutistapahtuma
    let updatedNews = state.marketNews;
    if (Math.random() < 0.12 && updatedAssets.length > 0) {
      const randomAsset = updatedAssets[Math.floor(Math.random() * updatedAssets.length)];
      const isPositive = Math.random() > 0.45;
      const multiplier = isPositive ? 1.14 + Math.random() * 0.18 : 0.84 - Math.random() * 0.1;

      const headlines = isPositive
        ? [
            `Teollisuuden tilauskirjat ennätyskasvussa: ${randomAsset.name}`,
            `Sähköistymisbuumi kiristää tarjontaa kohteessa ${randomAsset.symbol}`,
            `Positiivinen tulosvaroitus ja ohjeistuksen nosto: ${randomAsset.name}`,
          ]
        : [
            `Korkojen nousu ja raaka-ainepula rasittavat kohdetta ${randomAsset.symbol}`,
            `Toimitusketjun pullonkaula hidastaa toimituksia: ${randomAsset.name}`,
            `Analyytikot laskevat suositusta arvostustason vuoksi: ${randomAsset.symbol}`,
          ];

      const newEvent: MarketNews = {
        id: `news-${Date.now()}`,
        title: headlines[Math.floor(Math.random() * headlines.length)],
        description: `Markkinavaikutus: arvioitu kurssimuutos ${isPositive ? '+' : '-'}${Math.round(
          Math.abs(multiplier - 1) * 100
        )} % lyhyellä aikavälillä.`,
        affectedAssetId: randomAsset.id,
        priceImpactMultiplier: multiplier,
        durationTicks: 30,
        timestamp: Date.now(),
        isRead: false,
      };

      updatedNews = [newEvent, ...state.marketNews].slice(0, 5);
    }

    set(
      {
        macroEconomy: nextMacro,
        marketAssets: updatedAssets,
        marketNews: updatedNews,
        lastCandleTimestamp: Date.now(),
      },
      false,
      'market/tickPrices'
    );
  },

  /**
   * Maksaa viikoittaiset osingot salkussa olevista osakkeista.
   * Kutsutaan viikon vaihtuessa.
   */
  processWeeklyDividends: () => {
    const state = get();
    let totalDividends = 0;
    const updatedPortfolio = { ...state.portfolio };

    Object.values(updatedPortfolio).forEach((pos) => {
      const asset = state.marketAssets.find((a) => a.id === pos.assetId);
      if (asset && asset.dividendYieldAnnualPercent > 0 && pos.quantity > 0) {
        // Viikkokohtainen osinko (skaalattu pelin nopeuteen: vuotuinen tuotto / 12)
        const weeklyRate = asset.dividendYieldAnnualPercent / 100 / 12;
        const payout = Math.round(pos.quantity * asset.price * weeklyRate * 100) / 100;

        if (payout > 0) {
          totalDividends += payout;
          updatedPortfolio[pos.assetId] = {
            ...pos,
            totalDividendsCollected:
              Math.round(((pos.totalDividendsCollected || 0) + payout) * 100) / 100,
          };
        }
      }
    });

    totalDividends = Math.round(totalDividends * 100) / 100;

    if (totalDividends > 0) {
      state.addCash(
        totalDividends,
        'passive_revenue',
        `Pörssiosingot osakkeista (+${totalDividends.toFixed(2)} €)`
      );
      set({ portfolio: updatedPortfolio }, false, 'market/payWeeklyDividends');
      return {
        totalPaid: totalDividends,
        message: `Osinkotuotot maksettu tilille: +${totalDividends.toFixed(2)} €!`,
      };
    }

    return { totalPaid: 0, message: '' };
  },

  awardInsiderIntelFromGig: (_gigTitle, clientName, precision) => {
    const state = get();
    const hasInsiderNetwork = state.player.unlockedPerks?.includes('insider_network');

    // Tarkkuuskynnys: normisti 80 %, Sisäpiiriverkosto-taidolla 70 %
    const minPrecision = hasInsiderNetwork ? 70 : 80;
    if (precision < minPrecision) return null;

    // Todennäköisyys: normisti 35 % onnistumistodennäköisyys, taidolla 70 %
    const failureThreshold = hasInsiderNetwork ? 0.30 : 0.65;
    if (Math.random() > failureThreshold) return null;

    const targetAsset = state.marketAssets[Math.floor(Math.random() * state.marketAssets.length)];
    const isBullish = Math.random() > 0.4;
    const impact = isBullish
      ? Math.round(15 + Math.random() * 20)
      : Math.round(-10 - Math.random() * 15);

    const whisperTexts = isBullish
      ? [
          `Työmaan päällikkö mainitsi kahvitauolla, että he ovat sulkemassa jättimäistä hankintasopimusta kohteelle ${targetAsset.name}.`,
          `Asiakkaan hankintajohtaja vihjasi varastojen tyhjentyneen ja massiivisen tilauserän olevan tulossa kohteelle ${targetAsset.symbol}.`,
        ]
      : [
          `Projektin valvoja tuskaili asiakkaan kassakriisiä ja viivästyviä maksuja kohteelle ${targetAsset.name}.`,
          `Huomasit asennuksen aikana vakavia laatuongelmia komponenttierässä, mikä johtaa takaisinvetoon kohteelle ${targetAsset.symbol}.`,
        ];

    const newIntel: InsiderIntel = {
      id: `intel-${Date.now()}`,
      sourceGigClient: clientName,
      title: `${targetAsset.symbol}: Kenttähavainto kohteesta ${clientName}`,
      whisperText: whisperTexts[Math.floor(Math.random() * whisperTexts.length)],
      affectedAssetId: targetAsset.id,
      predictedDirection: isBullish ? 'bullish' : 'bearish',
      expectedImpactPercent: impact,
      validUntilDay: 'PE',
      confidence: Math.round(80 + Math.random() * 15),
      isUsed: false,
      createdAtWeek: state.week,
    };

    set(
      (s) => ({
        insiderIntel: [newIntel, ...s.insiderIntel].slice(0, 6),
      }),
      false,
      'market/awardIntel'
    );

    return newIntel;
  },

  getPortfolioValue: () => {
    const state = get();
    let total = 0;
    Object.values(state.portfolio).forEach((pos) => {
      const asset = state.marketAssets.find((a) => a.id === pos.assetId);
      if (asset) {
        total += asset.price * pos.quantity;
      }
    });
    return Math.round(total * 100) / 100;
  },

  getPortfolioProfitLoss: () => {
    const state = get();
    let currentVal = 0;
    let costVal = 0;
    let totalDividends = 0;

    Object.values(state.portfolio).forEach((pos) => {
      const asset = state.marketAssets.find((a) => a.id === pos.assetId);
      if (asset) {
        currentVal += asset.price * pos.quantity;
        costVal += pos.totalInvested;
        totalDividends += pos.totalDividendsCollected || 0;
      }
    });

    const amount = Math.round((currentVal - costVal) * 100) / 100;
    const percent = costVal > 0 ? Math.round((amount / costVal) * 1000) / 10 : 0;

    return {
      amount,
      percent,
      totalDividends: Math.round(totalDividends * 100) / 100,
    };
  },
});

