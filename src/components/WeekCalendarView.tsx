import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { sound } from '../services/soundService';
import { TransactionRecord } from '../types/game';
import { INITIAL_WEEK_DAYS } from '../data/initialData';
import { CheckCircle2, Coffee, ChevronRight, FileText } from 'lucide-react';

const CATEGORY_LABELS: Record<TransactionRecord['category'], string> = {
  click_labor: 'Verstastyö',
  gig_completion: 'Keikkalaskutus',
  passive_revenue: 'Päivätilitys',
  upgrade: 'Investointi',
  debt_service: 'Rahoitus & Laina',
  salary: 'Henkilöstökulut',
  living: 'Elinkustannukset',
};

export const WeekCalendarView: React.FC = () => {
  const {
    week,
    dayOfWeek,
    weekSchedule,
    advanceDay,
    setActiveTab,
    transactions,
    getDailyPassiveBreakdown,
    hasCompanyBought,
  } = useGameStore();

  const [dayBanner, setDayBanner] = useState<string | null>(null);

  const handleAdvance = () => {
    sound.playClick();
    const res = advanceDay();
    setDayBanner(res.message);
  };

  const passiveBreakdown = getDailyPassiveBreakdown
    ? getDailyPassiveBreakdown(dayOfWeek)
    : { upgradeDailyEur: 0, teamDailyEur: 0, totalDailyEur: 0, isWorkday: true };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Viikkokalenteri, päivätilitys ja tilikirja
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Viikko {week} · Sopimus- ja tiimituotot kirjataan tilikirjaan aina työpäivän päättyessä.
          </p>
        </div>

        <button
          onClick={handleAdvance}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors shrink-0"
        >
          <span>Päätä päivä ({dayOfWeek})</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {dayBanner && (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-200 flex items-center justify-between">
          <span>{dayBanner}</span>
          <button
            onClick={() => setDayBanner(null)}
            className="text-zinc-500 hover:text-zinc-300 ml-4 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Viikon päivät */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {INITIAL_WEEK_DAYS.map((day) => {
          const slot = weekSchedule[day];
          const isCurrent = dayOfWeek === day;
          const isCompleted = !!slot?.result;

          return (
            <div
              key={day}
              className={`p-4 rounded-xl border flex flex-col justify-between min-h-[140px] transition-all ${
                isCurrent
                  ? 'border-amber-400 bg-zinc-900 ring-1 ring-amber-400/50'
                  : 'border-zinc-800 bg-zinc-900/40'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isCurrent ? 'text-amber-400' : 'text-zinc-400'
                    }`}
                  >
                    {day}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-amber-300">Tänään</span>
                  )}
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>

                <div className="text-xs">
                  {slot?.type === 'gig' ? (
                    <div className="space-y-1">
                      <span className="text-zinc-300 font-medium line-clamp-2">
                        {slot.title || 'Asennuskeikka'}
                      </span>
                      {slot.result && (
                        <div className="text-[11px] font-mono tabular-nums text-emerald-400">
                          +{slot.result.payEarned} €
                        </div>
                      )}
                    </div>
                  ) : slot?.type === 'rest' ? (
                    <div className="flex items-center gap-1.5 text-zinc-500 pt-1">
                      <Coffee className="w-3.5 h-3.5" />
                      <span>Lepo & palautuminen</span>
                    </div>
                  ) : (
                    <span className="text-zinc-600 italic">Vapaa</span>
                  )}
                </div>
              </div>

              <div className="pt-2">
                {isCurrent && slot?.type === 'gig' && !slot.result && (
                  <button
                    onClick={() => setActiveTab('workstation')}
                    className="w-full py-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 text-left transition-colors"
                  >
                    Suorita työpisteellä →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Päivän automaatio- ja tiimilaskutuksen erittely */}
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-100">
              Päivän sopimus- ja tiimilaskutus ({dayOfWeek})
            </h3>
            <p className="text-xs text-zinc-400">
              Rahat eivät enää raksuta sekuntilaskurilla taustalla, vaan tilitetään kootusti tilikirjaan, kun päätät päivän.
            </p>
          </div>
          <button
            onClick={handleAdvance}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-lg transition-colors shrink-0"
          >
            Päätä päivä ja tilitä (+{passiveBreakdown.totalDailyEur.toFixed(0)} €)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-mono tabular-nums pt-1">
          <div>
            <span className="text-zinc-500 font-sans block">Sopimukset & kalustoautomaatio</span>
            <span className="text-zinc-200 font-semibold text-sm">
              +{passiveBreakdown.upgradeDailyEur.toFixed(2)} € / pv
            </span>
          </div>
          <div>
            <span className="text-zinc-500 font-sans block">
              Yrityksen asentajatiimi ({passiveBreakdown.isWorkday ? 'Arkipäivä MA–PE' : 'Viikonloppuvapaa'})
            </span>
            <span className="text-zinc-200 font-semibold text-sm">
              {hasCompanyBought
                ? `+${passiveBreakdown.teamDailyEur.toFixed(2)} € / pv`
                : '0,00 € (Yksinyrittäjä)'}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 font-sans block">Tämän päivän koontitilitys</span>
            <span className="text-emerald-400 font-semibold text-sm">
              +{passiveBreakdown.totalDailyEur.toFixed(2)} €
            </span>
          </div>
        </div>
      </div>

      {/* Tilikirja & Kassavirtaerittely (Ledger) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Tilikirja ja kassavirtaloki (Ledger)
            </h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono tabular-nums">
            Viimeisimmät {transactions.length} tapahtumaa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-2.5 pr-4 font-medium">Aika</th>
                <th className="py-2.5 pr-4 font-medium">Lähde / Kategoria</th>
                <th className="py-2.5 pr-4 font-medium">Selite</th>
                <th className="py-2.5 pr-4 font-medium text-right">Muutos (€)</th>
                <th className="py-2.5 font-medium text-right">Kassa jälkeen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono tabular-nums">
              {transactions.map((tx) => {
                const isPositive = tx.amount >= 0;
                return (
                  <tr key={tx.id} className="hover:bg-zinc-950/50 transition-colors">
                    <td className="py-2.5 pr-4 text-zinc-400 whitespace-nowrap">
                      Vk {tx.week} · {tx.day}
                    </td>
                    <td className="py-2.5 pr-4 font-sans text-zinc-300 whitespace-nowrap">
                      {CATEGORY_LABELS[tx.category] || tx.category}
                    </td>
                    <td className="py-2.5 pr-4 font-sans text-zinc-400">{tx.description}</td>
                    <td
                      className={`py-2.5 pr-4 text-right font-medium whitespace-nowrap ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {tx.amount.toLocaleString('fi-FI', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      €
                    </td>
                    <td className="py-2.5 text-right text-zinc-200 whitespace-nowrap">
                      {tx.balanceAfter.toLocaleString('fi-FI', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      €
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
