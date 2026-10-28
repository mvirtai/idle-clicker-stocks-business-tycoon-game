import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../services/soundService';
import { TimingMinigame } from './Minigames/TimingMinigame';
import { WiringMinigame } from './Minigames/WiringMinigame';
import { TroubleshootingMinigame } from './Minigames/TroubleshootingMinigame';
import { Zap, Play, CheckCircle2, Award, Clock, Sparkles } from 'lucide-react';

export const WorkstationView: React.FC = () => {
  const {
    player,
    activeGig,
    performManualClick,
    completeMinigame,
    setActiveTab,
    week,
    dayOfWeek,
  } = useGameStore();

  const [isPlayingMinigame, setIsPlayingMinigame] = useState<boolean>(false);
  const [lastEarned, setLastEarned] = useState<number | null>(null);
  const [clickAnim, setClickAnim] = useState<boolean>(false);
  const [intelNotice, setIntelNotice] = useState<string | null>(null);

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
      setIntelNotice('Kuulit työmaalla luottamuksellisen sisäpiirivihjeen! Avaa Pörssi hyödyntääksesi markkinatietoa.');
    }
  };

  // Jos minipeli on käynnissä, näytetään vain kyseinen pelinäkymä ilmavasti
  if (isPlayingMinigame && activeGig) {
    if (activeGig.minigameType === 'timing') {
      return (
        <div className="py-8">
          <TimingMinigame
            gig={activeGig}
            onComplete={handleMinigameFinished}
            onCancel={() => setIsPlayingMinigame(false)}
          />
        </div>
      );
    }
    if (activeGig.minigameType === 'wiring') {
      return (
        <div className="py-8">
          <WiringMinigame
            gig={activeGig}
            onComplete={handleMinigameFinished}
            onCancel={() => setIsPlayingMinigame(false)}
          />
        </div>
      );
    }
    return (
      <div className="py-8">
        <TroubleshootingMinigame
          gig={activeGig}
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
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Sähkö- ja automaatiotyöpiste</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Valmistele asennuksia, kehitä kädentaitoja ja suorita asiakastoimeksiantoja.
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

      {/* Pääkortti: Aktiivinen toimeksianto tai keikkavalinta */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Päivän toimeksianto</span>
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs text-zinc-500 font-mono">{dayOfWeek}</span>
          </div>

          <button
            onClick={() => setActiveTab('gigs')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Vaihda toimeksiantoa →
          </button>
        </div>

        {activeGig ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-zinc-100">{activeGig.clientName}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{activeGig.description}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-zinc-800/80 text-xs">
              <div>
                <span className="text-zinc-500 block">Palkkio</span>
                <span className="font-mono text-amber-400 font-medium text-sm">
                  {activeGig.payMin} – {activeGig.payMax} €
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Tehtävätyyppi</span>
                <span className="text-zinc-200 font-medium capitalize">
                  {activeGig.minigameType === 'timing'
                    ? 'Ajoitus & Tahdistus'
                    : activeGig.minigameType === 'wiring'
                    ? 'Keskuskytkentä'
                    : 'Vianetsintä'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Maine (Rep)</span>
                <span className="font-mono text-zinc-200">+{activeGig.reputationAward}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Kesto</span>
                <span className="text-zinc-200">{activeGig.durationDays} päivää</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsPlayingMinigame(true)}
                disabled={player.stamina < 15}
                className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold text-xs tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Aloita toimeksianto (Minipeli)</span>
              </button>
              {player.stamina < 15 && (
                <p className="text-[11px] text-rose-400 mt-2">
                  Stamina liian matala ({Math.round(player.stamina)}%). Siirry seuraavaan päivään tai lepää.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-zinc-400">Ei aktiivista toimeksiantoa valittuna tälle päivälle.</p>
            <button
              onClick={() => setActiveTab('gigs')}
              className="px-4 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
            >
              Avaa keikkapörssi
            </button>
          </div>
        )}
      </div>

      {/* Manuaalinen asennustyö ja klikkeri */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold text-zinc-100">Manuaalinen kokoonpano ja kaapelointi</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tee pientoimituksia ja kaapelivalmisteluja omalla verstaalla.
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
              <span>Jokainen suoritus kerryttää kassaa ja ammattikokemusta (XP).</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Työkalupäivitykset kasvattavat klikkauskohtaista tuottoa.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Staminan loppuminen heikentää tuottavuutta, kunnes pidät lepopäivän.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
