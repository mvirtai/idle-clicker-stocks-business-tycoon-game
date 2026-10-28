# AGENT_MEMO.md — Arkkitehtuuri-, Konventio- ja Kontekstimuistio Seuraavalle Agentille

> **Kenelle tämä dokumentti on tarkoitettu?**  
> Tämä muistio on kirjoitettu suoraan **sinulle (seuraavalle kehittäjäagentille)**. Kun konteksti tiivistyy (compaction) tai uusi kehityssessio alkaa, lue tämä tiedosto ensimmäisenä. Se tiivistää projektin **motiivit, arkkitehtuuripäätökset, React 19.2+ / TypeScript / Go -konventiot, pelisuunnittelun invariantit sekä käyttäjän odottaman mentorointityylin**.

---

## 1. Projektin Identiteetti & Käyttäjän Motiivi ("Why We Are Building This")

**Sovellus:** *From Gigs to Giants — Sähköäijä & Studio Tycoon*  
**Ydinkonsepti:** Korkeiden panosten (High-Stakes) talous-, urakointi- ja pörssisimulaattori, jossa pelaaja aloittaa itsenäisenä sähkö- ja automaatioasentajana, tekee asiakaskeikkoja (60fps minipelit), ostaa pajan työkaluja ja sertifikaatteja, hankkii kokonaisen yrityksen **45 000 € pankkilainalla (perheen 180 000 € omakotitalo panttina)** ja sijoittaa varojaan raaka-aine- ja osakepörssiin (TradingView-tyylinen moniaikajännekaavio).

### Käyttäjän profiili ja oppimistavoite (ERITTÄIN TÄRKEÄ!)
- **Roolisi:** Toimit **kokeneena ohjelmistoarkkitehtina ja mentorina**, joka tukee kehittäjän ammatillista kasvua.
- **Viestintätyyli:**
  - Pidä sävy **rentona, ammattimaisena ja rohkaisevana** (selkeällä suomen kielellä).
  - **Perustele aina arkkitehtuurivalinnat:** Älä vain lätkäise koodia, vaan selitä *miksi* tietty tietorakenne, tilakone, tyyppikuvio tai abstraktio on parempi kuin vaihtoehtoinen tapa (esim. vertaa TypeScriptin ja Gon idiomieroja, kun se on luontevaa).
  - **Nosta reunaehdot (Edge Cases) esiin:** Älä oleta asioita hiljaisesti. Jos uudessa ominaisuudessa on tärkeitä reunaehtoja (kuten nollalla jakaminen, negatiivinen kassa, ääretön näpyttely-exploit tai asynkroninen kilpajuoksu), nosta ne lyhyesti esiin ja näytä, miten ne on taklattu koodissa.
  - **Koodin laatu:** Kirjoita koodiesimerkit ja toteutukset aina vahvasti tyypitettyinä (ei `any`-tyyppejä) ja selkeästi suomeksi kommentoituina.

---

## 2. Arkkitehtuuri & Kansiorakenne

Projekti on jaettu selkeästi vastuualueisiin (Separation of Concerns):

