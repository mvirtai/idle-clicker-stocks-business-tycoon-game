import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../services/soundService';
import { AlertOctagon, Trophy, RotateCcw } from 'lucide-react';

export const GameOverModal: React.FC = () => {
  const { isGameOver, isVictory, gameOverReason, restartGame } = useGameStore();

  if (!isGameOver && !isVictory) return null;

  const handleRestart = () => {
    sound.playClick();
    restartGame();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-8 space-y-6 text-center shadow-xl">
        {isGameOver ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-zinc-100">Yritystoiminta päättyi konkurssiin</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {gameOverReason || 'Kassan varat eivät riittäneet kolmen viikon rästilyhennysten hoitamiseen. Pankki realisoi kodin panttina.'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-zinc-100">Kaikki velat maksettu – Koti on vapaa!</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Onneksi olkoon! Olet maksanut koko 45 000 € pankkilainan takaisin, suojannut perheen kodin ja rakentanut vakavaraisen, menestyvän teollisuusyrityksen.
              </p>
            </div>
          </>
        )}

        <div className="pt-2">
          <button
            onClick={handleRestart}
            className="w-full py-3.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Aloita uusi ura alusta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
