import React, { useState, useActionState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../services/soundService';
import { UpgradeCategory, UpgradeItem } from '../types/game';
import { Check, Lock, ChevronUp, Sparkles, Wrench } from 'lucide-react';
import { TalentsView } from './TalentsView';

interface UpgradeActionState {
  status: 'idle' | 'success' | 'error';
  message: string | null;
}

export const UpgradesView: React.FC = () => {
  const { upgrades, purchaseUpgrade, getUpgradeCost, cash, player } = useGameStore();
  const [viewMode, setViewMode] = useState<'upgrades' | 'talents'>('talents'); // Avataan suoraan hahmon taitoihin tai investointeihin
  const [selectedCategory, setSelectedCategory] = useState<UpgradeCategory | 'all'>('all');

  // React 19 useActionState: Päivitysten osto
  const [upgradeState, dispatchUpgrade, isUpgrading] = useActionState(
    (_prev: UpgradeActionState, upgradeId: string | null): UpgradeActionState => {
      if (!upgradeId) return { status: 'idle', message: null };
      const res = purchaseUpgrade(upgradeId);
      if (res.success) {
        sound.playUpgrade();
      } else {
        sound.playError();
      }
      return { status: res.success ? 'success' : 'error', message: res.message };
    },
    { status: 'idle', message: null }
  );

  const [dismissedMsg, setDismissedMsg] = useState<string | null>(null);
  const displayNotification =
    upgradeState.message && upgradeState.message !== dismissedMsg ? upgradeState.message : null;

  const categories: { id: UpgradeCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Kaikki' },
    { id: 'tools', label: 'Työkalut' },
    { id: 'certs', label: 'Sertifikaatit' },
    { id: 'equipment', label: 'Kalusto' },
    { id: 'company', label: 'Yritys' },
  ];

  const filteredUpgrades = upgrades.filter(
    (u) => selectedCategory === 'all' || u.category === selectedCategory
  );

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Päänäkymän valitsin: Hahmon Taidot vs. Kalusto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          <button
            onClick={() => setViewMode('talents')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'talents'
                ? 'bg-zinc-800 text-amber-300 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Hahmon Taidot & Erikoistuminen</span>
            {player.perkPoints > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-mono text-[10px] font-bold animate-pulse">
                {player.perkPoints}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('upgrades')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'upgrades'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Kalusto & Yritysinvestoinnit</span>
          </button>
        </div>

        {viewMode === 'upgrades' && (
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'talents' ? (
        <TalentsView />
      ) : (
        <>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Investoinnit & Päivitykset</h2>
            <p className="text-xs text-zinc-400">
              Hanki parempia erikoistyökaluja, virallisia pätevyyksiä ja toimitiloja tehostamaan toimintaasi.
            </p>
          </div>

          {displayNotification && (
            <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 flex items-center justify-between animate-fade-in">
              <span>{displayNotification}</span>
              <button
                onClick={() => setDismissedMsg(displayNotification)}
                className="text-zinc-500 hover:text-zinc-300 ml-4 text-sm"
              >
                ×
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUpgrades.map((item) => {
          const cost = getUpgradeCost(item);
          const isMax = item.level >= item.maxLevel;
          const meetsLevel = !item.requiredLevel || player.level >= item.requiredLevel;
          const canAfford = cash >= cost && !isMax && meetsLevel;

          return (
            <div
              key={item.id}
              className={`p-6 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                isMax
                  ? 'border-zinc-800/60 bg-zinc-950/40 opacity-80'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{item.icon}</span>
                      <h3 className="text-sm font-semibold text-zinc-200">{item.name}</h3>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      Taso {item.level} / {item.maxLevel}
                    </span>
                  </div>

                  {isMax ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      MAX
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-medium text-amber-400">
                      {cost.toLocaleString('fi-FI')} €
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                <p className="text-[11px] text-zinc-500 italic">{item.lore}</p>

                {/* Bonukset */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono pt-1">
                  {item.clickBonus > 0 && (
                    <span className="text-amber-400">+{item.clickBonus} €/klikki</span>
                  )}
                  {item.passiveIncomeBonus > 0 && (
                    <span className="text-emerald-400">+{item.passiveIncomeBonus} €/pv</span>
                  )}
                  {item.staminaDrainReduction > 0 && (
                    <span className="text-zinc-300">
                      -{Math.round(item.staminaDrainReduction * 100)}% väsyminen
                    </span>
                  )}
                  {item.repBonus > 0 && (
                    <span className="text-zinc-400">+{item.repBonus} REP</span>
                  )}
                </div>

                {item.requiredLevel && !meetsLevel && (
                  <p className="text-[11px] text-rose-400">
                    Vaatii ammattitason {item.requiredLevel} (Nykyinen: {player.level})
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-800/60">
                <button
                  onClick={() => dispatchUpgrade(item.id)}
                  disabled={isUpgrading || !canAfford}
                  className={`w-full py-2.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    isMax
                      ? 'bg-zinc-800/40 text-zinc-600 cursor-default'
                      : canAfford
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold'
                      : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  {isMax ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Korkein taso asennettu</span>
                    </>
                  ) : !meetsLevel ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Taso ei riitä</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Päivitä ({cost.toLocaleString('fi-FI')} €)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
};
