import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../services/soundService';
import { Gig } from '../types/game';
import { Check, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export const GigMarketView: React.FC = () => {
  const { availableGigs, activeGig, setActiveGig, player, setActiveTab } = useGameStore();

  const handleSelectGig = (gig: Gig) => {
    sound.playClick();
    setActiveGig(gig);
    setActiveTab('workstation');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="border-b border-zinc-800/80 pb-6">
        <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Keikkapörssi ja toimeksiannot</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Valitse profiiliisi ja sertifikaatteihisi sopiva asennuskeikka. Vaativammat urakat vaativat korkeampaa mainetta (Rep) ja koulutuksia.
        </p>
      </div>

      <div className="space-y-4">
        {availableGigs.map((gig) => {
          const isSelected = activeGig?.id === gig.id;
          const meetsRep = player.personalRep >= gig.requiredRep;
          const meetsCerts = gig.requiredCerts.every((cert) => player.certifications.includes(cert));
          const canAccept = meetsRep && meetsCerts;

          return (
            <div
              key={gig.id}
              className={`p-6 rounded-2xl border transition-all ${
                isSelected
                  ? 'border-amber-400/80 bg-zinc-900/90 shadow-sm'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-100">{gig.clientName}</span>
                    <span className="text-[11px] font-mono text-zinc-500">Tier {gig.tier}</span>
                    {isSelected && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">
                        Aktiivinen
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{gig.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-2">
                    <div>
                      Palkkio:{' '}
                      <span className="font-mono text-amber-400 font-medium">
                        {gig.payMin} – {gig.payMax} €
                      </span>
                    </div>
                    <span>·</span>
                    <div>Kesto: <span className="text-zinc-300">{gig.durationDays} pv</span></div>
                    <span>·</span>
                    <div>Maine: <span className="text-zinc-300">+{gig.reputationAward}</span></div>
                    <span>·</span>
                    <div>
                      Tyyppi:{' '}
                      <span className="text-zinc-300 capitalize">
                        {gig.minigameType === 'timing'
                          ? 'Ajoitus'
                          : gig.minigameType === 'wiring'
                          ? 'Keskuskytkentä'
                          : 'Vianetsintä'}
                      </span>
                    </div>
                  </div>

                  {/* Vaatimukset */}
                  {(gig.requiredRep > 0 || gig.requiredCerts.length > 0) && (
                    <div className="flex items-center gap-2 pt-2 text-[11px]">
                      <span className="text-zinc-500">Vaatimukset:</span>
                      {gig.requiredRep > 0 && (
                        <span className={meetsRep ? 'text-zinc-400' : 'text-rose-400'}>
                          Maine {gig.requiredRep} {meetsRep ? '✓' : `(sinulla: ${player.personalRep})`}
                        </span>
                      )}
                      {gig.requiredCerts.map((c) => (
                        <span
                          key={c}
                          className={`flex items-center gap-1 ${
                            player.certifications.includes(c) ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0 pt-2 sm:pt-0">
                  <button
                    onClick={() => handleSelectGig(gig)}
                    disabled={!canAccept || isSelected}
                    className={`px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                      isSelected
                        ? 'bg-zinc-800 text-zinc-400 cursor-default'
                        : canAccept
                        ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold'
                        : 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    {!canAccept ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lukittu</span>
                      </>
                    ) : isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Valittu</span>
                      </>
                    ) : (
                      <>
                        <span>Ota keikka</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
