# From Gigs to Giants — Sähköäijä & Studio Tycoon ⚡

Korkeiden panosten (High-Stakes) talous-, urakointi- ja pörssisimulaattori, joka on rakennettu modernilla **React 19.2+**, **React Compiler (`babel-plugin-react-compiler`)**, **TypeScript**, **Zustand** ja **Go** -arkkitehtuurilla.

---

## Arkkitehtuurin kohokohdat

- **React 19.2+ & React Compiler**:
  - `<Activity>`-komponentti säilyttää päänäkymien (kuten Pörssin indikaattorien ja kaupankäyntisyötteiden) paikallisen tilan välilehtien vaihdon yli.
  - `useActionState` hallitsee kaupankäynnin, yrityskaupan, lainanlyhennysten ja Google Slides -viennin tilat ilman manuaalisia `isLoading`/`error`-tilalippuja.
  - `useEffectEvent` eristää ajastin- ja `requestAnimationFrame`-silmukoiden tapahtumalogiikan reaktiivisista efekteistä.
- **Pelikello-ohjattu talous & Tilikirja (Ledger Pattern)**:
  - Kaikki rahansiirrot pyöristetään IEEE 754 -liukulukuvirheiden estämiseksi kahden desimaalin tarkkuuteen (`Math.round(val * 100) / 100`).
  - Ei "tyhjästä raksuttavia" sekuntilaskureita: sopimus-, automaatio- ja tiimilaskutus tilitetään deterministisesti työpäivän päättyessä (`advanceDay`) yhtenä koontikirjauksena tilikirjaan (`TransactionRecord`).
- **TradingView-tyylinen moniaikajännepörssi (`1m` – `1d`)**:
  - 7 aikajännettä, OHLCV-kynttiläkaavio, `SMA-20` ja `EMA-9` liukuvat keskiarvot, keikoilta ansaittavat sisäpiirivihjeet (*Insider Intel*) sekä staminaportitettu kynttilänkelaus.

---

## Käynnistys ja paikallinen kehitys (GitHub-klooni)

### 1. Asenna riippuvuudet
```bash
pnpm install
```

### 2. Ympäristömuuttujat ja tietoturva (Valinnainen Google Slides -vienti)
Sovellus toimii täysin ilman ulkoisia API-avaimia. Jos haluat käyttää *Luo Google Slides Pitch Deck* -ominaisuutta:
1. Kopioi `.env.example` nimelle `.env` (tai `firebase-applet-config.example.json` nimelle `firebase-applet-config.json`).
2. Täytä omat Firebase / Google OAuth -tunnuksesi.
3. **Huom:** Sekä `.env` että `firebase-applet-config.json` on suojattu `.gitignore`-tiedostossa, jotta API-avaimet eivät koskaan päädy GitHubiin.

### 3. Käynnistä kehityspalvelin
```bash
pnpm run dev
```
Sovellus käynnistyy osoitteeseen `http://localhost:3000`.
