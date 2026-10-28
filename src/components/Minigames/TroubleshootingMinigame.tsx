import React, { useState, useRef, useEffect } from 'react';
import { sound } from '../../services/soundService';
import { Gig } from '../../types/game';
import { Activity, Wrench } from 'lucide-react';

interface TroubleshootingProps {
  gig: Gig;
  onComplete: (precision: number) => void;
  onCancel: () => void;
}

interface ComponentPoint {
  id: string;
  name: string;
  nominalVoltage: string;
  measuredVoltage: string;
  status: 'ok' | 'faulty';
  description: string;
}

const TEST_COMPONENTS: ComponentPoint[] = [
  {
    id: 'breaker',
    name: 'Pääjohdonsuojakatkaisin 16A',
    nominalVoltage: '230 V AC',
    measuredVoltage: '231.2 V AC',
    status: 'ok',
    description: 'Jännite normaali, ei laukeamista.',
  },
  {
    id: 'transformer',
    name: '24V DC Teholähde (Muuntaja)',
    nominalVoltage: '24.0 V DC',
    measuredVoltage: '0.4 V DC (Oikosulku / viallinen)',
    status: 'faulty',
    description: 'Toisiopuolen jännite romahtanut. Komponentti ylikuumentunut.',
  },
  {
    id: 'relay',
    name: 'Turvarele ja Apukontaktori',
    nominalVoltage: '24.0 V DC',
    measuredVoltage: '0.0 V DC (Ei ohjausta)',
    status: 'ok',
    description: 'Rele ehjä, mutta ei saa ohjausjännitettä muuntajalta.',
  },
];

export const TroubleshootingMinigame: React.FC<TroubleshootingProps> = ({
  gig,
  onComplete,
  onCancel,
}) => {
  const [probedPoints, setProbedPoints] = useState<Record<string, boolean>>({});
  const [replaced, setReplaced] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);
  const timeoutRef = useRef<number | null>(null);

  // Perusteltu useEffect: Selaimen setTimeout-siivous komponentin poistuessa (External System Cleanup)
  // Ei tilariippuvuuksia, ei sivuvaikutusketjuja.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleProbe = (id: string) => {
    sound.playClick();
    setProbedPoints((prev) => ({ ...prev, [id]: true }));
  };

  const handleReplace = (id: string) => {
    setAttempts((prev) => prev + 1);
    const target = TEST_COMPONENTS.find((c) => c.id === id);

    if (target?.status === 'faulty') {
      sound.playSuccess();
      setReplaced(true);
      const precision = attempts === 0 ? 100 : 75;
      timeoutRef.current = window.setTimeout(() => {
        onComplete(precision);
      }, 900);
    } else {
      sound.playError();
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Sähkötekninen vianetsintä ja mittaus</h3>
          <p className="text-xs text-zinc-400 mt-1">{gig.clientName} · Mittaa koepisteet ja vaihda viallinen komponentti.</p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Keskeytä
        </button>
      </div>

      <div className="space-y-4">
        {TEST_COMPONENTS.map((item) => {
          const isProbed = !!probedPoints[item.id];

          return (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                  <span className="text-xs text-zinc-500 font-mono">({item.nominalVoltage})</span>
                </div>
                {isProbed ? (
                  <p className={`text-xs font-mono ${item.status === 'faulty' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    Mitattu: {item.measuredVoltage} · {item.description}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">Mittaamaton koepiste</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isProbed ? (
                  <button
                    onClick={() => handleProbe(item.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Mittaa
                  </button>
                ) : (
                  <button
                    onClick={() => handleReplace(item.id)}
                    disabled={replaced}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Vaihda osa
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {replaced && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-center text-xs text-emerald-300">
          Viallinen teholähde vaihdettu uuteen! Ohjauspiiri toimii moitteettomasti.
        </div>
      )}
    </div>
  );
};
