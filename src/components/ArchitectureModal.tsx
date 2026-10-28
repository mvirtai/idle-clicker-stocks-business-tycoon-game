import React from 'react';
import { X, Code2, Server, Laptop, Cpu, BookOpen, TrendingUp, Layers, Sparkles } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full p-8 space-y-6 my-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-zinc-100">Senioriarkkitehdin Muistio & Arkkitehtuurikatsaus</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-xs text-zinc-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-2">
          {/* Osa 1: Miksi Go ja TypeScript yhdessä? */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>1. Vastuunjako: Go-taustamoottori vs. TypeScript-käyttöliittymä</span>
            </h4>
            <p>
              Tässä projektissa yhdistimme kaksi kieltä niiden parhailla osa-alueilla:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Go (backend/internal/engine):</strong> Vastaa deterministisestä taloussimulaatiosta, viikoittaisista velkakoroista ja transaktioista. Gon gorutiinit ja vahva tyypitys takaavat pienen muistijalanjäljen ja tarkan suoritusnopeuden.
              </li>
              <li>
                <strong className="text-zinc-200">TypeScript (src/):</strong> Vastaa reaktiivisesta käyttöliittymästä, 60fps-minipeleistä ja Web Audio API -äänistä. TypeScriptin ansiosta UI reagoi alle millisekunnissa ilman verkkolatenssia.
              </li>
            </ul>
          </section>

          {/* Osa 2: Liukulukujen tarkkuus ja senttivirheet */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>2. IEEE 754 Liukulukuongelma (Floating-Point Drift)</span>
            </h4>
            <p>
              Perinteisessä JavaScriptissä <code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">0.1 + 0.2 === 0.30000000000000004</code>. Rahapeleissä tämä aiheuttaa kumuloituvia senttivirheitä.
            </p>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300">
              <div className="text-zinc-500">// Arkkitehtuuriratkaisu: Jokainen rahansiirto pyöristetään 2 desimaaliin</div>
              <div>const newCash = Math.round((currentCash + delta) * 100) / 100;</div>
            </div>
          </section>

          {/* Osa 3: Eksponentiaalinen kustannuskäyrä */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>3. Eksponentiaalinen kustannuskäyrä klikkeripeleissä</span>
            </h4>
            <p>
              Jos päivitysten hinnat kasvaisivat lineaarisesti, pelaaja saisi liian nopeasti äärettömän kassavirran. Siksi käytämme vakiintunutta kaavaa:
            </p>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300">
              <div className="text-zinc-500">// Kaava: BaseCost * (CostMultiplier ^ Level)</div>
              <div>const cost = Math.round(baseCost * Math.pow(1.45, currentLevel));</div>
            </div>
          </section>

          {/* Osa 4: Vakuusriskin kaava */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-rose-400" />
              <span>4. Kodin panttiriski (Collateral Risk Calculation)</span>
            </h4>
            <p>
              Pelin dramaattisin mekaniikka perustuu suoraan suhteeseen jäljellä olevan lainapääoman ja kodin kiinteän vakuusarvon (180 000 €) välillä:
            </p>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300">
              <div>collateralRiskPercent = (principal / homeCollateralValue) * 100;</div>
              <div className="text-zinc-500">// 45 000 € / 180 000 € = 25.0 % aloitusriski. 3 rästiä = konkurssi.</div>
            </div>
          </section>

          {/* Osa 5: Pörssi, Moniaikajänteinen OHLC-arkkitehtuuri ja Sisäpiirivihjeet */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>5. Trader-arkkitehtuuri: Moniaikajänteinen OHLC-aggregaatio (1m – 1d)</span>
            </h4>
            <p>
              Sen sijaan että kurssikäyrä pomppisi levottomasti sekunnin välein, pörssimoottori käyttää TradingView-tyylistä <strong>Timeframe Bucketing</strong> -mallia (<code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">1m, 5m, 10m, 30min, 60min, 3h, 1d</code>). Jokainen aikajänne ylläpitää omaa <code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">OHLCCandle[]</code>-sarjaansa (Open, High, Low, Close, Volume, SMA-20, EMA-9):
            </p>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300">
              <div className="text-zinc-500">// Volatiliteetin neliöjuuriskaalaus aikajänteen mukaan: σ(Δt) = σ_0 * volatilityScale</div>
              <div>const scaledVol = asset.volatility * TIMEFRAME_CONFIG[activeTf].volatilityScale;</div>
            </div>
            <p className="text-zinc-400">
              Päivityssykli noudattaa valittua aikajännettä (sekä pelin sisäisiä keikkoja ja päivänvaihtoja), ja keikoilta saadut <strong>sisäpiirivihjeet (Intel)</strong> auttavat ennakoimaan tulevat uutiskatalyytit.
            </p>
          </section>

          {/* Osa 6: React 19.2+ & React Compiler -arkkitehtuuri */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>6. React 19.2+ & React Compiler: useActionState, useEffectEvent & &lt;Activity&gt;</span>
            </h4>
            <p className="text-zinc-400">
              Koodipohja on modernisoitu noudattamaan React 19.2+ -julkaisun ja React Compilerin tiukkoja periaatteita:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 pl-1">
              <li>
                <strong className="text-zinc-200">React Compiler (Auto-memoization):</strong> Vite-putkessa toimiva <code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">babel-plugin-react-compiler</code> analysoi komponenttien renderöintipuhtauden ja memoizoi raskaat laskennat (kuten 36 kynttilän SVG-koordinaatit ja SMA/EMA-käyrät) automaattisesti ilman <code className="text-zinc-400 font-mono text-[11px]">useMemo</code>/<code className="text-zinc-400 font-mono text-[11px]">useCallback</code>-koodia.
              </li>
              <li>
                <strong className="text-zinc-200">useActionState (Lomakkeet & Toiminnot):</strong> Pörssikauppa, lainanlyhennykset ja Google Slides -vienti hallitsevat Transition- ja odotustilat (<code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">isPending</code>) atomaarisesti ilman manuaalisia <code className="text-zinc-400 font-mono text-[11px]">useState(isLoading)</code> -lippuja.
              </li>
              <li>
                <strong className="text-zinc-200">useEffect-ketjut ovat ehdoton Anti-Pattern:</strong> Tilan synkronointi tai tapahtumien ketjuttaminen (<code className="text-zinc-400 font-mono text-[11px]">state A → useEffect → setState B</code>) aiheuttaa tuplarenderöintejä, vanhentuneita sulkeumia ja kilpajuoksuja. Johdettu tila lasketaan aina suoraan renderöinnissä ja käyttäjän toiminnot suoritetaan tapahtumankäsittelijöissä tai <code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">useActionState</code>-funktiossa.
              </li>
              <li>
                <strong className="text-zinc-200">Perusteltu useEffect + useEffectEvent:</strong> Kun <code className="text-zinc-400 font-mono text-[11px]">useEffect</code> on aidosti paras ratkaisu ulkoisen järjestelmän synkronointiin (kuten <code className="text-zinc-400 font-mono text-[11px]">App.tsx</code>-ajastimet tai <code className="text-zinc-400 font-mono text-[11px]">TimingMinigame.tsx</code> <code className="text-zinc-400 font-mono text-[11px]">requestAnimationFrame</code>), sen käyttö on sallittua tiukoilla suojakaiteilla: nolla dominoefektiä, pakollinen <code className="text-zinc-400 font-mono text-[11px]">cleanup</code>-palautus sekä tikin eristäminen <code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">useEffectEvent</code>-koukulla.
              </li>
              <li>
                <strong className="text-zinc-200">&lt;Activity&gt;:</strong> Päänäkymät säilyttävät paikallisen UI-tilansa (esim. pörssin aktiiviset indikaattorit ja syötteet) välilehden vaihdon yli ilman, että taustalla suoritetaan turhia efektejä.
              </li>
            </ul>
          </section>

          {/* Osa 7: Exhaustive Switch & Stamina-portitettu tilakone */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>7. Exhaustive Switch (never) & Resurssiportitettu tilakone</span>
            </h4>
            <p className="text-zinc-400">
              Toimintojen reitityksessä (kuten minipelien valinnassa ja <code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">useActionState</code>-dispatchereissa) suosimme Go- ja TypeScript-maailman <strong>Discriminated Union + Exhaustive Switch</strong> -konventiota, jossa <code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">default: const _exhaustiveCheck: never = x</code> takaa käännösaikaisesti, ettei yksikään tila unohdu.
            </p>
            <p className="text-zinc-400">
              Lisäksi pörssin <code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">+1 kynttilä</code> -toiminto on suojattu <em>Infinite Reroll Exploitilta</em> kytkemällä se keskitettyyn <code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">getEffectiveStaminaCost</code>-laskimeen, jota hahmon taso, pajan työkalut ja yrityksen tiimi keventävät (max -75 %).
            </p>
          </section>

          {/* Osa 8: Hahmonkehityksen erikoistumispuut (Perk Trees) */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>8. Hahmonkehityksen erikoistumispuut (Perk Trees) & Puhtaat Valitsimet</span>
            </h4>
            <p className="text-zinc-400">
              Hahmon tasonnousut kerryttävät taitopisteitä (<code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">perkPoints</code>), joilla pelaaja voi erikoistua kahdessa toisiaan täydentävässä haarassa:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-amber-400 font-semibold">1. Kenttämestari (Field Specialist):</span>
                <p className="text-zinc-400">
                  Parantaa verstaalla manuaaliasennuksen tuottoa (+25 %) ja staminasäästöä, kasvattaa minipelien toleransseja ja mahdollistaa teollisuuskeikoilta arvokkaiden ylijäämäkomponenttien talteenoton (+50–150 € käteisenä) sekä +50 % maine-bonuksen.
                </p>
              </div>
              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-cyan-400 font-semibold">2. Pörssihai (Market Analyst):</span>
                <p className="text-zinc-400">
                  Leikkaa markkinakynttilöiden manuaalisen kelauksen staminakulua (-40 %), tuplaa keikoilta saatavien sisäpiirivihjeiden todennäköisyyden ja tuo pörssiosakkeiden myyntiin +6 % arbitraasimarginaalin ilman transaktiokuluja.
                </p>
              </div>
            </div>
            <p className="text-zinc-400 text-xs">
              <strong>Arkkitehtuurinen opetus:</strong> Logiikka on eriytetty puhtaisiin valitsinfunktioihin (<code className="text-zinc-300 font-mono">hasPerk</code>, <code className="text-zinc-300 font-mono">canUnlockPerk</code>) ja katalogiin (<code className="text-zinc-300 font-mono">PERK_CATALOG</code>). Pelaajatilaan tallennetaan vain avattujen ID:iden lista (<code className="text-zinc-300 font-mono">unlockedPerks: PerkId[]</code>). Tämä tekee tilasta kevyen, serialisoitavan ja mahdollistaa helpon nollauksen (<code className="text-zinc-300 font-mono">respecPerks</code>) ilman sivuvaikutusketjuja.
            </p>
          </section>

          {/* Osa 9: Tapahtumapohjainen päivätilitys ja Tilikirjan koonti (Ledger Coalescing) */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>9. Tapahtumapohjainen päivätilitys & Tilikirjan koonti (Ledger Pattern)</span>
            </h4>
            <p className="text-zinc-400">
              Miksi reaaliaikainen <code className="text-amber-300 bg-zinc-950 px-1 py-0.5 rounded">setInterval(1000ms)</code> -kassalaskuri on arkkitehtuurivirhe vuoropohjaisessa taloussimulaatiossa?
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Yksi totuuden lähde ajalle (Single Source of Truth):</strong> Kun pelin kulut (viikkopalkat ja pankkilainan korot) veloitetaan pelikellon päivä- ja viikkosiirtymissä (<code className="text-zinc-300 font-mono">advanceDay</code>), myös sopimus- ja tiimituottojen täytyy noudattaa samaa pelikelloa (<code className="text-zinc-300 font-mono">processDailyPassiveIncome</code>).
              </li>
              <li>
                <strong className="text-zinc-200">Reunaehtojen suojaus (Guard Clauses):</strong> Peli käynnistyy puhtaasti yksinyrittäjänä (<code className="text-zinc-300 font-mono">0 €/pv</code> passiivituotto), ja asentajatiimin laskutus aktivoituu vasta, kun <code className="text-zinc-300 font-mono">hasCompanyBought === true</code> ja kyseessä on arkipäivä (<code className="text-zinc-300 font-mono">MA–PE</code>).
              </li>
              <li>
                <strong className="text-zinc-200">Täydellinen auditointipolku (Ledger Coalescing):</strong> Jokainen päivän vaihtuessa maksettava sopimus- ja tiimierä kirjataan suoraan <code className="text-zinc-300 font-mono">TransactionRecord</code>-tilikirjaan, ja saman päivän peräkkäiset manuaalityöt yhdistetään (coalesce) yhdeksi selkeäksi päiväriviksi.
              </li>
            </ul>
          </section>
        </div>

        <div className="pt-2 border-t border-zinc-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
          >
            Sulje muistio
          </button>
        </div>
      </div>
    </div>
  );
};