```text
/
├── AGENT_MEMO.md                  # Tämä arkkitehti- ja agenttimuistio
├── vite.config.ts                 # Vite + babel-plugin-react-compiler
├── backend/                       # Go-taustamoottorin referenssi- ja simulaatiomallit
│   └── internal/engine/           # Deterministinen talous-, velka- ja pörssilogiikka Gossa
└── src/
    ├── App.tsx                    # Juurikomponentti: <Activity>-välilehdet & useEffectEvent-ajastimet
    ├── hooks/
    │   └── useEffectEvent.ts      # React 19.2+ useEffectEvent -toteutus ajastimille & RAF-silmukoille
    ├── types/
    │   ├── game.ts                # Ydinmallit: PlayerState, LoanState, Employee, UpgradeItem, Gig, TransactionRecord
    │   └── market.ts              # Pörssimallit: MarketTimeframe (1m..1d), OHLCCandle, MarketAsset, InsiderIntel
    ├── data/
    │   ├── initialData.ts         # Aloitusdata: työkalut, sertifikaatit, keikat, laina, työntekijät
    │   └── initialMarketData.ts   # Pörssin kohde-etuudet ja generoidut OHLC-historiakynttilät kaikille aikajänteille
    ├── store/
    │   ├── useGameStore.ts        # Zustandin yhdistetty store + calculateBusinessMetrics-selektori
    │   └── slices/                # Modulaariset Zustand-viipaleet (Slice Pattern):
    │       ├── playerSlice.ts     # Taso, XP, Stamina, getEffectiveStaminaCost, getStaminaEfficiencyBreakdown
    │       ├── financialSlice.ts  # Kassa, IEEE 754 -pyöristys (2 desim.), TransactionRecord-loki (Ledger)
    │       ├── loanSlice.ts       # 45 000 € yrityslaina, 180 000 € kodin pantti, viikkokorko, ulosottoriski
    │       ├── companySlice.ts    # Yrityksen taso, työntekijöiden palkkaus/ylennys/irtisanominen
    │       ├── assetSlice.ts      # Pajan päivitykset eksponentiaalisella kustannuskäyrällä (Base * 1.45^Level)
    │       ├── marketSlice.ts     # Moniaikajänteinen OHLC-pörssimoottori, stepMarketCandle, osingot, sisäpiirivihjeet
    │       └── leaderboardSlice.ts# Tulostaulut ja saavutukset
    ├── services/
    │   ├── soundService.ts        # Syntetisoitu Web Audio API -äänimoottori (ei ulkoisia äänitiedostoja)
    │   ├── googleWorkspaceAuth.ts # 1P Google OAuth 2.0 (Token Client)
    │   └── slidesExportService.ts # Google Slides Pitch Deck -raporttigeneraattori sijoittajille
    └── components/
        ├── Header.tsx             # Yläpalkki: Kello, Kassa, Salkku, Stamina, Kodin velkariski, Seuraava päivä
        ├── NavigationTabs.tsx     # Välilehtinavigaatio
        ├── WorkstationView.tsx    # Työpiste, manuaalinen työ & minipelien käynnistys (switch-ohjattu)
        ├── MarketView.tsx         # TradingView-tyylinen pörssinäkymä (OHLCV, SMA-20, EMA-9, aikajänteet alhaalla)
        ├── CompanyLoanView.tsx    # Yrityskauppa, kodin pantti, lainanlyhennys & HR-hallinta
        ├── UpgradesView.tsx       # Paja & Työkalut (suodatettu kategorioittain)
        ├── GigMarketView.tsx      # Keikkapörssi
        ├── CalendarView.tsx       # Viikkokalenteri (MA–SU)
        └── Minigames/             # TimingMinigame, WiringMinigame, TroubleshootingMinigame
```

---

## 3. Tiukat Tekniset Konventiot (React 19.2+, React Compiler & TypeScript)

Käyttäjä haluaa, että koodipohja toimii **malliesimerkkinä modernista React 19.2+ ja React Compiler -arkkitehtuurista**. Noudata näitä sääntöjä poikkeuksetta:

### 3.1. React Compiler (`babel-plugin-react-compiler`) & Memoizaatio
1. **Automaattinen memoizaatio on päällä (`vite.config.ts`):**
   - Älä kääri jokaista pientä muuttujaa tai tapahtumankäsittelijää manuaaliseen `useMemo`- tai `useCallback`-koukkuun.
   - Pidä komponenttien renderöintilogiikka **puhtaana sivuvaikutuksista (Pure Render)**: älä koskaan mutatoi ulkoisia muuttujia tai kutsu `Math.random()` / `Date.now()` suoraan JSX-renderöinnin sisällä (tee satunnaisgenerointi vain tapahtumankäsittelijöissä tai Zustand-actioneissa!).
2. **Milloin `useMemo` on edelleen sallittu?**
   - Vain silloin, kun halutaan eksplisiittinen algoritminen lokerointi (esim. raskas graafin polkulaskenta tai taulukon monivaiheinen haku), mutta silloinkin puhdas paikallinen johdettu muuttuja (`const x = ...`) riittää React Compilerille.

### 3.2. `useActionState` vs. suora `useState`
1. **Käytä `useActionState`-koukkua liiketoiminta- ja lomaketoiminnoissa (`MarketView`, `CompanyLoanView`, `UpgradesView`):**
   - Kun toiminnolla on selkeä syöte (`payload`), tilamuutos (esim. osto, myynti, lainanlyhennys, kynttilän kelaus tai asynkroninen Google Slides -vienti) ja palauteviesti (`status: 'idle' | 'success' | 'error'`, `message`), käytä React 19:n `useActionState`-koukkua.
   - Älä luo erillisiä `const [isLoading, setIsLoading] = useState(false)` ja `const [error, setError] = useState(null)` -tilapareja.
