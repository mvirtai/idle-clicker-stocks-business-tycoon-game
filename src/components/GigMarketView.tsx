import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../services/soundService';
import { DayOfWeek, Gig } from '../types/game';
import { INITIAL_WEEK_DAYS } from '../data/initialData';
import {
  Check,
  Lock,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  BatteryCharging,
  X,
} from 'lucide-react';

export const GigMarketView: React.FC = () => {
  const {
    availableGigs,
    player,
    setActiveTab,
    dayOfWeek,
    weekSchedule,
    completedGigIdsThisWeek,
    getGigResourceRequirements,
    scheduleGigInCalendar,
    unscheduleGigFromDay,
  } = useGameStore();

  const [bookingFeedback, setBookingFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleBookGig = (gig: Gig, preferredDay?: DayOfWeek) => {
    sound.playClick();
    const res = scheduleGigInCalendar(gig.id, preferredDay);
    setBookingFeedback({ success: res.success, message: res.message });
    if (res.success && res.assignedDays.includes(dayOfWeek)) {
      // Jos keikka varattiin tälle päivälle, pelaaja voi siirtyä suoraan työpisteelle
    }
  };

  const handleUnschedule = (day: DayOfWeek) => {
    sound.playClick();
    const res = unscheduleGigFromDay(day);
    setBookingFeedback({ success: res.success, message: res.message });
  };

  // Etsitään vapaat arkipäivät (MA-PE), joille voi tarvittaessa kohdistaa varauksen
  const freeWorkdays = INITIAL_WEEK_DAYS.filter(
    (d) => d !== 'LA' && d !== 'SU' && weekSchedule[d]?.type === 'empty'
  );

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Keikkapörssi ja kalenterivaraukset
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Sovi asiakaskeikat viikkokalenteriin. Jokaisen toimeksiannon voi suorittaa kerran viikossa, ja se kuluttaa Staminaa sekä pelikelloa.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('calendar')}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium rounded-xl flex items-center gap-2 transition-colors shrink-0"
        >
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>Avaa viikkokalenteri ({freeWorkdays.length} vapaata arkipäivää)</span>
        </button>
      </div>

      {bookingFeedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            bookingFeedback.success
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{bookingFeedback.message}</span>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            {bookingFeedback.success && (
              <button
                onClick={() => setActiveTab('workstation')}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg text-[11px] transition-colors"
              >
                Työpisteelle →
              </button>
            )}
            <button
              onClick={() => setBookingFeedback(null)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {availableGigs.map((gig) => {
          const meetsRep = player.personalRep >= gig.requiredRep;
          const meetsCerts = gig.requiredCerts.every((cert) =>
            player.certifications.includes(cert)
          );
          const canAccept = meetsRep && meetsCerts;
          const isCompletedThisWeek = completedGigIdsThisWeek.includes(gig.id);

          // Tarkistetaan, mille päiville keikka on varattu kuluvalla viikolla
          const scheduledDays = INITIAL_WEEK_DAYS.filter(
            (d) => weekSchedule[d]?.type === 'gig' && weekSchedule[d]?.gigId === gig.id
          );
          const uncompletedScheduledDays = scheduledDays.filter(
            (d) => !weekSchedule[d]?.result
          );
          const isScheduledToday = uncompletedScheduledDays.includes(dayOfWeek);
          const isAlreadyBooked = uncompletedScheduledDays.length > 0;

          const reqs = getGigResourceRequirements(gig);

          return (
            <div
              key={gig.id}
              className={`p-6 rounded-2xl border transition-all ${
                isScheduledToday
                  ? 'border-amber-400/80 bg-zinc-900/90 shadow-sm'
                  : isCompletedThisWeek
                  ? 'border-emerald-500/30 bg-zinc-900/20 opacity-75'
                  : isAlreadyBooked
                  ? 'border-zinc-700 bg-zinc-900/70'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm font-semibold text-zinc-100">{gig.clientName}</span>
                    <span className="text-[11px] font-mono text-zinc-500">Tier {gig.tier}</span>

                    {isCompletedThisWeek && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Suoritettu tällä viikolla</span>
                      </span>
                    )}

                    {!isCompletedThisWeek && isAlreadyBooked && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">
                        Kalenterissa: {uncompletedScheduledDays.join(', ')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">{gig.description}</p>

                  {/* Palkkio ja resurssivaatimukset */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500 pt-1">
                    <div>
                      Palkkio:{' '}
                      <span className="font-mono text-amber-400 font-medium">
                        {gig.payMin} – {gig.payMax} €
                      </span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>
                        Kesto:{' '}
                        <strong className="text-zinc-300 font-mono">
                          {gig.durationDays} pv ({reqs.durationHours} h/pv)
                        </strong>
                      </span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <BatteryCharging className="w-3.5 h-3.5 text-rose-400" />
                      <span>
                        Stamina:{' '}
                        <strong className="text-zinc-300 font-mono">
                          -{reqs.staminaCost}% / pv
                        </strong>
                      </span>
                    </div>
                    <span>·</span>
                    <div>
                      Maine: <span className="text-zinc-300 font-mono">+{gig.reputationAward}</span>
                    </div>
                  </div>

                  {/* Vaatimukset */}
                  {(gig.requiredRep > 0 || gig.requiredCerts.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <span className="text-zinc-500">Vaatimukset:</span>
                      {gig.requiredRep > 0 && (
                        <span className={meetsRep ? 'text-zinc-400' : 'text-rose-400'}>
                          Maine {gig.requiredRep}{' '}
                          {meetsRep ? '✓' : `(sinulla: ${player.personalRep})`}
                        </span>
                      )}
                      {gig.requiredCerts.map((c) => (
                        <span
                          key={c}
                          className={`flex items-center gap-1 ${
                            player.certifications.includes(c)
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Toimintopainikkeet kalenterivaraukselle */}
                <div className="shrink-0 pt-2 sm:pt-0 flex flex-col sm:items-end gap-2">
                  {!canAccept ? (
                    <button
                      disabled
                      className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800/60 text-zinc-500 cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Vaatimukset puuttuvat</span>
                    </button>
                  ) : isCompletedThisWeek ? (
                    <button
                      disabled
                      className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-800 text-emerald-400 cursor-default flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Urakka valmis (1/1 vk)</span>
                    </button>
                  ) : isAlreadyBooked ? (
                    <div className="flex items-center gap-2">
                      {isScheduledToday && (
                        <button
                          onClick={() => setActiveTab('workstation')}
                          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 transition-colors"
                        >
                          <span>Suorita ({dayOfWeek})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleUnschedule(uncompletedScheduledDays[0])}
                        className="px-3 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-300 text-zinc-300 flex items-center gap-1 transition-colors"
                        title="Peruuta kalenterivaraus ja vapauta päivät"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Peru varaus</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBookGig(gig)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Varaa kalenteriin ({gig.durationDays} pv)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
