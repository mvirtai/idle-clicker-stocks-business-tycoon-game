import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEffectEvent } from '../../hooks/useEffectEvent';
import { sound } from '../../services/soundService';
import { Gig } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';
import { MinigameSubmissionResult } from '../../types/leaderboard';
import {
  Zap,
  Trophy,
  RotateCcw,
  CheckCircle2,
  Flame,
  Clock,
  Activity,
  HelpCircle,
  X,
} from 'lucide-react';

interface TimingMinigameProps {
  gig: Gig;
  onComplete: (precision: number) => void;
  onCancel: () => void;
}

interface CycleAttempt {
  cycleIndex: number;
  isHit: boolean;
  accuracy: number;
  streakBonus: boolean;
  angleAtHit: number;
}

// Puhtaat geometriset apufunktiot (Pure Functions) komponentin ulkopuolella:
// Eivät riipu renderöinnistä tai Reactin tilasta, jolloin React Compilerin
// ei tarvitse memoizoida tai seurata niitä.
function isAngleInSector(angle: number, start: number, arcDeg: number, tolerance: number = 0): boolean {
  const normAngle = ((angle % 360) + 360) % 360;
  const normStart = ((start % 360) + 360) % 360;

  const effectiveStart = (normStart - tolerance + 360) % 360;
  const effectiveArc = arcDeg + tolerance * 2;
  if (effectiveArc >= 360) return true;

  const end = (effectiveStart + effectiveArc) % 360;
  if (effectiveStart < end) {
    return normAngle >= effectiveStart && normAngle <= end;
  }
  return normAngle >= effectiveStart || normAngle <= end;
}

function calculateAccuracy(angle: number, start: number, arcDeg: number): number {
  const normAngle = ((angle % 360) + 360) % 360;
  const normStart = ((start % 360) + 360) % 360;
  const center = (normStart + arcDeg / 2.0) % 360;
  let diff = Math.abs(normAngle - center);
  if (diff > 180) diff = 360 - diff;

  const maxDist = Math.max(arcDeg / 2.0, 1.0);
  const ratio = diff / maxDist;
  const clamped = Math.min(1.0, Math.max(0.6, 1.0 - ratio * 0.4));
  return Math.round(clamped * 1000) / 10;
}