2. **Milloin `useActionState` EI kuulu komponenttiin?**
   - Välittömissä, korkeataajuisissa mikrointeraktioissa (kuten `WiringMinigame.tsx`-johdotusvalinnassa, SVG-kynttilän `onMouseEnter`-hoverissa tai `TimingMinigame.tsx` 60fps-mittarissa). Niissä suora `useState` tai `useRef` on oikea työkalu, koska `useActionState` on suunniteltu *Action/Transition*-elinkaarelle.

### 3.3. `switch` + Discriminated Unions + Exhaustive Check (`never`)
Kun reitität tilakoneen toimintoja tai valitset renderöitävää alikomponenttia äärellisestä union-tyypistä (esim. `MinigameType` tai `MarketActionPayload`), **suosi aina `switch`-rakennetta ja `never`-tarkistusta** pitkien `if / else if` -ketjujen sijaan:

```typescript
switch (payload.action) {
  case 'buy':
    return handleBuy(payload);
  case 'sell':
    return handleSell(payload);
  case 'step_candle':
    return handleStepCandle(payload);
  default: {
    // Kääntäjä pakottaa päivittämään tämän kohdan, jos unioniin lisätään uusi jäsen!
    const _exhaustiveCheck: never = payload;
    return _exhaustiveCheck;
  }
}
```
*Arkkitehtuurinen perustelu:* Tämä vastaa Go-kielen vahvaa `switch`-idiomia ja antaa TypeScriptissä 100 % käännösaikaisen takuun siitä, ettei mikään uusi tila jää vahingossa käsittelemättä.

### 3.4. Ehdottomasti Vältettävä Anti-Pattern: `useEffect`-sivuvaikutusketjut (Cascading Effects)

Modernissa React 19.2+ ja React Compiler -arkkitehtuurissa **`useEffect` tilan synkronointiin tai tapahtumaketjujen ohjaamiseen on ehdoton anti-pattern**.

#### Miksi `useEffect`-ketjut ovat niin vaarallisia ja vaikeita debugata?
Kun `useEffect` asetetaan kuuntelemaan tilaa `A` ja päivittämään tilaa `B` (`setB(...)`), joka puolestaan laukaisee toisen `useEffect`-koukun päivittämään tilaa `C`:
1. **Turhat renderöintisyklit ja välkkyminen (Render Waterfalls):** Käyttöliittymä renderöityy ensin vanhalla/epäyhtenäisellä tilalla ja vasta sen jälkeen efektien pakottamalla uudella tilalla.
2. **Vanhentuneet sulkeumat (Stale Closures) & Ikuiset silmukat:** Yksikin puuttuva tai väärän viiteidentiteetin omaava riippuvuus `dependency array` -listassa aiheuttaa joko hiljaisen bugin (luetaan vanhaa arvoa) tai loputtoman `Maximum update depth exceeded` -kierteen.
3. **Asynkroniset kilpajuoksut (Race Conditions):** Kun käyttäjä vaihtaa nopeasti esim. pörssin kohde-etuutta tai aikajännettä, päällekkäiset efektit ylikirjoittavat toistensa tuloksia arvaamattomassa järjestyksessä.

#### Korvaavat mallit (Käytä aina näitä `useEffect`in sijaan):
- **Johdettu tila (Derived State):** ÄLÄ KOSKAAN tee `useEffect(() => { setFiltered(items.filter(...)) }, [items])`. Laske arvo suoraan renderöinnin aikana (`const filtered = items.filter(...)`). React Compiler memoizoi sen automaattisesti!
- **Käyttäjän toiminnasta johtuva sivuvaikutus:** Jos klikkaus tai lomakkeen lähetys muuttaa tilaa, soittaa äänen tai näyttää ilmoituksen, suorita logiikka **suoraan tapahtumankäsittelijässä (`onClick`) tai `useActionState`-funktiossa** — älä koskaan kierrätä sitä `useState`-lipun ja `useEffect`-kuuntelijan kautta.
- **Tilan nollaus ID:n vaihtuessa:** Jos komponentin tila pitää nollata esim. keikan tai osakkeen vaihtuessa, anna komponentille `<Component key={selectedId} />` tai nollaa arvo suoraan valintafunktiossa (`handleSelect`).

