import React, { useActionState, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../services/soundService';
import { PerkBranch, PerkDefinition, PerkId } from '../types/game';
import { PERK_CATALOG, canUnlockPerk, hasPerk } from '../data/perksData';
import {
  Hammer,
  Gauge,
  Award,
  LineChart,
  Radio,
  Coins,
  Check,
  Lock,
  Sparkles,
  RotateCcw,
  Zap,
  ArrowDown,
} from 'lucide-react';

interface TalentActionState {
  status: 'idle' | 'success' | 'error';
  message: string | null;
}

type TalentActionPayload =
  | { action: 'unlock'; perkId: PerkId }
  | { action: 'respec' };

export const TalentsView: React.FC = () => {
  const { player, unlockPerk, respecPerks } = useGameStore();
  const [dismissedMsg, setDismissedMsg] = useState<string | null>(null);

  // React 19 useActionState + Exhaustive Switch (Go-idiomi & TS Discriminated Union)
  const [actionState, dispatchAction, isPending] = useActionState(
    (_prev: TalentActionState, payload: TalentActionPayload | null): TalentActionState => {
      if (!payload) return { status: 'idle', message: null };

      switch (payload.action) {
        case 'unlock': {
          const res = unlockPerk(payload.perkId);
          if (res.success) {
            sound.playUpgrade();
          } else {
            sound.playError();
          }
          return { status: res.success ? 'success' : 'error', message: res.message };
        }

        case 'respec': {
          const res = respecPerks();
          if (res.success) {
            sound.playClick();
          } else {
            sound.playError();
          }
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

  const displayNotification =
    actionState.message && actionState.message !== dismissedMsg ? actionState.message : null;

  const renderIcon = (iconName: string, className: string = 'w-5 h-5') => {
    switch (iconName) {
      case 'Hammer':
        return <Hammer className={className} />;
      case 'Gauge':
        return <Gauge className={className} />;
      case 'Award':
        return <Award className={className} />;
      case 'LineChart':
        return <LineChart className={className} />;
      case 'Radio':
        return <Radio className={className} />;
      case 'Coins':
        return <Coins className={className} />;
      default:
        return <Zap className={className} />;
    }
  };

  const fieldPerks = PERK_CATALOG.filter((p) => p.branch === 'field').sort((a, b) => a.tier - b.tier);
  const marketPerks = PERK_CATALOG.filter((p) => p.branch === 'market').sort((a, b) => a.tier - b.tier);

  const renderPerkCard = (perk: PerkDefinition) => {
    const isUnlocked = hasPerk(player, perk.id);
    const { canUnlock, reason } = canUnlockPerk(player, perk);

    return (
      <div
        key={perk.id}
        className={`relative rounded-xl p-5 border transition-all ${
          isUnlocked
            ? 'bg-amber-500/10 border-amber-500/40 text-zinc-100 shadow-sm shadow-amber-500/5'
            : canUnlock
            ? 'bg-zinc-900 border-zinc-700 hover:border-amber-400/60 text-zinc-200'
            : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-500 opacity-75'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isUnlocked
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : canUnlock
                  ? 'bg-zinc-800 text-amber-300'
                  : 'bg-zinc-900 text-zinc-600'
              }`}
            >
              {renderIcon(perk.icon, 'w-5 h-5')}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                  Taso {perk.tier}
                </span>
                <h4 className={`text-sm font-semibold tracking-tight ${isUnlocked ? 'text-amber-300' : 'text-zinc-100'}`}>
                  {perk.name}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">{perk.tagline}</p>
            </div>
          </div>

          <div>
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Aktiivinen</span>
              </span>
            ) : (
              <button
                disabled={!canUnlock || isPending}
                onClick={() => dispatchAction({ action: 'unlock', perkId: perk.id })}
                title={reason || 'Avaa taito'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  canUnlock
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm active:scale-95'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                }`}
              >
                {canUnlock ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Opi (1 TP)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lukittu</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-zinc-300 mt-3.5 leading-relaxed bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
          {perk.description}
        </p>

        {!isUnlocked && reason && (
          <p className="text-[10px] text-zinc-500 mt-2 font-mono flex items-center gap-1">
            <span>ℹ️</span> {reason}
          </p>
        )}
      </div>
    );
  };

  const unlockedCount = player.unlockedPerks.length;

  return (
    <div className="space-y-6">
      {/* Yläpalkki: Taitopisteet, Hahmotaso & Respec */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Käytettävissä</div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {player.perkPoints} <span className="text-sm font-normal text-zinc-400">taitopistettä</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block h-10 w-px bg-zinc-800" />

          <div className="text-xs text-zinc-400 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Ammattitaso:</span>
              <span className="font-mono text-zinc-200 font-semibold">{player.level}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Aktiivisia taitoja:</span>
              <span className="font-mono text-emerald-400 font-semibold">{unlockedCount} / {PERK_CATALOG.length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatchAction({ action: 'respec' })}
            disabled={unlockedCount === 0 || isPending}
            className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-zinc-700/60 transition-colors flex items-center gap-2"
            title="Palauttaa kaikki käytetyt taitopisteet"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nollaa taidot (Respec)</span>
          </button>
        </div>
      </div>

      {displayNotification && (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 flex items-center justify-between animate-fade-in">
          <span>{displayNotification}</span>
          <button
            onClick={() => setDismissedMsg(displayNotification)}
            className="text-zinc-500 hover:text-zinc-300 ml-4 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Erikoistumishaarat: Rinnakkainen puuarkkitehtuuri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Haara 1: Kenttämestari */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-4 rounded-xl border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Hammer className="w-4 h-4" />
              <span>Haara: Kenttämestari</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Painottaa manuaalityön tuntituottoa, minipelien toleransseja, keikkojen staminasäästöä ja teollisuusasennusten mainetta.
            </p>
          </div>

          <div className="space-y-4 relative">
            {fieldPerks.map((perk, index) => (
              <React.Fragment key={perk.id}>
                {renderPerkCard(perk)}
                {index < fieldPerks.length - 1 && (
                  <div className="flex justify-center -my-2 text-zinc-600">
                    <ArrowDown className="w-4 h-4 animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Haara 2: Pörssihai */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-cyan-500/10 to-transparent p-4 rounded-xl border border-cyan-500/20">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <LineChart className="w-4 h-4" />
              <span>Haara: Pörssihai & Markkina-analyytikko</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Painottaa markkinakynttilöiden manuaalista kelausta, keikoilta saatavia sisäpiirivihjeitä ja pörssikauppojen arbitraasituottoja.
            </p>
          </div>

          <div className="space-y-4 relative">
            {marketPerks.map((perk, index) => (
              <React.Fragment key={perk.id}>
                {renderPerkCard(perk)}
                {index < marketPerks.length - 1 && (
                  <div className="flex justify-center -my-2 text-zinc-600">
                    <ArrowDown className="w-4 h-4 animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
