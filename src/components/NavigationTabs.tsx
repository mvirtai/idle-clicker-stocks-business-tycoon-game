import React from 'react';
import { useGameStore, ActiveTab } from '../store/useGameStore';
import { Wrench, Briefcase, Calendar, Building2, Sparkles, TrendingUp } from 'lucide-react';

export const NavigationTabs: React.FC = () => {
  const { activeTab, setActiveTab, hasCompanyBought, loan, player } = useGameStore();

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; indicator?: string }[] = [
    {
      id: 'workstation',
      label: 'Työpiste',
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      id: 'gigs',
      label: 'Keikat',
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      id: 'calendar',
      label: 'Kalenteri',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'company',
      label: hasCompanyBought ? 'Yritys & Laina' : 'Yrityskauppa',
      icon: <Building2 className="w-4 h-4" />,
      indicator: loan?.missedPayments > 0 ? `${loan.missedPayments} rästiä` : undefined,
    },
    {
      id: 'market',
      label: 'Pörssi & Raaka-aineet',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'upgrades',
      label: 'Taidot & Kalusto',
      icon: <Sparkles className="w-4 h-4" />,
      indicator: player?.perkPoints > 0 ? `${player.perkPoints} TP` : undefined,
    },
  ];

  return (
    <nav className="max-w-6xl mx-auto px-6 pt-6 pb-2">
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.indicator && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                  {tab.indicator}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