```typescript
// ❌ ANTI-PATTERN: Sivuvaikutusketju (ÄLÄ TEE NÄIN!)
useEffect(() => {
  if (tradeSuccess) {
    sound.playSuccess();
    setNotification('Kauppa onnistui!');
  }
}, [tradeSuccess]);

// ✅ OIKEA MALLI: Suora toiminto useActionState- tai tapahtumankäsittelijässä
const [tradeState, executeTrade] = useActionState((_prev, payload) => {
  const res = buyAsset(payload.assetId, payload.quantity);
  if (res.success) sound.playSuccess(); // Sivuvaikutus tapahtuu täsmälleen tapahtumahetkellä
  return { status: res.success ? 'success' : 'error', message: res.message };
}, { status: 'idle', message: null });
```

#### Milloin `useEffect` ON sallittu ja perusteltu?
`useEffect` on modernissakin Reactissa **täysin sallittu ja oikea työkalu VAIN silloin**, kun komponentti synkronoidaan **Reactin ulkopuolisen järjestelmän (External System)** kanssa, jolle ei ole tapahtumapohjaista vaihtoehtoa:
1. Selaimen ajastimet (`setInterval` / `setTimeout`) ja pelisilmukat (`requestAnimationFrame`).
2. DOM-tapahtumakuuntelijat (`window.addEventListener`), WebSocket-yhteydet tai Web Audio / Canvas -resurssien elinkaari.

**Pakollinen tarkistuslista (Guardrails), kun käytät perusteltua `useEffect`-koukkua:**
1. **Nolla dominoefektiä (Zero Domino Rule):** Yhdenkään `useEffect`in ei tule laukaista tilamuutosta, joka käynnistää toisen `useEffect`in.
2. **Eristä reaktiivisuus `useEffectEvent`-koukulla:** Älä laita ajastimen tai animaatiosilmukan `dependency array` -listaan muuttuvia tiloja tai funktioita. Kääri tikin sisäinen logiikka `useEffectEvent`-funktioon (`src/hooks/useEffectEvent.ts`), jotta efekti käynnistyy vain, kun todellinen synkronointiparametri (esim. `intervalMs` tai `isRunning`) muuttuu.
3. **Eksplisiittinen siivous (Cleanup):** Jokaisen `useEffect`-koukun on palautettava deterministinen siivousfunktio (`return () => clearInterval(id)` tai `cancelAnimationFrame(id)`), jotta muistivuotoja tai "haamuajastimia" ei synny.
4. **Perustelukommentti koodiin:** Kirjoita jokaisen `useEffect`in yläpuolelle lyhyt arkkitehtuurikommentti, joka kertoo *mikä ulkoinen järjestelmä* tässä synkronoidaan ja miksi.

### 3.5. `<Activity>` ja tilan säilytys
- **`<Activity>` (`App.tsx`):** Päävälilehdet renderöidään `<Activity mode={activeTab === '...' ? 'visible' : 'hidden'}>` -komponentin sisällä, jotta käyttäjän paikallinen UI-tila (esim. pörssin valinnat ja syötteet) säilyy välilehteä vaihdettaessa ilman taustalla pyöriviä haamuefektejä.

---

## 4. Pelisuunnittelun & Talousmoottorin Invariantit ("Älä Riko Näitä!")

1. **Pörssikaavio ei saa pomppia sekunnin välein (TradingView Multi-Timeframe Bucketing):**
   - Pörssissä on 7 aikajännettä: `1m`, `5m`, `10m`, `30min` (`30m`), `60min` (`60m`), `3h` ja `1d`.
   - Tausta-ajastin (`App.tsx`) päivittää kynttilän valitun aikajänteen todellisen keston (`realTimeSeconds`) mukaisesti, ja keikat (`30m`) sekä päivänvaihdot (`1d`) sulkevat vastaavat kynttilät.
   - **UI-sijoittelu:** Aikajännevalitsin (`Aikajänne: 1m 5m ...`) ja `+1 kynttilä` -painike sijaitsevat **suoraan SVG-kuvaajan alapuolella** (X-akselin yhteydessä), kun taas OHLCV-arvot ja indikaattorikytkimet (`SMA-20`, `EMA-9`, `Vol`) ovat tiiviissä yläpalkissa.
