import React, { useEffect, useState, Activity } from 'react';
import { useGameStore } from './store/useGameStore';
import { TIMEFRAME_CONFIG } from './types/market';
import { useEffectEvent } from './hooks/useEffectEvent';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { WorkstationView } from './components/WorkstationView';
import { GigMarketView } from './components/GigMarketView';
import { WeekCalendarView } from './components/WeekCalendarView';
import { CompanyLoanView } from './components/CompanyLoanView';
import { UpgradesView } from './components/UpgradesView';
import { MarketView } from './components/MarketView';
import { GameOverModal } from './components/GameOverModal';
import { ArchitectureModal } from './components/ArchitectureModal';

export const App: React.FC = () => {
  const { activeTab, selectedTimeframe, tickMarketPrices } = useGameStore();
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);

  // React 19.2+ useEffectEvent: eristetään tapahtumakutsu reaktiivisesta efektistä.
  // Näin efektin ei tarvitse käynnistyä uudelleen, vaikka store-funktio tai tila vaihtuisi.
  const onMarketTick = useEffectEvent((seconds: number, tf: typeof selectedTimeframe) => {
    if (tickMarketPrices) {
      tickMarketPrices(seconds, tf);
    }
  });

  // Perusteltu useEffect: Pörssikynttilöiden taustapäivityssilmukka (External Timer System)
  // Guardrails: Ainoa riippuvuus on selectedTimeframe (joka määrää ajastimen syklin pituuden).
  // Tikin logiikka on eristetty useEffectEventillä (onMarketTick), ja siivous estää päällekkäiset ajastimet.
  useEffect(() => {
    const tfConfig = TIMEFRAME_CONFIG[selectedTimeframe || '5m'];
    const intervalMs = tfConfig.realTimeSeconds * 1000;

    const marketInterval = setInterval(() => {
      onMarketTick(tfConfig.realTimeSeconds, selectedTimeframe);
    }, intervalMs);

    return () => clearInterval(marketInterval);
  }, [selectedTimeframe]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header onOpenArchitecture={() => setIsArchitectureOpen(true)} />
      <NavigationTabs />

      {/* React 19.2+ <Activity>: säilyttää jokaisen näkymän DOM- ja UI-tilan
          (kuten pörssin suodattimet, indikaattorikytkimet ja syötetyt kauppamäärät)
          muistissa välilehteä vaihdettaessa, mutta siivoaa piilotettujen näkymien efektit. */}
      <main className="px-6 pb-20">
        <Activity mode={activeTab === 'workstation' ? 'visible' : 'hidden'}>
          <div style={{ display: activeTab === 'workstation' ? 'block' : 'none' }}>
            <WorkstationView />
          </div>
        </Activity>

        <Activity mode={activeTab === 'gigs' ? 'visible' : 'hidden'}>
          <div style={{ display: activeTab === 'gigs' ? 'block' : 'none' }}>
            <GigMarketView />
          </div>
        </Activity>

        <Activity mode={activeTab === 'calendar' ? 'visible' : 'hidden'}>
          <div style={{ display: activeTab === 'calendar' ? 'block' : 'none' }}>
            <WeekCalendarView />
          </div>
        </Activity>

        <Activity mode={activeTab === 'company' ? 'visible' : 'hidden'}>
          <div style={{ display: activeTab === 'company' ? 'block' : 'none' }}>
            <CompanyLoanView />
          </div>
        </Activity>

        <Activity mode={activeTab === 'market' ? 'visible' : 'hidden'}>
          <div style={{ display: activeTab === 'market' ? 'block' : 'none' }}>
            <MarketView />
          </div>
        </Activity>

        <Activity mode={activeTab === 'upgrades' ? 'visible' : 'hidden'}>
          <div style={{ display: activeTab === 'upgrades' ? 'block' : 'none' }}>
            <UpgradesView />
          </div>
        </Activity>
      </main>

      <GameOverModal />
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />
    </div>
  );
};

export default App;
