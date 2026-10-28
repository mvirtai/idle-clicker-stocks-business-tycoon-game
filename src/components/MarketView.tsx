import React, { useState, useActionState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../services/soundService';
import {
  TIMEFRAME_CONFIG,
  TIMEFRAME_ORDER,
  MarketTimeframe,
  OHLCCandle,
} from '../types/market';
import {
  exportPitchDeckToGoogleSlides,
  PitchDeckExportResult,
} from '../services/slidesExportService';
import {
  TrendingUp,
  TrendingDown,
  Radio,
  FileSpreadsheet,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Globe,
  BarChart3,
  LineChart,
  FastForward,
  Clock,
  Loader2,
} from 'lucide-react';

interface SlidesActionState {
  status: 'idle' | 'success' | 'error';
  result: PitchDeckExportResult | null;
  error: string | null;
}

interface TradeActionState {
  status: 'idle' | 'success' | 'error';
  message: string | null;
}

type MarketActionPayload =
  | { action: 'buy'; assetId: string; quantity: number }
  | { action: 'sell'; assetId: string; quantity: number }
  | { action: 'step_candle'; timeframe: MarketTimeframe };

export const MarketView: React.FC = () => {
  const store = useGameStore();
  const {
    player,
    macroEconomy,
    marketAssets,
    portfolio,
    marketNews,
    insiderIntel,
    selectedAssetId,
    selectedTimeframe,
    chartStyle,
    selectAsset,
    setSelectedTimeframe,
    setChartStyle,
    stepMarketCandle,
    getEffectiveStaminaCost,
    getStaminaEfficiencyBreakdown,
    buyAsset,
    sellAsset,
    getPortfolioValue,
    getPortfolioProfitLoss,
    cash,
  } = store;

  const [tradeQuantity, setTradeQuantity] = useState<number>(10);
  const [activeAssetType, setActiveAssetType] = useState<'all' | 'commodity' | 'stock'>('all');
  const [hoveredCandleIdx, setHoveredCandleIdx] = useState<number | null>(null);
  const [showSma20, setShowSma20] = useState<boolean>(true);
  const [showEma9, setShowEma9] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);

  // React 19 useActionState + Exhaustive Switch (Discriminated Union):
  // Hallitsee osto-, myynti- ja kynttiläkelaus-toiminnot tyypitetysti.
  const [tradeState, executeTradeAction, isTradePending] = useActionState(
    (_prev: TradeActionState, payload: MarketActionPayload | null): TradeActionState => {
      if (!payload) return { status: 'idle', message: null };

      switch (payload.action) {
        case 'buy': {
          const res = buyAsset(payload.assetId, payload.quantity);
          if (res.success) sound.playSuccess();
          else sound.playError();
          return { status: res.success ? 'success' : 'error', message: res.message };
        }
        case 'sell': {
          const res = sellAsset(payload.assetId, payload.quantity);
          if (res.success) sound.playSuccess();
          else sound.playError();
          return { status: res.success ? 'success' : 'error', message: res.message };
        }
        case 'step_candle': {
          const res = stepMarketCandle(payload.timeframe);
          if (res.success) sound.playClick();
          else sound.playError();
          return { status: res.success ? 'success' : 'error', message: res.message };
        }
        default: {
          const _exhaustiveCheck: never = payload;
          return _exhaustiveCheck;
        }
      }
    },
    { status: 'idle', message: null }
  );

  // React 19 useActionState: Asynkroninen Google Slides -vienti
  // Käsittelee automaattisesti Transition-odotustilan (isExportingSlides) ja lopputuloksen.
  const [slidesState, exportSlidesAction, isExportingSlides] = useActionState(
    async (_prev: SlidesActionState): Promise<SlidesActionState> => {
      try {
        const res = await exportPitchDeckToGoogleSlides(store);
        sound.playSuccess();
        return { status: 'success', result: res, error: null };
      } catch (err: unknown) {
        sound.playError();
        const errorMsg = err instanceof Error ? err.message : 'Google Slides -vienti epäonnistui';
        return { status: 'error', result: null, error: errorMsg };
      }
    },
    { status: 'idle', result: null, error: null }
  );

  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  const activeMessage = tradeState.message || slidesState.error;
  const displayNotification = activeMessage && activeMessage !== dismissedMessage ? activeMessage : null;

  const selectedAsset = marketAssets.find((a) => a.id === selectedAssetId) || marketAssets[0];
  const currentPosition = selectedAsset ? portfolio[selectedAsset.id] : null;
  const activeTf: MarketTimeframe = selectedTimeframe || '5m';
  const tfMeta = TIMEFRAME_CONFIG[activeTf];
  const candleStaminaCost = getEffectiveStaminaCost(tfMeta.baseStaminaCost);
  const staminaBreakdown = getStaminaEfficiencyBreakdown();
  const canAffordCandleStep = player.stamina >= candleStaminaCost;

  const portfolioValue = getPortfolioValue();
  const pl = getPortfolioProfitLoss();

  const handleTimeframeSelect = (tf: MarketTimeframe) => {
    sound.playClick();
    setHoveredCandleIdx(null);
    setSelectedTimeframe(tf);
  };

  // Haetaan valitun aikajänteen (1m, 5m, 10m, 30m, 60m, 3h, 1d) OHLC-kynttiläsarja
  const candles: OHLCCandle[] =
    selectedAsset?.candlesByTimeframe?.[activeTf] || [];

  const latestCandle: OHLCCandle | undefined = candles[candles.length - 1];
  const firstCandle: OHLCCandle | undefined = candles[0];
  const inspectedCandle: OHLCCandle | undefined =
    hoveredCandleIdx !== null && candles[hoveredCandleIdx]
      ? candles[hoveredCandleIdx]
      : latestCandle;

  // Lasketaan hintarajaukset ja volyymiskaala valitulle aikajänteelle
  const allLows = candles.map((c) => Math.min(c.low, c.sma20, c.ema9));
  const allHighs = candles.map((c) => Math.max(c.high, c.sma20, c.ema9));
  const rawMin = allLows.length > 0 ? Math.min(...allLows) : (selectedAsset?.price || 10) * 0.95;
  const rawMax = allHighs.length > 0 ? Math.max(...allHighs) : (selectedAsset?.price || 10) * 1.05;
  const padding = Math.max(0.15, (rawMax - rawMin) * 0.08);
  const minPrice = Math.max(0.05, rawMin - padding);
  const maxPrice = rawMax + padding;
  const priceRange = maxPrice - minPrice || 1;

  const maxVolume = Math.max(100, ...candles.map((c) => c.volume));

  // SVG-kaavion mitat (TradingView-asettelu oikean reunan hinta-asteikolla ja aikaleimoilla)
  const svgWidth = 680;
  const svgHeight = 250;
  const chartLeft = 10;
  const chartRight = 615;
  const chartTop = 14;
  const chartBottom = 205;
  const plotWidth = chartRight - chartLeft;
  const plotHeight = chartBottom - chartTop;

  const priceToY = (p: number) =>
    chartBottom - ((p - minPrice) / priceRange) * plotHeight;

  const indexToX = (idx: number) => {
    if (candles.length <= 1) return chartLeft + plotWidth / 2;
    const step = plotWidth / candles.length;
    return chartLeft + idx * step + step / 2;
  };

  const candleWidth = Math.max(4, Math.min(12, (plotWidth / Math.max(1, candles.length)) * 0.62));

  // Viivapolut (Area/Line, SMA-20, EMA-9)
  const closeLinePoints = candles
    .map((c, idx) => `${indexToX(idx)},${priceToY(c.close)}`)
    .join(' ');

  const areaPolygonPoints =
    candles.length > 0
      ? `${indexToX(0)},${chartBottom} ${closeLinePoints} ${indexToX(
          candles.length - 1
        )},${chartBottom}`
      : '';

  const sma20Points = candles
    .map((c, idx) => `${indexToX(idx)},${priceToY(c.sma20)}`)
    .join(' ');

  const ema9Points = candles
    .map((c, idx) => `${indexToX(idx)},${priceToY(c.ema9)}`)
    .join(' ');

  // Aikajänteen kokonaismuutos ja viimeisimmän kynttilän muutos
  const latestCandleDiff = latestCandle ? latestCandle.close - latestCandle.open : 0;
  const latestCandlePct =
    latestCandle && latestCandle.open > 0
      ? ((latestCandleDiff / latestCandle.open) * 100).toFixed(2)
      : '0.00';
  const isPriceUp = latestCandleDiff >= 0;

  const periodDiff =
    latestCandle && firstCandle ? latestCandle.close - firstCandle.open : 0;
  const periodPct =
    firstCandle && firstCandle.open > 0
      ? ((periodDiff / firstCandle.open) * 100).toFixed(2)
      : '0.00';

  // Vaakasuorat hintatason apuviivat (4 tasoa)
  const priceGridLevels = [0.15, 0.4, 0.65, 0.9].map(
    (ratio) => minPrice + priceRange * ratio
  );

  const filteredAssets = marketAssets.filter(
    (a) => activeAssetType === 'all' || a.type === activeAssetType
  );

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      {/* Pörssin otsikko ja salkun arvo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Pörssi & Raaka-ainekauppa
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            TradingView-tyylinen moniaikajänteinen OHLC-terminaali (`1m` – `1d`). Kurssit päivittyvät valitsemasi aikajänteen mukaisesti.
          </p>
        </div>

        {/* Salkun tilastot */}
        <div className="flex flex-wrap items-center gap-6 bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-2xl">
          <div>
            <span className="text-[11px] text-zinc-500 block">Salkun markkina-arvo</span>
            <span className="text-base font-semibold font-mono text-zinc-100 tabular-nums">
              {portfolioValue.toLocaleString('fi-FI', { minimumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="border-l border-zinc-800 pl-4">
            <span className="text-[11px] text-zinc-500 block">Arvonmuutos</span>
            <div
              className={`flex items-center gap-1 font-mono text-xs font-semibold tabular-nums ${
                pl.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {pl.amount >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {pl.amount >= 0 ? '+' : ''}
                {pl.amount.toFixed(2)} € ({pl.percent} %)
              </span>
            </div>
          </div>

          {pl.totalDividends > 0 && (
            <div className="border-l border-zinc-800 pl-4">
              <span className="text-[11px] text-zinc-500 block">Kerätyt osingot</span>
              <span className="font-mono text-xs font-semibold text-amber-400 tabular-nums">
                +{pl.totalDividends.toFixed(2)} €
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Makrotalouden suhdannekatsaus (MacroEconomy Strip) */}
      {macroEconomy && (
        <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-zinc-500 block text-[10px]">Makrotalouden suhdanne</span>
              <span className="font-semibold text-zinc-100">{macroEconomy.regimeName}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-mono tabular-nums">
            <div>
              <span className="text-zinc-500 block text-[10px] font-sans">BKT-kasvu</span>
              <span
                className={
                  macroEconomy.gdpGrowthPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }
              >
                {macroEconomy.gdpGrowthPercent >= 0 ? '+' : ''}
                {macroEconomy.gdpGrowthPercent.toFixed(1)} %
              </span>
            </div>

            <div>
              <span className="text-zinc-500 block text-[10px] font-sans">Ohjauskorko</span>
              <span className="text-zinc-200">{macroEconomy.centralBankRatePercent.toFixed(2)} %</span>
            </div>

            <div>
              <span className="text-zinc-500 block text-[10px] font-sans">Inflaatio</span>
              <span className="text-zinc-200">{macroEconomy.inflationPercent.toFixed(1)} %</span>
            </div>

            <div>
              <span className="text-zinc-500 block text-[10px] font-sans">Markkinasentimentti</span>
              <span
                className={
                  macroEconomy.sentimentScore >= 60
                    ? 'text-emerald-400'
                    : macroEconomy.sentimentScore <= 40
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }
              >
                {macroEconomy.sentimentScore} / 100
              </span>
            </div>
          </div>
        </div>
      )}

      {displayNotification && (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 flex items-center justify-between animate-fade-in">
          <span>{displayNotification}</span>
          <button
            onClick={() => setDismissedMessage(displayNotification)}
            className="text-zinc-500 hover:text-zinc-300 ml-4 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Pääalue: 2 Saraketta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Vasen sarake (2/3): Valittu kohde-etuus, TradingView-kaavio, tunnusluvut ja toimeksiannot */}
        <div className="lg:col-span-2 space-y-6">
          {/* Suodatusvalitsin */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Kategoria:</span>
              <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
                <button
                  onClick={() => setActiveAssetType('all')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeAssetType === 'all'
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Kaikki
                </button>
                <button
                  onClick={() => setActiveAssetType('commodity')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeAssetType === 'commodity'
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Raaka-aineet
                </button>
                <button
                  onClick={() => setActiveAssetType('stock')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeAssetType === 'stock'
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Osakkeet (Osingot)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Sykliväli: {tfMeta.label}</span>
            </div>
          </div>

          {/* Kohde-etuuslista (pika-valitsin) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {filteredAssets.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;
              const assetTfCandles = asset.candlesByTimeframe?.[activeTf] || [];
              const lastC = assetTfCandles[assetTfCandles.length - 1];
              const isUp = lastC ? lastC.close >= lastC.open : asset.price >= asset.previousPrice;
              return (
                <button
                  key={asset.id}
                  onClick={() => {
                    setHoveredCandleIdx(null);
                    selectAsset(asset.id);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-zinc-900 ring-1 ring-amber-400/50'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono">{asset.symbol}</span>
                    {asset.dividendYieldAnnualPercent > 0 && (
                      <span className="text-[9px] text-amber-400 font-mono tabular-nums">
                        {asset.dividendYieldAnnualPercent}%
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-zinc-200 block truncate mt-0.5">
                    {asset.name}
                  </span>
                  <span
                    className={`text-[11px] font-mono tabular-nums block ${
                      isUp ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {asset.price.toFixed(2)} €
                  </span>
                </button>
              );
            })}
          </div>

          {/* Valitun kohteen aktiivinen kortti ja TradingView-moni-aikajännekaavio */}
          {selectedAsset && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
              {/* Kohde-etuuden otsikko ja nykykurssi */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-zinc-100">{selectedAsset.name}</h3>
                    <span className="text-xs font-mono text-zinc-400">
                      {selectedAsset.symbol} · {selectedAsset.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{selectedAsset.description}</p>
                </div>

                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-zinc-100 tabular-nums">
                    {selectedAsset.price.toFixed(2)} €
                  </span>
                  <span className="text-xs text-zinc-500 font-mono"> / {selectedAsset.unit}</span>
                  <div className="flex items-center justify-end gap-2 mt-0.5 text-xs font-mono tabular-nums">
                    <span className={isPriceUp ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                      {isPriceUp ? '▲ +' : '▼ '}
                      {latestCandlePct} % ({tfMeta.label})
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className={periodDiff >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}>
                      36 jaksoa: {periodDiff >= 0 ? '+' : ''}
                      {periodPct} %
                    </span>
                  </div>
                </div>
              </div>

              {/* TRADINGVIEW YLÄPALKKI: OHLCV-arvot vasemmalla, Kaaviomuoto & Indikaattorit oikealla */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-3 py-2">
                {/* OHLCV Tietopalkki (Päivittyy hiirellä kynttilää osoittaessa) */}
                {inspectedCandle ? (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums">
                    <span className="text-zinc-400 font-semibold">
                      {inspectedCandle.label} ({tfMeta.label})
                    </span>
                    <span>
                      <span className="text-zinc-500">O: </span>
                      <span className="text-zinc-200">{inspectedCandle.open.toFixed(2)}</span>
                    </span>
                    <span>
                      <span className="text-zinc-500">H: </span>
                      <span className="text-zinc-200">{inspectedCandle.high.toFixed(2)}</span>
                    </span>
                    <span>
                      <span className="text-zinc-500">L: </span>
                      <span className="text-zinc-200">{inspectedCandle.low.toFixed(2)}</span>
                    </span>
                    <span>
                      <span className="text-zinc-500">C: </span>
                      <span
                        className={
                          inspectedCandle.close >= inspectedCandle.open
                            ? 'text-emerald-400 font-semibold'
                            : 'text-rose-400 font-semibold'
                        }
                      >
                        {inspectedCandle.close.toFixed(2)} €
                      </span>
                    </span>
                    <span>
                      <span className="text-zinc-500">Vol: </span>
                      <span className="text-zinc-300">{inspectedCandle.volume}</span>
                    </span>
                    {showSma20 && (
                      <span className="text-amber-400">
                        SMA20: {inspectedCandle.sma20.toFixed(2)} €
                      </span>
                    )}
                    {showEma9 && (
                      <span className="text-sky-400">
                        EMA9: {inspectedCandle.ema9.toFixed(2)} €
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-zinc-500 font-mono">OHLCV</span>
                )}

                {/* Kaaviomuoto + Indikaattorit */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Kynttilät vs Alueviiva */}
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[11px]">
                    <button
                      onClick={() => setChartStyle('candles')}
                      className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                        chartStyle === 'candles'
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>Kynttilät</span>
                    </button>
                    <button
                      onClick={() => setChartStyle('area')}
                      className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
                        chartStyle === 'area'
                          ? 'bg-zinc-800 text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <LineChart className="w-3 h-3" />
                      <span>Alueviiva</span>
                    </button>
                  </div>

                  {/* Indikaattorikytkimet */}
                  <button
                    onClick={() => setShowSma20(!showSma20)}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 ${
                      showSma20
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    SMA-20
                  </button>
                  <button
                    onClick={() => setShowEma9(!showEma9)}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 ${
                      showEma9
                        ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    EMA-9
                  </button>
                  <button
                    onClick={() => setShowVolume(!showVolume)}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 ${
                      showVolume
                        ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    Vol
                  </button>
                </div>
              </div>

              {/* VARSINAINEN TRADINGVIEW-KAAVIO (SVG Candlesticks / Area + Volume + Crosshair) */}
              <div className="space-y-2.5">
                <div
                  className="w-full h-64 bg-zinc-950 rounded-xl p-3 border border-zinc-800/90 relative select-none overflow-hidden"
                  onMouseLeave={() => setHoveredCandleIdx(null)}
                >
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-full overflow-visible"
                  >
                    <defs>
                      <linearGradient id="tvAreaGradientUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="tvAreaGradientDown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Vaakasuorat apuviivat ja oikean reunan hinta-asteikko */}
                    {priceGridLevels.map((lvl, i) => {
                      const y = priceToY(lvl);
                      return (
                        <g key={i}>
                          <line
                            x1={chartLeft}
                            y1={y}
                            x2={chartRight}
                            y2={y}
                            stroke="#27272a"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={chartRight + 8}
                            y={y + 3}
                            fill="#71717a"
                            fontSize="9.5"
                            fontFamily="monospace"
                          >
                            {lvl.toFixed(2)} €
                          </text>
                        </g>
                      );
                    })}

                    {/* Volyymipalkit kaavion alareunassa */}
                    {showVolume &&
                      candles.map((c, idx) => {
                        const x = indexToX(idx);
                        const volHeight = (c.volume / maxVolume) * 38;
                        const isBull = c.close >= c.open;
                        return (
                          <rect
                            key={`vol-${idx}`}
                            x={x - candleWidth / 2}
                            y={chartBottom - volHeight}
                            width={candleWidth}
                            height={Math.max(1, volHeight)}
                            fill={isBull ? '#10b981' : '#f43f5e'}
                            fillOpacity="0.16"
                            rx="1"
                          />
                        );
                      })}

                    {/* Aluekaavio (Area Mode) */}
                    {chartStyle === 'area' && candles.length > 1 && (
                      <>
                        <polygon
                          points={areaPolygonPoints}
                          fill={isPriceUp ? 'url(#tvAreaGradientUp)' : 'url(#tvAreaGradientDown)'}
                        />
                        <polyline
                          fill="none"
                          stroke={isPriceUp ? '#10b981' : '#f43f5e'}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={closeLinePoints}
                        />
                      </>
                    )}

                    {/* OHLC-Kynttiläkaavio (Candlestick Mode) */}
                    {chartStyle === 'candles' &&
                      candles.map((c, idx) => {
                        const x = indexToX(idx);
                        const highY = priceToY(c.high);
                        const lowY = priceToY(c.low);
                        const openY = priceToY(c.open);
                        const closeY = priceToY(c.close);
                        const isBull = c.close >= c.open;
                        const color = isBull ? '#10b981' : '#f43f5e';
                        const bodyTop = Math.min(openY, closeY);
                        const bodyHeight = Math.max(2, Math.abs(closeY - openY));
                        const isHovered = hoveredCandleIdx === idx;

                        return (
                          <g key={`candle-${idx}`}>
                            {/* Pystysuora kynttilän sydänlanka (High - Low Wick) */}
                            <line
                              x1={x}
                              y1={highY}
                              x2={x}
                              y2={lowY}
                              stroke={color}
                              strokeWidth={isHovered ? '1.8' : '1.2'}
                            />
                            {/* Kynttilän runko (Open - Close Body) */}
                            <rect
                              x={x - candleWidth / 2}
                              y={bodyTop}
                              width={candleWidth}
                              height={bodyHeight}
                              fill={color}
                              rx="1"
                              stroke={isHovered ? '#fafafa' : 'none'}
                              strokeWidth={isHovered ? '0.8' : '0'}
                            />
                          </g>
                        );
                      })}

                    {/* SMA-20 Liukuva keskiarvo */}
                    {showSma20 && candles.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        points={sma20Points}
                      />
                    )}

                    {/* EMA-9 Eksponentiaalinen keskiarvo */}
                    {showEma9 && candles.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.4"
                        points={ema9Points}
                      />
                    )}

                    {/* Nykyisen hinnan vaakaviiva ja hintalappu oikeassa reunassa */}
                    {latestCandle && (
                      <g>
                        <line
                          x1={chartLeft}
                          y1={priceToY(latestCandle.close)}
                          x2={chartRight}
                          y2={priceToY(latestCandle.close)}
                          stroke={isPriceUp ? '#10b981' : '#f43f5e'}
                          strokeOpacity="0.5"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        <rect
                          x={chartRight + 4}
                          y={priceToY(latestCandle.close) - 8}
                          width={58}
                          height={16}
                          rx={3}
                          fill={isPriceUp ? '#065f46' : '#881337'}
                        />
                        <text
                          x={chartRight + 8}
                          y={priceToY(latestCandle.close) + 3}
                          fill="#f4f4f5"
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {latestCandle.close.toFixed(2)} €
                        </text>
                      </g>
                    )}

                    {/* Crosshair-ristikko hiirellä tarkasteltaessa */}
                    {hoveredCandleIdx !== null && candles[hoveredCandleIdx] && (
                      <g>
                        <line
                          x1={indexToX(hoveredCandleIdx)}
                          y1={chartTop}
                          x2={indexToX(hoveredCandleIdx)}
                          y2={chartBottom}
                          stroke="#a1a1aa"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        <line
                          x1={chartLeft}
                          y1={priceToY(candles[hoveredCandleIdx].close)}
                          x2={chartRight}
                          y2={priceToY(candles[hoveredCandleIdx].close)}
                          stroke="#a1a1aa"
                          strokeOpacity="0.6"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                      </g>
                    )}

                    {/* X-akselin aikaleimat (TradingView alareuna) */}
                    <line
                      x1={chartLeft}
                      y1={chartBottom}
                      x2={chartRight}
                      y2={chartBottom}
                      stroke="#27272a"
                      strokeWidth="1"
                    />
                    {candles.map((c, idx) => {
                      if (idx % 6 !== 0 && idx !== candles.length - 1) return null;
                      const x = indexToX(idx);
                      return (
                        <text
                          key={`lbl-${idx}`}
                          x={x}
                          y={svgHeight - 12}
                          textAnchor="middle"
                          fill="#71717a"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          {c.label}
                        </text>
                      );
                    })}

                    {/* Interaktiiviset kosketus-/hover-alueet jokaiselle kynttilälle */}
                    {candles.map((_, idx) => {
                      const step = plotWidth / Math.max(1, candles.length);
                      return (
                        <rect
                          key={`hit-${idx}`}
                          x={chartLeft + idx * step}
                          y={chartTop}
                          width={step}
                          height={plotHeight}
                          fill="transparent"
                          className="cursor-crosshair"
                          onMouseEnter={() => setHoveredCandleIdx(idx)}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* TRADINGVIEW ALAPALKKI: Aikajännevalitsin (1m, 5m, 10m, 30min, 60min, 3h, 1d) kuvaajan alapuolella */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/90 border border-zinc-800/90 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[11px] text-zinc-500 font-medium px-1.5">Aikajänne:</span>
                    {TIMEFRAME_ORDER.map((tf) => {
                      const isActive = activeTf === tf;
                      return (
                        <button
                          key={tf}
                          onClick={() => handleTimeframeSelect(tf)}
                          className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors whitespace-nowrap shrink-0 ${
                            isActive
                              ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70'
                          }`}
                        >
                          {TIMEFRAME_CONFIG[tf].label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Simuloi +1 kynttilä valitulla aikajänteellä (Stamina-ohjattu) */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div
                      className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-lg"
                      title={`Hahmonkehityksen staminahyöty: -${staminaBreakdown.totalReductionPercent}% (Kalusto/Sertifikaatit -${staminaBreakdown.upgradeReductionPercent}%, Taso -${staminaBreakdown.levelReductionPercent}%, Tiimi -${staminaBreakdown.teamReductionPercent}%)`}
                    >
                      <span className="text-zinc-500">Stamina:</span>
                      <span className={player.stamina < candleStaminaCost ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                        {player.stamina.toFixed(1)}/{player.maxStamina}
                      </span>
                      {staminaBreakdown.totalReductionPercent > 0 && (
                        <span className="text-[10px] text-amber-400/90">
                          (-{staminaBreakdown.totalReductionPercent}% kulu)
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setDismissedMessage(null);
                        executeTradeAction({ action: 'step_candle', timeframe: activeTf });
                      }}
                      disabled={!canAffordCandleStep || isTradePending}
                      title={
                        canAffordCandleStep
                          ? `Sulje nykyinen kynttilä ja analysoi seuraava jakso (-${candleStaminaCost.toFixed(1)} Stamina)`
                          : `Stamina ei riitä (${player.stamina.toFixed(1)} / ${candleStaminaCost.toFixed(1)}). Lepää siirtymällä seuraavaan päivään!`
                      }
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 text-amber-300 border border-zinc-700 text-[11px] font-mono font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>+1 kynttilä ({tfMeta.label})</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${canAffordCandleStep ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-400'}`}>
                        -{candleStaminaCost.toFixed(1)} ⚡
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 px-1">
                  <span>{tfMeta.description}</span>
                  <span>
                    Jakson vaihteluväli ({tfMeta.label}): {rawMin.toFixed(2)} € – {rawMax.toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Taloustieteelliset tunnusluvut (Beta, Osinko, P/E, SMA-20) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                  <span className="text-[10px] text-zinc-500 font-sans block">
                    Markkina-Beta (β)
                  </span>
                  <span className="text-zinc-200 font-medium">
                    {selectedAsset.beta.toFixed(2)}{' '}
                    <span className="text-[10px] text-zinc-500">
                      ({selectedAsset.beta > 1.2 ? 'Syklinen' : selectedAsset.beta < 0.8 ? 'Vakaa' : 'Neutraali'})
                    </span>
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                  <span className="text-[10px] text-zinc-500 font-sans block">
                    Osinkotuotto (p.a.)
                  </span>
                  <span
                    className={
                      selectedAsset.dividendYieldAnnualPercent > 0
                        ? 'text-amber-400 font-medium'
                        : 'text-zinc-500'
                    }
                  >
                    {selectedAsset.dividendYieldAnnualPercent > 0
                      ? `${selectedAsset.dividendYieldAnnualPercent.toFixed(1)} % / v`
                      : '0 % (Raaka-aine)'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                  <span className="text-[10px] text-zinc-500 font-sans block">
                    P/E-arvostusluku
                  </span>
                  <span className="text-zinc-200 font-medium">
                    {selectedAsset.peRatio ? `${selectedAsset.peRatio.toFixed(1)}x` : 'N/A'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70">
                  <span className="text-[10px] text-zinc-500 font-sans block">
                    SMA-20 ({tfMeta.label})
                  </span>
                  <span className="text-zinc-200 font-medium">
                    {(latestCandle?.sma20 ?? selectedAsset.movingAverage20).toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Oma omistus ja salkkuasema */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs font-mono tabular-nums grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-zinc-500 block font-sans text-[11px]">Oma omistus</span>
                  <span className="text-zinc-200 font-semibold">
                    {currentPosition
                      ? `${currentPosition.quantity} ${selectedAsset.unit}`
                      : '0 kpl'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-sans text-[11px]">Keskihinta</span>
                  <span className="text-zinc-300">
                    {currentPosition ? `${currentPosition.averageBuyPrice.toFixed(2)} €` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-sans text-[11px]">Markkina-arvo</span>
                  <span className="text-zinc-200">
                    {currentPosition
                      ? `${(currentPosition.quantity * selectedAsset.price).toFixed(2)} €`
                      : '0.00 €'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-sans text-[11px]">Aseman tuotto</span>
                  {currentPosition ? (
                    (() => {
                      const curVal = currentPosition.quantity * selectedAsset.price;
                      const diff = curVal - currentPosition.totalInvested;
                      return (
                        <span
                          className={
                            diff >= 0
                              ? 'text-emerald-400 font-medium'
                              : 'text-rose-400 font-medium'
                          }
                        >
                          {diff >= 0 ? '+' : ''}
                          {diff.toFixed(2)} €
                        </span>
                      );
                    })()
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </div>
              </div>

              {/* Kaupankäyntipaneeli (Osta & Myy) */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-400">Määrä ({selectedAsset.unit}):</span>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={tradeQuantity}
                      onChange={(e) =>
                        setTradeQuantity(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono tabular-nums text-zinc-100"
                    />
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      <button
                        onClick={() => setTradeQuantity(10)}
                        className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      >
                        10
                      </button>
                      <button
                        onClick={() => setTradeQuantity(50)}
                        className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      >
                        50
                      </button>
                      <button
                        onClick={() => {
                          const maxAfford = Math.floor(cash / selectedAsset.price);
                          setTradeQuantity(Math.max(1, maxAfford));
                        }}
                        className="px-2 py-1 rounded bg-zinc-800 text-amber-300 hover:bg-zinc-700 whitespace-nowrap shrink-0"
                      >
                        Max osto
                      </button>
                      {currentPosition && currentPosition.quantity > 0 && (
                        <button
                          onClick={() => setTradeQuantity(currentPosition.quantity)}
                          className="px-2 py-1 rounded bg-zinc-800 text-rose-300 hover:bg-zinc-700 whitespace-nowrap shrink-0"
                        >
                          Kaikki myyntiin
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-zinc-500">Yhteishinta: </span>
                    <span className="font-mono tabular-nums text-amber-400 font-semibold text-sm">
                      {(tradeQuantity * selectedAsset.price).toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() =>
                      executeTradeAction({
                        action: 'buy',
                        assetId: selectedAsset.id,
                        quantity: tradeQuantity,
                      })
                    }
                    disabled={isTradePending || cash < tradeQuantity * selectedAsset.price}
                    className="py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs tracking-wide rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    {isTradePending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Käsitellään...</span>
                      </>
                    ) : (
                      <span>
                        Osta {tradeQuantity} {selectedAsset.unit} (
                        {(tradeQuantity * selectedAsset.price).toFixed(2)} €)
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      executeTradeAction({
                        action: 'sell',
                        assetId: selectedAsset.id,
                        quantity: tradeQuantity,
                      })
                    }
                    disabled={
                      isTradePending ||
                      !currentPosition ||
                      currentPosition.quantity < tradeQuantity
                    }
                    className="py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 font-semibold text-xs tracking-wide rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    {isTradePending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Käsitellään...</span>
                      </>
                    ) : (
                      <span>
                        Myy {tradeQuantity} {selectedAsset.unit}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Oikea sarake (1/3): Sisäpiirivihjeet, uutiset ja Google Slides -vienti */}
        <div className="space-y-6">
          {/* Google Slides Sijoittajaesitys -kortti */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">
                  Sijoittajaesitys (Google Slides)
                </h4>
                <span className="text-[10px] text-zinc-500">
                  Yrityksen Pitch Deck & Talouskatsaus
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Vie yrityksen taloustilanne, velkavivutus ja pörssisalkku valmiina dioina suoraan Google Slidesiin sijoittajia ja pankkia varten.
            </p>

            {slidesState.result ? (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Esitys luotu Google Slidesiin!</span>
                </div>
                <a
                  href={slidesState.result.presentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg text-[11px] transition-colors"
                >
                  <span>Avaa diaesitys</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <button
                onClick={() => exportSlidesAction()}
                disabled={isExportingSlides}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {isExportingSlides ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>Luodaan dioja...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Luo Google Slides -esitys</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Sisäpiirivihjeet (Insider Intel) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-semibold text-zinc-200">Kenttähavainnot & Vihjeet</h4>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {insiderIntel.length} aktiivista
              </span>
            </div>

            <div className="space-y-3">
              {insiderIntel.length > 0 ? (
                insiderIntel.map((intel) => (
                  <div
                    key={intel.id}
                    className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">{intel.title}</span>
                      <span
                        className={`text-[10px] font-mono font-medium ${
                          intel.predictedDirection === 'bullish'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {intel.predictedDirection === 'bullish'
                          ? '▲ Odotus nousu'
                          : '▼ Odotus lasku'}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                      "{intel.whisperText}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-900">
                      <span>Varmuus: {intel.confidence} %</span>
                      <span>Voimassa: {intel.validUntilDay} asti</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Ei aktiivisia sisäpiirivihjeitä. Suorita korkean tason asennuskeikkoja saadaksesi kenttätietoa!
                </div>
              )}
            </div>
          </div>

          {/* Uutisvirta */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-xs font-semibold text-zinc-200">Pörssiuutiset (Katalyytit)</h4>
            <div className="space-y-3">
              {marketNews.map((n) => (
                <div
                  key={n.id}
                  className="space-y-1 text-xs border-b border-zinc-800/80 pb-2.5 last:border-0 last:pb-0"
                >
                  <span className="font-medium text-zinc-300 block">{n.title}</span>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{n.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