export const TimingMinigame: React.FC<TimingMinigameProps> = ({
  gig,
  onComplete,
  onCancel,
}) => {
  const { player, upgrades, recordMinigameScore, getScoresByMinigame } = useGameStore();

  // Syklimäärä: Alkuperäisen TimingGame.razor mukainen 24 sykliä (tai 12 syklin nopea tila)
  const [maxCycles, setMaxCycles] = useState<number>(24);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [attempts, setAttempts] = useState<CycleAttempt[]>([]);
  const [flashState, setFlashState] = useState<'hit' | 'miss' | null>(null);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Kellotus tulostaulua varten
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Loppupöytäkirjan tila
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [finalPrecision, setFinalPrecision] = useState<number>(0);
  const [submissionResult, setSubmissionResult] = useState<MinigameSubmissionResult | null>(null);

  // Lasketaan sektorin leveys alkuperäisellä kaavalla:
  // W(Stamina) = W_base * (0.5 + 0.5 * Stamina / 100) * beta_tool
  const toolLevel = upgrades.find((u) => u.id === 'tools-4')?.level || 0; // Oskilloskooppi laajentaa ikkunaa
  const betaTool = 1.0 + toolLevel * 0.08;
  const staminaFactor = 0.5 + 0.5 * (Math.min(100, Math.max(5, player.stamina)) / 100.0);
  const sectorArcDegrees = Math.min(115, Math.round(75.0 * staminaFactor * betaTool));

  const [sectorStartAngle, setSectorStartAngle] = useState<number>(() =>
    Math.floor(100 + Math.random() * 140)
  );
  const [currentAngle, setCurrentAngle] = useState<number>(0);

  const angleRef = useRef<number>(0);
  const wasInsideRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 3-vaiheinen kalibrointi (Vaihe 1: Taajuus, Vaihe 2: Vaihe-ero, Vaihe 3: Kuormitus)
  const phaseSize = maxCycles / 3;
  const currentPhase =
    completedCycles < phaseSize ? 1 : completedCycles < phaseSize * 2 ? 2 : 3;

  const currentPhaseTitle =
    currentPhase === 1
      ? 'VAIHE 1/3: TAAJUUDEN KALIBROINTI (50.0 Hz)'
      : currentPhase === 2
      ? 'VAIHE 2/3: VAIHE-ERON TASAUS (Δφ → 0°)'
      : 'VAIHE 3/3: KUORMITUKSEN KYTKENTÄ (SYNC)';

  // Pyörimisnopeus kasvaa hieman vaiheiden edetessä (astetta / sekunti)
  const degreesPerSecond = currentPhase === 1 ? 92 : currentPhase === 2 ? 108 : 124;

  // React 19.2+ useEffectEvent: eristetään animaatioaskel reaktiivisesta efektistä.
  // Näin requestAnimationFrame-silmukkaa ei tarvitse purkaa ja käynnistää uudelleen
  // aina kun vaihe (phase), nopeus tai sektorin koko muuttuu!
  const onStepFrame = useEffectEvent((now: number) => {
    const dt = Math.min(0.1, (now - lastFrameTimeRef.current) / 1000);
    lastFrameTimeRef.current = now;

    const nextAngle = (angleRef.current + degreesPerSecond * dt) % 360;
    angleRef.current = nextAngle;
    setCurrentAngle(nextAngle);
    setElapsedSeconds(Math.round(((Date.now() - startTimeRef.current) / 1000) * 10) / 10);

    const nowInside = isAngleInSector(nextAngle, sectorStartAngle, sectorArcDegrees, 0);
    if (nowInside && !wasInsideRef.current) {
      wasInsideRef.current = true;
      sound.playSectorEntry();
    } else if (!nowInside && wasInsideRef.current) {
      wasInsideRef.current = false;
    }
  });

  // Perusteltu useEffect: 60fps requestAnimationFrame -selainsilmukka (External Animation Loop)
  // Eristetty reaktiivisesta tilasta useEffectEventillä (onStepFrame), jolloin silmukka
  // ei käynnisty turhaan uudelleen kulman tai vaiheen muuttuessa.
  useEffect(() => {
    if (isGameOver || showTutorial) return;

    lastFrameTimeRef.current = performance.now();

    const step = (now: number) => {
      onStepFrame(now);
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isGameOver, showTutorial]);

  // Lopetuksen käsittely ja tulostaululle kirjaus
  const finishCalibration = useCallback(
    (finalAttempts: CycleAttempt[], bestStreak: number) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setIsGameOver(true);

      const totalAccuracy = finalAttempts
        .filter((a) => a.isHit)
        .reduce((sum, a) => sum + a.accuracy, 0);
      const precision = Math.round((totalAccuracy / maxCycles) * 10) / 10;
      const duration = Math.max(
        1,
        Math.round(((Date.now() - startTimeRef.current) / 1000) * 10) / 10
      );
      const hitsCount = finalAttempts.filter((a) => a.isHit).length;

      setFinalPrecision(precision);
      sound.playSuccess();

      const subRes = recordMinigameScore({
        minigameType: 'timing',
        gigName: gig.clientName,
        precision,
        durationSeconds: duration,
        bonusPoints: bestStreak * 18 + (hitsCount === maxCycles ? 150 : 0),
        details: `${hitsCount}/${maxCycles} sykliä · Putki ${bestStreak}x${
          bestStreak >= 3 ? ' 🔥' : ''
        }`,
      });
      setSubmissionResult(subRes);
    },
    [gig.clientName, maxCycles, recordMinigameScore]
  );

  // Lukitusiskun käsittely (Välilyönti tai painike)
  const triggerHit = useCallback(() => {
    if (isGameOver || showTutorial) return;

    const angle = angleRef.current;
    const isHit = isAngleInSector(angle, sectorStartAngle, sectorArcDegrees, 8.0);
    let accuracy = 0;
    let nextStreak = streak;
    let nextMaxStreak = maxStreak;

    if (isHit) {
      accuracy = calculateAccuracy(angle, sectorStartAngle, sectorArcDegrees);
      nextStreak = streak + 1;
      nextMaxStreak = Math.max(maxStreak, nextStreak);
      setStreak(nextStreak);
      setMaxStreak(nextMaxStreak);

      if (nextStreak >= 3) {
        sound.playStreak();
      } else {
        sound.playHit(nextStreak);
      }
      setFlashState('hit');
    } else {
      nextStreak = 0;
      setStreak(0);
      sound.playError();
      setFlashState('miss');
    }

    setTimeout(() => setFlashState(null), 220);

    const attempt: CycleAttempt = {
      cycleIndex: completedCycles + 1,
      isHit,
      accuracy,
      streakBonus: nextStreak >= 3,
      angleAtHit: Math.round(angle),
    };

    const nextAttempts = [...attempts, attempt];
    setAttempts(nextAttempts);

    const nextCompleted = completedCycles + 1;
    setCompletedCycles(nextCompleted);

    // Siirretään kohdesektoria seuraavaa sykliä varten (75° - 155° eteenpäin)
    const nextSectorStart = (sectorStartAngle + Math.floor(75 + Math.random() * 80)) % 360;
    setSectorStartAngle(nextSectorStart);

    if (nextCompleted >= maxCycles) {
      finishCalibration(nextAttempts, nextMaxStreak);
    }
  }, [
    isGameOver,
    showTutorial,
    isAngleInSector,
    sectorStartAngle,
    sectorArcDegrees,
    streak,
    maxStreak,
    completedCycles,
    attempts,
    maxCycles,
    calculateAccuracy,
    finishCalibration,
  ]);

  // React 19.2+ useEffectEvent: eristetään näppäinpainallus reaktiivisesta efektistä.
  // Näin globaalia window-kuuntelijaa ei tarvitse irrottaa ja kytkeä uudelleen joka renderöinnillä.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (showTutorial) {
        setShowTutorial(false);
      } else if (!isGameOver) {
        triggerHit();
      }
    } else if (e.key === 'Escape') {
      if (showTutorial) setShowTutorial(false);
    }
  });

  // Perusteltu useEffect: Globaali selaimen näppäimistökuuntelija (External DOM Event System)
  // Eristetty reaktiivisuudesta useEffectEventillä (onKeyDown), jolloin kuuntelija kytketään vain kerran.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Uudelleenkäynnistys
  const handleRestart = () => {
    startTimeRef.current = Date.now();
    setCompletedCycles(0);
    setStreak(0);
    setMaxStreak(0);
    setAttempts([]);
    setIsGameOver(false);
    setSubmissionResult(null);
    setSectorStartAngle(Math.floor(100 + Math.random() * 140));
  };

  const isInsideSectorNow = isAngleInSector(currentAngle, sectorStartAngle, sectorArcDegrees, 0);

  // SVG-kehän geometria (r=120, r_inner=70, r_wedge=95)
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const sectorArcLength = circumference * (sectorArcDegrees / 360);

  const wedgeRadius = 95;
  const wedgeCircumference = 2 * Math.PI * wedgeRadius;
  const wedgeArcLength = wedgeCircumference * (sectorArcDegrees / 360);

  const innerRadius = 70;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const innerArcLength = innerCircumference * (sectorArcDegrees / 360);

  const topScores = getScoresByMinigame('timing').slice(0, 5);

  // Arvioitu palkkio tarkastuspöytäkirjaan
  const grade = finalPrecision >= 85 ? 'perfect' : finalPrecision >= 55 ? 'good' : 'fail';
  const mult = finalPrecision >= 90 ? 1.25 : finalPrecision < 55 ? 0.4 : 0.85;
  const estimatedPay = Math.round(
    (gig.payMin + (gig.payMax - gig.payMin) * (finalPrecision / 100)) * mult
  );
  const estimatedXp = Math.max(10, Math.round(gig.tier * 45 * (finalPrecision / 100)));
  const estimatedRep = grade === 'fail' ? -5 : gig.reputationAward;

  return (
    <div
      ref={containerRef}
      className={`max-w-5xl mx-auto bg-zinc-900 border rounded-2xl p-6 space-y-6 transition-all ${
        flashState === 'hit'
          ? 'border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.2)]'
          : flashState === 'miss'
          ? 'border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.25)]'
          : 'border-zinc-800'
      }`}
    >
      {/* Yläpalkki (Instrument HUD) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              MITTALAITE // CALIBRATION RIG MK-IV
            </span>
            <span className="text-xs font-mono text-zinc-500">
              Aika: {elapsedSeconds.toFixed(1)}s
            </span>
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 mt-1">
            {gig.clientName} — Vaihetahdistus & synkronointi
          </h3>
        </div>

        {/* Keskimittarit */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-1.5">
            <span className="text-zinc-500">STAMINA:</span>
            <span className="text-emerald-400 font-semibold">{Math.round(player.stamina)}%</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-1.5">
            <span className="text-zinc-500">SYKLI:</span>
            <span className="text-zinc-100 font-semibold">
              {Math.min(maxCycles, completedCycles + 1)} / {maxCycles}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-1.5">
            <span className="text-zinc-500">PUTKI:</span>
            <span className={streak >= 3 ? 'text-amber-400 font-bold' : 'text-zinc-200'}>
              {streak}x {streak >= 3 ? '🔥' : ''}
            </span>
          </div>

          {/* Syklimäärän valinta ennen aloitusta */}
          {completedCycles === 0 && !isGameOver && (
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setMaxCycles(12)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  maxCycles === 12 ? 'bg-zinc-800 text-amber-400 font-semibold' : 'text-zinc-500'
                }`}
              >
                12 sykliä
              </button>
              <button
                onClick={() => setMaxCycles(24)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  maxCycles === 24 ? 'bg-zinc-800 text-amber-400 font-semibold' : 'text-zinc-500'
                }`}
              >
                24 sykliä (Pro)
              </button>
            </div>
          )}

          <button
            onClick={() => setShowTutorial(true)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Opas</span>
          </button>

          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-300 border border-zinc-800 transition-colors"
          >
            ✕ Keskeytä
          </button>
        </div>
      </div>

      {/* Vaihepalkki ja 24-LED etenemispalkki */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-amber-400 font-semibold">{currentPhaseTitle}</span>
          <span className="text-zinc-400">
            EDISTYMINEN: {completedCycles} / {maxCycles} SYKLIÄ
          </span>
        </div>

        <div
          className="grid gap-1.5 h-3 bg-zinc-900 p-1 rounded-lg border border-zinc-800"
          style={{ gridTemplateColumns: `repeat(${maxCycles}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: maxCycles }).map((_, idx) => {
            const isCurrent = idx === completedCycles && !isGameOver;
            const pastAttempt = attempts[idx];
            let bgClass = 'bg-zinc-800';
            if (isCurrent) bgClass = 'bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]';
            else if (pastAttempt?.isHit) bgClass = 'bg-emerald-500 shadow-[0_0_6px_#10b981]';
            else if (pastAttempt && !pastAttempt.isHit) bgClass = 'bg-rose-500';

            return <div key={idx} className={`rounded-xs transition-all ${bgClass}`} />;
          })}
        </div>
      </div>

      {/* Pikaopas-modaali */}
      {showTutorial && (
        <div className="p-5 bg-zinc-950 border border-amber-500/40 rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-amber-400 uppercase font-mono">
              Vaihetahdistuksen Pikaopas
            </span>
            <button
              onClick={() => setShowTutorial(false)}
              className="text-zinc-400 hover:text-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-zinc-300 leading-relaxed">
            Generaattorin ja valtakunnanverkon vaihekulmat pyörivät oskilloskoopilla. Paina{' '}
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-amber-300 font-mono">
              SPACE
            </kbd>{' '}
            (välilyöntiä) tai klikkaa lukituspainiketta täsmälleen silloin, kun pyörivä osoitin on
            vihreän/syaanin kohdesektorin sisällä.
          </p>
          <ul className="list-disc list-inside text-zinc-400 space-y-1">
            <li>
              <strong>Timantti keskellä sektoria:</strong> Antaa 100 % tarkkuuden (Sweet Spot).
            </li>
            <li>
              <strong>Putkibonus (Streak ≥ 3):</strong> Peräkkäiset osumat kasvattavat tulostaulun
              erikoispisteitä.
            </li>
            <li>
              <strong>Stamina & Oskilloskooppi:</strong> Korkea stamina ja työkalupäivitykset
              pitävät kohdesektorin leveämpänä.
            </li>
          </ul>
        </div>
      )}

      {!isGameOver ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Vasen / Keskus: Pyöreä SVG-oskilloskooppi & Laukaisin (7/12) */}
          <div className="lg:col-span-7 flex flex-col items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-5">
            {/* Pyöreä CRT-oskilloskooppikehä */}
            <div
              className={`relative w-72 h-72 sm:w-80 sm:h-80 rounded-full border-2 flex items-center justify-center transition-all ${
                isInsideSectorNow
                  ? 'border-emerald-400 shadow-[inset_0_0_40px_rgba(16,185,129,0.25),0_0_30px_rgba(16,185,129,0.2)]'
                  : 'border-zinc-800 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]'
              }`}
              style={{
                background: 'radial-gradient(circle, #0c1922 0%, #070a0f 100%)',
              }}
            >
              <svg viewBox="0 0 320 320" className="w-full h-full">
                {/* Ulompi kehä ja asteviivat 30° välein */}
                <circle cx="160" cy="160" r="140" fill="none" stroke="#27272a" strokeWidth="4" />
                <circle
                  cx="160"
                  cy="160"
                  r="120"
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.12)"
                  strokeWidth="8"
                />

                {Array.from({ length: 12 }).map((_, i) => {
                  const deg = i * 30;
                  const rad = ((deg - 90) * Math.PI) / 180;
                  const x1 = 160 + 132 * Math.cos(rad);
                  const y1 = 160 + 132 * Math.sin(rad);
                  const x2 = 160 + 120 * Math.cos(rad);
                  const y2 = 160 + 120 * Math.sin(rad);
                  return (
                    <line
                      key={deg}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#52525b"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* Kohdesektorin varjostettu kiila (r=95, strokeWidth=50) */}
                <circle
                  cx="160"
                  cy="160"
                  r={wedgeRadius}
                  fill="none"
                  stroke={
                    isInsideSectorNow ? 'rgba(16, 185, 129, 0.38)' : 'rgba(16, 185, 129, 0.16)'
                  }
                  strokeWidth="50"
                  transform={`rotate(${sectorStartAngle - 90}, 160, 160)`}
                  strokeDasharray={`${wedgeArcLength} ${wedgeCircumference - wedgeArcLength}`}
                />

                {/* Kohdesektorin ulkokaari (r=120) */}
                <circle
                  cx="160"
                  cy="160"
                  r={radius}
                  fill="none"
                  stroke={isInsideSectorNow ? '#ffffff' : '#10b981'}
                  strokeWidth={isInsideSectorNow ? '12' : '9'}
                  strokeLinecap="round"
                  transform={`rotate(${sectorStartAngle - 90}, 160, 160)`}
                  strokeDasharray={`${sectorArcLength} ${circumference - sectorArcLength}`}
                />

                {/* Kohdesektorin sisäkaari (r=70) */}
                <circle
                  cx="160"
                  cy="160"
                  r={innerRadius}
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.6)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform={`rotate(${sectorStartAngle - 90}, 160, 160)`}
                  strokeDasharray={`${innerArcLength} ${innerCircumference - innerArcLength}`}
                />

                {/* Sektorin alkuportti (Entry Gate) */}
                <g transform={`rotate(${sectorStartAngle - 90}, 160, 160)`}>
                  <line x1="230" y1="160" x2="280" y2="160" stroke="#34d399" strokeWidth="3" />
                  <circle cx="280" cy="160" r="4" fill="#ffffff" />
                </g>

                {/* Sektorin loppuportti (Exit Gate) */}
                <g transform={`rotate(${(sectorStartAngle + sectorArcDegrees - 90) % 360}, 160, 160)`}>
                  <line x1="230" y1="160" x2="280" y2="160" stroke="#f43f5e" strokeWidth="3" />
                  <circle cx="280" cy="160" r="4" fill="#ffffff" />
                </g>

                {/* Keskipisteen timantti (Sweet Spot) */}
                <g
                  transform={`rotate(${
                    (sectorStartAngle + sectorArcDegrees / 2 - 90) % 360
                  }, 160, 160)`}
                >
                  <polygon points="280,155 286,160 280,165 274,160" fill="#fbbf24" />
                </g>

                {/* Keskustan tähtäinristikko */}
                <g opacity={isInsideSectorNow ? 1 : 0.35}>
                  <circle
                    cx="160"
                    cy="160"
                    r="28"
                    fill="none"
                    stroke={isInsideSectorNow ? '#10b981' : '#71717a'}
                    strokeWidth="2"
                  />
                  <circle
                    cx="160"
                    cy="160"
                    r="38"
                    fill="none"
                    stroke={isInsideSectorNow ? '#34d399' : '#52525b'}
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                </g>

                {/* Pyörivä laserosoitin (0° = kello 12) */}
                <g transform={`rotate(${currentAngle}, 160, 160)`}>
                  <line
                    x1="160"
                    y1="160"
                    x2="160"
                    y2="35"
                    stroke={isInsideSectorNow ? '#ffffff' : '#f59e0b'}
                    strokeWidth={isInsideSectorNow ? '5' : '3'}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="160"
                    cy="35"
                    r={isInsideSectorNow ? '11' : '7'}
                    fill={isInsideSectorNow ? '#ffffff' : '#f59e0b'}
                  />
                </g>

                {/* Keskinapa */}
                <circle cx="160" cy="160" r="15" fill="#18181b" stroke="#3f3f46" strokeWidth="3" />
                <circle
                  cx="160"
                  cy="160"
                  r="6"
                  fill={isInsideSectorNow ? '#10b981' : '#f59e0b'}
                />
              </svg>

              {/* Digitaaliset lukemat oskilloskoopin alareunassa */}
              <div className="absolute bottom-5 flex items-center gap-3 bg-zinc-950/90 border border-zinc-800 px-3 py-1 rounded-md text-[11px] font-mono">
                <span>
                  <span className="text-zinc-500">KULMA: </span>
                  <span className="text-zinc-100 font-semibold">{Math.round(currentAngle)}°</span>
                </span>
                <span className="text-zinc-700">|</span>
                <span className={isInsideSectorNow ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                  {isInsideSectorNow ? '⚡ LUKITTAVISSA!' : '○ ODOTTAA'}
                </span>
                <span className="text-zinc-700">|</span>
                <span>
                  <span className="text-zinc-500">IKKUNA: </span>
                  <span className="text-zinc-200">{sectorArcDegrees}°</span>
                </span>
              </div>
            </div>

            {/* Suuri taktinen lukituspainike */}
            <button
              onClick={triggerHit}
              className={`w-full max-w-sm py-4 rounded-xl font-mono font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isInsideSectorNow
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-[1.02]'
                  : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {isInsideSectorNow
                  ? 'LUKITSE NYT! [ VÄLILYÖNTI ]'
                  : 'LUKITSE VAIHEKULMA [ VÄLILYÖNTI ]'}
              </span>
            </button>
          </div>

          {/* Oikea palsta: Anturilogi & Lajin tulostaulu (5/12) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Anturilogi */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                    Anturilogi ({attempts.length}/{maxCycles})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  Paras putki: {maxStreak}x
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                {attempts.length === 0 ? (
                  <p className="text-zinc-500 text-xs py-6 text-center">
                    Paina VÄLILYÖNTIÄ, kun osoitin osuu vihreälle sektorille...
                  </p>
                ) : (
                  [...attempts].reverse().map((att) => (
                    <div
                      key={att.cycleIndex}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg border ${
                        att.isHit
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <span>
                        #{att.cycleIndex} {att.isHit ? 'OSUMA' : 'HUDI'} ({att.angleAtHit}°)
                      </span>
                      <span className="font-semibold">
                        {att.isHit ? `${att.accuracy.toFixed(1)}%` : '0%'}{' '}
                        {att.streakBonus ? '🔥' : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lajin Tulostaulu (Top 5 Vaihetahdistus) */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                    Vaihetahdistus — Top 5 Tulostaulu
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                {topScores.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${
                      s.isPlayer
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-zinc-900/70 border-zinc-800/80 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-zinc-500 font-bold w-4">#{idx + 1}</span>
                      <div className="truncate">
                        <span className="font-sans font-medium block truncate">
                          {s.playerName} {s.isPlayer ? '(Sinä)' : ''}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">{s.details}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-amber-400 font-bold block">{s.score} p</span>
                      <span className="text-[10px] text-zinc-500">
                        {s.precision.toFixed(1)}% · {s.durationSeconds}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* HUOLTOTEHTÄVÄN TARKASTUSPÖYTÄKIRJA & TULOSTAULUSijoitus */
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div className="text-center space-y-2 border-b border-zinc-800 pb-5">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-md border-2 border-dashed font-mono font-bold text-sm tracking-widest uppercase border-amber-400 text-amber-400 bg-amber-500/10">
              {grade.toUpperCase()}
            </div>
            <h4 className="text-lg font-bold text-zinc-100">
              HUOLTOTEHTÄVÄN TARKASTUSPÖYTÄKIRJA
            </h4>
            <p className="text-xs font-mono text-zinc-400">
              {maxCycles} SYKLIN KALIBROINTISARJA VALMIS · {gig.clientName}
            </p>

            {submissionResult && (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold">
                  🏆 Tulostaulusijoitus: #{submissionResult.rank} ({submissionResult.entry.score} pistettä)
                </span>
                {submissionResult.isNewPersonalBest && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold">
                    ★ UUSI OMA ENNÄTYS!
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block">KOKONAISTARKKUUS</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                {finalPrecision.toFixed(1)} %
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block">HYVÄKSYTYT SYKLIT</span>
              <span className="text-base font-bold text-zinc-100 mt-0.5 block">
                {attempts.filter((a) => a.isHit).length} / {maxCycles}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block">PISIN PUTKI (STREAK)</span>
              <span className="text-base font-bold text-amber-400 mt-0.5 block">
                {maxStreak}x {maxStreak >= 3 ? '🔥' : ''}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block">URAKKAPALKKIO</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                +{estimatedPay} €
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block">KOKEMUSPISTEET</span>
              <span className="text-base font-bold text-amber-400 mt-0.5 block">
                +{estimatedXp} XP
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block">MAINEVAIKUTUS</span>
              <span
                className={`text-base font-bold mt-0.5 block ${
                  estimatedRep >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {estimatedRep >= 0 ? `+${estimatedRep}` : estimatedRep} REP
              </span>
            </div>
          </div>

          {/* Päivitetty Tulostaulu */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-2">
            <span className="text-xs font-mono uppercase text-zinc-400 font-semibold block">
              Vaihetahdistuksen Top 5 Tulostaulu
            </span>
            <div className="space-y-1 font-mono text-xs">
              {topScores.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between px-3 py-1.5 rounded ${
                    s.id === submissionResult?.entry.id
                      ? 'bg-amber-500/20 border border-amber-400 text-amber-200 font-bold'
                      : 'bg-zinc-950/60 text-zinc-300'
                  }`}
                >
                  <span>
                    #{i + 1} {s.playerName} ({s.details})
                  </span>
                  <span className="text-amber-400">
                    {s.score} p ({s.precision.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              onClick={handleRestart}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Yritä uudelleen</span>
            </button>
            <button
              onClick={() => onComplete(finalPrecision)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Hyväksy ja kuittaa palkkio (+{estimatedPay} €)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
