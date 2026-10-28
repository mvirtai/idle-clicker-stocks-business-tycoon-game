import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../services/soundService';
import { Volume2, VolumeX, BookOpen, RotateCcw, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  onOpenArchitecture: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenArchitecture }) => {
  const store = useGameStore();
  const {
    week,
    dayOfWeek,
    hour,
    minute,
    cash,
    player,
    loan,
    activeTab,
    setActiveTab,
    advanceDay,
    restartGame,
  } = store;
  const [isMuted, setIsMuted] = useState(sound.getIsMuted());
  const [confirmRestart, setConfirmRestart] = useState(false);

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleNextDay = () => {
    sound.playClick();
    advanceDay();
  };

  const handleRestartClick = () => {
    if (!confirmRestart) {
      setConfirmRestart(true);
      setTimeout(() => setConfirmRestart(false), 3500);
      return;
    }
    setConfirmRestart(false);
    restartGame();
  };

  const formattedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Brand Zone + Quick Return to Main View */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('workstation')}
            className="flex items-center gap-2 text-left group focus:outline-none"
            title="Palaa päänäkymään (Työpiste)"
          >
            <span className="text-base font-semibold tracking-tight text-zinc-100 group-hover:text-amber-400 transition-colors">
              From Gigs to Giants
            </span>
            <span className="text-xs text-zinc-500 hidden sm:inline">
              · Studio Tycoon
            </span>
          </button>

          {activeTab !== 'workstation' && (
            <button
              onClick={() => setActiveTab('workstation')}
              className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Päänäkymään</span>
            </button>
          )}
        </div>

        {/* Essential Metrics Zone */}
        <div className="flex items-center gap-6 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Aika:</span>
            <span className="font-mono text-zinc-200">Vk {week}, {dayOfWeek} {formattedTime}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Kassa:</span>
            <span className="font-mono tabular-nums text-amber-400 font-medium text-sm">
              {cash.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
            {store.getDailyPassiveBreakdown &&
              store.getDailyPassiveBreakdown().totalDailyEur > 0 && (
                <span
                  className="font-mono tabular-nums text-emerald-400 text-[11px]"
                  title="Tilitetään tilikirjaan aina työpäivän päättyessä"
                >
                  (+{store.getDailyPassiveBreakdown().totalDailyEur.toFixed(0)} €/pv)
                </span>
              )}
          </div>

          {store.getPortfolioValue && store.getPortfolioValue() > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-zinc-500">Salkku:</span>
              <span className="font-mono tabular-nums text-emerald-400 font-medium text-sm">
                {store.getPortfolioValue().toLocaleString('fi-FI', { minimumFractionDigits: 2 })} €
              </span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-2">
            <span className="text-zinc-500">Stamina:</span>
            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  player.stamina > 30 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${(player.stamina / player.maxStamina) * 100}%` }}
              />
            </div>
            <span className="font-mono text-zinc-300">{Math.round(player.stamina)}%</span>
          </div>

          {store.hasCompanyBought && loan?.principal > 0 && (
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-zinc-500">Kodin velkariski:</span>
              <span className="font-mono tabular-nums text-rose-400">
                {((loan.principal / loan.homeCollateralValue) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Actions Zone */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleNextDay}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
            title="Siirry seuraavaan työpäivään"
          >
            Seuraava päivä
          </button>

          <button
            onClick={onOpenArchitecture}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Arkkitehdin muistio & Go/TS-mallit"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleSound}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            title={isMuted ? 'Ota äänet käyttöön' : 'Mykistä äänet'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleRestartClick}
            className={`px-2 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
              confirmRestart
                ? 'bg-rose-600 text-white font-medium'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
            title="Aloita peli alusta"
          >
            <RotateCcw className="w-4 h-4" />
            {confirmRestart && <span>Vahvista nollaus?</span>}
          </button>
        </div>
      </div>
    </header>
  );
};
