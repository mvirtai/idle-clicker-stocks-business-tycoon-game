import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../services/soundService';
import { TimingMinigame } from './Minigames/TimingMinigame';
import { WiringMinigame } from './Minigames/WiringMinigame';
import { TroubleshootingMinigame } from './Minigames/TroubleshootingMinigame';
import {
  Zap,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  BatteryCharging,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export const WorkstationView: React.FC = () => {
  const {
    player,
    performManualClick,
    completeMinigame,
    setActiveTab,
    dayOfWeek,
    hour,
    minute,
    canExecuteTodayGig,
    advanceDay,
  } = useGameStore();

  const [isPlayingMinigame, setIsPlayingMinigame] = useState<boolean>(false);
  const [lastEarned, setLastEarned] = useState<number | null>(null);
  const [clickAnim, setClickAnim] = useState<boolean>(false);
  const [intelNotice, setIntelNotice] = useState<string | null>(null);
  const [dayNotice, setDayNotice] = useState<string | null>(null);

  // Kalenterisynkronoitu tilantarkistus (Single Source of Truth)
  const execCheck = canExecuteTodayGig();
  const scheduledGig = execCheck.gig;
  const todaySlot = execCheck.slot;
  const isCompletedToday = Boolean(todaySlot?.result);

  const formattedClock = `${hour.toString().padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')}`;

  const handleManualWork = () => {
    sound.playClick();
    const earned = performManualClick(1.0);
    setLastEarned(earned);
    setClickAnim(true);
    setTimeout(() => setClickAnim(false), 200);
  };

  const handleMinigameFinished = (precision: number) => {
    const res = completeMinigame(precision);
    setIsPlayingMinigame(false);
    if (res.intelAwarded) {
      setIntelNotice(
        'Kuulit työmaalla luottamuksellisen sisäpiirivihjeen! Avaa Pörssi hyödyntääksesi markkinatietoa.'
      );
    }
  };

  const handleAdvanceDayFromWorkstation = () => {
    sound.playClick();
    const res = advanceDay();
    setDayNotice(res.message);
  };

  // Jos minipeli on käynnissä ja keikka on suoritettavissa, näytetään vain kyseinen pelinäkymä
  if (isPlayingMinigame && scheduledGig && execCheck.canExecute) {
    if (scheduledGig.minigameType === 'timing') {
      return (
        <div className="py-8">
          <TimingMinigame
            gig={scheduledGig}
            onComplete={handleMinigameFinished}
            onCancel={() => setIsPlayingMinigame(false)}
          />
        </div>
      );
    }
    if (scheduledGig.minigameType === 'wiring') {
      return (
        <div className="py-8">
          <WiringMinigame
            gig={scheduledGig}
            onComplete={handleMinigameFinished}
            onCancel={() => setIsPlayingMinigame(false)}
          />
        </div>
      );
    }
    return (
      <div className="py-8">
        <TroubleshootingMinigame
          gig={scheduledGig}
          onComplete={handleMinigameFinished}
          onCancel={() => setIsPlayingMinigame(false)}
        />
      </div>
    );
  }

  const reqXp = player.level * 150;
  const xpPercent = Math.min(100, Math.round((player.xp / reqXp) * 100));

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Työpisteen otsikko ja ammattilaistiedot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Sähkö- ja automaatiotyöpiste
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Suorita kalenteriin sovitut päivän asennuskeikat ja tee pientöitä omalla verstaalla.
          </p>
        </div>

        {/* Kokemus & Taso + Taitopisteet */}
        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-xl">
          {player.perkPoints > 0 && (
            <button
              onClick={() => setActiveTab('upgrades')}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all animate-pulse"
              title="Avaa taitopuu ja valitse erikoistuminen"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{player.perkPoints} taitopiste!</span>
            </button>
          )}

          <div className="text-right">
            <div className="text-xs font-medium text-zinc-200">Ammattitaso {player.level}</div>
            <div className="text-[10px] text-zinc-500 font-mono">
              XP {player.xp} / {reqXp} ({xpPercent}%)
            </div>
          </div>
          <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {intelNotice && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between animate-fade-in">
          <span>{intelNotice}</span>
          <button
            onClick={() => {
              setIntelNotice(null);
              setActiveTab('market');
            }}
            className="ml-4 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg text-[11px] transition-colors shrink-0"
          >
            Siirry Pörssiin →
          </button>
        </div>
      )}

      {dayNotice && (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 flex items-center justify-between">
          <span>{dayNotice}</span>
          <button
            onClick={() => setDayNotice(null)}
            className="text-zinc-500 hover:text-zinc-300 ml-4 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Pääkortti: Kalenteriin synkronoitu Päivän toimeksianto */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Päivän toimeksianto (Kalenterisynkronoitu)
            </span>
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs text-zinc-300 font-mono font-semibold">
              {dayOfWeek} klo {formattedClock}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('calendar')}
              className="text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
            >
              Viikkokalenteri
            </button>
            <button
              onClick={() => setActiveTab('gigs')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              Keikkapörssi →
            </button>
          </div>
        </div>

        {/* Tila 1: Tämän päivän keikka on jo suoritettu (lukittu tälle päivälle) */}
        {isCompletedToday && todaySlot.result ? (
          <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Päivän toimeksianto suoritettu ({dayOfWeek})</span>
                </div>
                <h3 className="text-base font-semibold text-zinc-100">
                  {todaySlot.title || scheduledGig?.clientName || 'Asennuskeikka'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Sovittu keikkaosuus tälle päivälle on valmis ja kirjattu tilikirjaan. Voit tehdä
                  verstaalla pientöitä tai päättää työpäivän siirtyäksesi seuraavaan kalenteripäivään.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-emerald-500/20 text-xs font-mono">
              <div>
                <span className="text-zinc-500 font-sans block">Laskutettu palkkio</span>
                <span className="text-emerald-400 font-semibold text-sm">
                  +{todaySlot.result.payEarned} €
                </span>
              </div>
              <div>
                <span className="text-zinc-500 font-sans block">Työn tarkkuus</span>
                <span className="text-zinc-200 font-semibold text-sm">
                  {Math.round(todaySlot.result.precision * 100)} % ({todaySlot.result.grade})
                </span>
              </div>
              <div>
                <span className="text-zinc-500 font-sans block">Ammattikokemus</span>
                <span className="text-amber-400 font-semibold text-sm">
                  +{todaySlot.result.xpEarned} XP
                </span>
              </div>
              <div>
                <span className="text-zinc-500 font-sans block">Mainemuutos</span>
                <span
                  className={`font-semibold text-sm ${
                    todaySlot.result.repDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {todaySlot.result.repDelta >= 0 ? '+' : ''}
                  {todaySlot.result.repDelta} Rep
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleAdvanceDayFromWorkstation}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors"
              >
                <span>Päätä työpäivä ({dayOfWeek})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl transition-colors"
              >
                Tarkista viikkokalenteri
              </button>
            </div>
          </div>
        ) : scheduledGig ? (
          /* Tila 2: Kalenterissa on tälle päivälle sovittu keikka, jota ei ole vielä suoritettu */
          <div className="space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-semibold text-zinc-100">
                  {todaySlot.title || scheduledGig.clientName}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  Tier {scheduledGig.tier}
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{scheduledGig.description}</p>
            </div>

            {/* Palkkio ja resurssivaatimukset (Stamina & Pelikello) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3.5 border-y border-zinc-800/80 text-xs">
              <div>
                <span className="text-zinc-500 block">Palkkiohaarukka</span>
                <span className="font-mono text-amber-400 font-medium text-sm">
                  {scheduledGig.payMin} – {scheduledGig.payMax} €
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Tehtävätyyppi</span>
                <span className="text-zinc-200 font-medium">
                  {scheduledGig.minigameType === 'timing'
                    ? 'Ajoitus & Tahdistus'
                    : scheduledGig.minigameType === 'wiring'
                    ? 'Keskuskytkentä'
                    : 'Vianetsintä'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 flex items-center gap-1">
                  <BatteryCharging className="w-3.5 h-3.5 text-rose-400" />
                  <span>Staminakulu</span>
                </span>
                <span
                  className={`font-mono font-semibold text-sm ${
                    player.stamina >= execCheck.staminaCost ? 'text-zinc-100' : 'text-rose-400'
                  }`}
                >
                  -{execCheck.staminaCost} %{' '}
                  <span className="text-[11px] text-zinc-500 font-normal">
                    (sinulla {Math.round(player.stamina)}%)
                  </span>
                </span>
              </div>
              <div>
                <span className="text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kesto pelikellossa</span>
                </span>
                <span className="font-mono text-zinc-100 font-semibold text-sm">
                  +{execCheck.durationHours} h{' '}
                  <span className="text-[11px] text-zinc-500 font-normal">
                    ({scheduledGig.durationDays} pv urakka)
                  </span>
                </span>
              </div>
            </div>

            <div className="pt-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsPlayingMinigame(true)}
                  disabled={!execCheck.canExecute}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold text-xs tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    Suorita päivän keikka (-{execCheck.staminaCost}% Stamina · +{execCheck.durationHours}h)
                  </span>
                </button>

                {!execCheck.canExecute && (
                  <button
                    onClick={handleAdvanceDayFromWorkstation}
                    className="w-full sm:w-auto px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Päätä päivä ja lepää</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!execCheck.canExecute && execCheck.reason && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-500/30 px-3.5 py-2.5 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{execCheck.reason}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tila 3: Lepopäivä (LA/SU) tai vapaa arkipäivä (empty) */
          <div className="py-8 text-center space-y-4">
            <p className="text-sm text-zinc-300 font-medium">
              {todaySlot?.type === 'rest'
                ? `Tänään (${dayOfWeek}) on kalenteriin merkitty lepopäivä.`
                : `Tälle päivälle (${dayOfWeek}) ei ole varattu asiakaskeikkaa kalenteriin.`}
            </p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              {todaySlot?.type === 'rest'
                ? 'Viikonloppuisin palaudut rasituksesta. Voit päättää lepopäivän tai varata urakoita tuleville arkipäiville.'
                : 'Keikkoja voi suorittaa vain, kun ne on varattu kalenteriin. Avaa Keikkapörssi varataksesi vapaalle päivälle sopivan toimeksiannon.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              {todaySlot?.type !== 'rest' && (
                <button
                  onClick={() => setActiveTab('gigs')}
                  className="px-4 py-2.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl transition-colors"
                >
                  Varaa keikka Keikkapörssistä
                </button>
              )}
              <button
                onClick={handleAdvanceDayFromWorkstation}
                className="px-4 py-2.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <span>Päätä päivä ({dayOfWeek})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manuaalinen asennustyö ja klikkeri */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold text-zinc-100">
              Manuaalinen kokoonpano ja kaapelointi
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tee pientoimituksia ja kaapelivalmisteluja omalla verstaalla (kestää 10 min / suoritus).
            </p>
          </div>
          {lastEarned !== null && (
            <span className="text-xs font-mono text-emerald-400 font-medium animate-fade-in">
              +{lastEarned.toFixed(2)} €
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <button
            onClick={handleManualWork}
            disabled={player.stamina <= 0}
            className={`w-full sm:w-64 py-5 px-6 rounded-xl border border-zinc-700 bg-zinc-950 hover:border-amber-400 text-zinc-100 font-medium text-sm flex flex-col items-center gap-1.5 transition-all active:scale-95 shadow-sm ${
              clickAnim ? 'ring-2 ring-amber-400/50' : ''
            }`}
          >
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Asenna & Johdota</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              +{(player.baseClickValue + player.level * 1.5).toFixed(2)} € / suoritus
            </span>
          </button>

          <div className="space-y-2 text-xs text-zinc-400 leading-relaxed flex-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Jokainen suoritus kerryttää kassaa, ammattikokemusta (XP) ja kuluttaa 10 min pelikelloa.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Muista jättää riittävästi Staminaa ja kellonaikaa päivän varsinaiseen asiakaskeikkaan!</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Staminan loppuminen heikentää tuottavuutta, kunnes päätät päivän ja lepäät.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