2. **Stamina-portti estää äärettömän kynttiläkelauksen (`stepMarketCandle`):**
   - Pelaaja EI saa pystyä kelaamaan `+1 kynttilä` -napilla aikaa ilmaiseksi loputtomiin ("Infinite Reroll Exploit").
   - Jokainen manuaalinen kynttilän kelaus kuluttaa staminaa (`getEffectiveStaminaCost(tfMeta.baseStaminaCost)`), vie pelikelloa eteenpäin (`advanceMinute`) ja kerryttää hieman analyysi-XP:tä (`addXp`).
   - Tehollinen staminakulutus kevenee hahmonkehityksen myötä kolmesta lähteestä:
     1. **Kalusto & Sertifikaatit** (`UpgradeItem.staminaDrainReduction`)
     2. **Ammattitaso** (`player.level`, -2 % per taso)
     3. **Yrityksen tiimi** (`Employee.staminaEfficiency`, kun yritys on ostettu)
   - Kokonaiskevennys on rajattu **max 75 prosenttiin** (`Math.min(0.75, ...)`), jotta toiminto ei koskaan muutu täysin ilmaiseksi.
3. **Kirjanpidon tarkkuus (IEEE 754 & Ledger):**
   - Älä koskaan muuta `cash`-arvoa suoraan komponentista tai epätarkalla liukulukulaskulla. Käytä aina `addCash`- ja `spendCash`-metodeja (`financialSlice.ts`), jotka pyöristävät sentit (`Math.round(val * 100) / 100`) ja kirjaavat `TransactionRecord`-rivin tilikirjaan.

4. **Hahmonkehityksen erikoistumispuut (Perk Trees & Puhtaat Valitsimet):**
   - Hahmonkehitys on eriytetty puhtaisiin valitsinfunktioihin (`hasPerk`, `canUnlockPerk`) ja katalogiin (`PERK_CATALOG` in `src/data/perksData.ts`).
   - Tasonnousut kerryttävät taitopisteitä (`player.perkPoints`), joilla pelaaja voi aktivoida kykyjä kahdessa haarassa:
     1. **Kenttämestari (Field Specialist):** `craftsman_flow` (+25 % manuaalityön tuotto, -20 % klikkausstamina), `precision_grip` (minipelien toleranssit, keikkojen staminakulutus 15 -> 11), `jobsite_innovator` (+50 % maine keikoista, 35 % mahdollisuus löytää ylijäämäkomponentteja +50–150 €).
     2. **Pörssihai (Market Analyst):** `candle_focus` (kynttiläkelauksen staminakulu -40 %), `insider_network` (sisäpiirivihjeiden saantimahdollisuus 35 % -> 70 %, kynnys 70 %), `arbitrage_master` (+6 % lisätuotto pörssimyynneistä ilman spread-kuluja).
   - Tilan nollaus (`respecPerks`) palauttaa kaikki sijoitetut taitopisteet deterministisesti ilman sivuvaikutusketjuja.

---

## 5. Luonnolliset Jatkokehityssuunnat (Seuraavat Askeleet)

Jos käyttäjä pyytää jatkamaan tai laajentamaan peliä, tässä ovat arkkitehtuurisesti seuraavat suunnat:
1. **Vireystilan vaikutukset (Fatigue & Focus Buffs):**
   - Korkea stamina (>80 %) voi antaa "Fokus-bonuksen" (parempi tarkkuus minipeleissä tai korkeampi sisäpiirivihjeen todennäköisyys), kun taas matala stamina (<20 %) kasvattaa virheriskiä tai kytkee hidastuksia.
2. **Go-taustapalvelimen ja Frontendin syvempi synkronointi:**
   - Projektissa on `backend/internal/engine`-kansiossa Go-kielinen talousmoottori. Sitä voidaan käyttää vertailukohtana, kun opetetaan käyttäjälle Go vs. TypeScript -suunnittelumalleja (esim. Goroutines / Concurrency, Struct tags, Error handling idiomi `if err != nil`).
3. **Ura- ja yritystason laajennukset (Contract Tier Scaling):**
   - Suuremmat alihankintasopimukset, joissa työntekijöiden taitoja ja pelaajan erikoistumisia yhdistetään monimutkaisiin sähköverkkourakointeihin.
