import React, { useActionState, useRef, useEffect } from 'react';
import { sound } from '../../services/soundService';
import { Gig } from '../../types/game';
import { Check, X } from 'lucide-react';

interface Terminal {
  id: string;
  label: string;
  color: string;
  targetId: string;
}

const TERMINALS_LEFT: Terminal[] = [
  { id: 'L1', label: 'Vaihe 1 (L1 - Ruskea)', color: '#92400e', targetId: 'U1' },
  { id: 'L2', label: 'Vaihe 2 (L2 - Musta)', color: '#18181b', targetId: 'V1' },
  { id: 'L3', label: 'Vaihe 3 (L3 - Harmaa)', color: '#71717a', targetId: 'W1' },
  { id: 'PE', label: 'Suojamaadoitus (PE - Kelta-vihreä)', color: '#65a30d', targetId: 'PE_IN' },
];

const TERMINALS_RIGHT = [
  { id: 'V1', label: 'Moottoriliitin V1' },
  { id: 'U1', label: 'Moottoriliitin U1' },
  { id: 'PE_IN', label: 'Runkomaadoitus PE' },
  { id: 'W1', label: 'Moottoriliitin W1' },
];

interface WiringState {
  selectedLeft: string | null;
  connections: Record<string, string>;
  errors: number;
  isComplete: boolean;
  precision: number;
}

type WiringAction =
  | { type: 'selectLeft'; terminalId: string }
  | { type: 'connectRight'; rightId: string };

const INITIAL_WIRING_STATE: WiringState = {
  selectedLeft: null,
  connections: {},
  errors: 0,
  isComplete: false,
  precision: 0,
};

/**
 * Puhdas tilasiirtymäfunktio switch(action.type) -rakenteella (Discriminated Union).
 * Senioriarkkitehdin opetus:
 * TypeScriptissä 'switch (action.type)' takaa tyyppiturvallisen haaroituksen ja
 * mahdollistaa kattavuustarkistuksen (Exhaustiveness Check).
 */
function wiringReducer(state: WiringState, action: WiringAction): WiringState {
  switch (action.type) {
    case 'selectLeft': {
      return {
        ...state,
        selectedLeft: action.terminalId,
      };
    }

    case 'connectRight': {
      if (!state.selectedLeft) return state;

      const source = TERMINALS_LEFT.find((t) => t.id === state.selectedLeft);
      if (!source) return state;

      // Oikea kytkentä
      if (source.targetId === action.rightId) {
        const nextConnections = { ...state.connections, [state.selectedLeft]: action.rightId };
        const isComplete = Object.keys(nextConnections).length === TERMINALS_LEFT.length;
        const precision = Math.max(50, 100 - state.errors * 15);

        return {
          ...state,
          selectedLeft: null,
          connections: nextConnections,
          isComplete,
          precision: isComplete ? precision : 0,
        };
      }

      // Virheellinen kytkentä
      return {
        ...state,
        selectedLeft: null,
        errors: state.errors + 1,
      };
    }

    default: {
      const _exhaustiveCheck: never = action;
      return state;
    }
  }
}

interface WiringMinigameProps {
  gig: Gig;
  onComplete: (precision: number) => void;
  onCancel: () => void;
}

export const WiringMinigame: React.FC<WiringMinigameProps> = ({
  gig,
  onComplete,
  onCancel,
}) => {
  // React 19 useActionState yhdistää tilakoneen ja Transition-tuen
  const [state, dispatchWiring] = useActionState(wiringReducer, INITIAL_WIRING_STATE);
  const timeoutRef = useRef<number | null>(null);

  // Perusteltu useEffect: Selaimen setTimeout-siivous komponentin poistuessa (External System Cleanup)
  // Ei tilariippuvuuksia, ei sivuvaikutusketjuja.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSelectLeft = (id: string) => {
    sound.playClick();
    dispatchWiring({ type: 'selectLeft', terminalId: id });
  };

  const handleSelectRight = (rightId: string) => {
    if (!state.selectedLeft) return;

    const source = TERMINALS_LEFT.find((t) => t.id === state.selectedLeft);
    if (!source) return;

    const isCorrect = source.targetId === rightId;
    if (isCorrect) {
      sound.playSuccess();
    } else {
      sound.playError();
    }

    const nextConnectionsCount = isCorrect
      ? Object.keys(state.connections).length + 1
      : Object.keys(state.connections).length;
    const isCompletedNow = isCorrect && nextConnectionsCount === TERMINALS_LEFT.length;

    dispatchWiring({ type: 'connectRight', rightId });

    // Senioriarkkitehdin opetus:
    // Käyttäjän toimenpiteestä johtuva minipelin päättyminen suoritetaan suoraan
    // tapahtumankäsittelijässä eikä kierrätetä 'useEffect'-sivuvaikutusketjun kautta.
    if (isCompletedNow) {
      const precision = Math.max(50, 100 - state.errors * 15);
      timeoutRef.current = window.setTimeout(() => {
        onComplete(precision);
      }, 800);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Keskuskytkentä ja vaihejärjestys</h3>
          <p className="text-xs text-zinc-400 mt-1">{gig.clientName} · Valitse johdin vasemmalta ja kytke se oikealle.</p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Keskeytä
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8 py-4">
        {/* Vasen rivi */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Syöttökaapeli</span>
          {TERMINALS_LEFT.map((term) => {
            const isConnected = !!state.connections[term.id];
            const isSelected = state.selectedLeft === term.id;

            return (
              <button
                key={term.id}
                onClick={() => !isConnected && handleSelectLeft(term.id)}
                disabled={isConnected}
                className={`w-full p-3 text-left rounded-lg border text-xs font-medium flex items-center justify-between transition-all ${
                  isConnected
                    ? 'bg-zinc-950/60 border-zinc-800 text-zinc-500 cursor-default'
                    : isSelected
                    ? 'border-amber-400 bg-amber-500/10 text-amber-200 ring-1 ring-amber-400'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0 border border-zinc-700"
                    style={{ backgroundColor: term.color }}
                  />
                  <span>{term.label}</span>
                </div>
                {isConnected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Oikea rivi */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Keskusrimat</span>
          {TERMINALS_RIGHT.map((term) => {
            const connectedSourceId = Object.keys(state.connections).find(
              (k) => state.connections[k] === term.id
            );
            const isConnected = !!connectedSourceId;

            return (
              <button
                key={term.id}
                onClick={() => handleSelectRight(term.id)}
                disabled={isConnected || !state.selectedLeft}
                className={`w-full p-3 text-left rounded-lg border text-xs font-medium flex items-center justify-between transition-all ${
                  isConnected
                    ? 'bg-zinc-950/60 border-emerald-500/40 text-emerald-300 cursor-default'
                    : state.selectedLeft
                    ? 'border-zinc-700 bg-zinc-950 hover:border-amber-400 text-zinc-200 cursor-pointer'
                    : 'border-zinc-800/80 bg-zinc-950 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <span>{term.label}</span>
                {isConnected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800 pt-4">
        <span>Kytketty: {Object.keys(state.connections).length} / {TERMINALS_LEFT.length}</span>
        {state.errors > 0 && <span className="text-rose-400">Virhekytkentöjä: {state.errors}</span>}
      </div>
    </div>
  );
};
