# From Gigs to Giants — Sähköäijä & Studio Tycoon ⚡

A high-stakes financial, electrical contracting, and stock/commodity market simulator built with **React 19.2+**, **React Compiler (`babel-plugin-react-compiler`)**, **TypeScript**, **Zustand**, and a **Go** simulation engine.

---

## Architectural Highlights

- **React 19.2+ & React Compiler**:
  - `<Activity>` preserves local component state across tab transitions (such as multi-timeframe market chart selections and trade order inputs) without background effect overhead.
  - `useActionState` drives trade execution, company acquisition, debt service, and Google Slides exports without manual `isLoading`/`error` state pairs.
  - `useEffectEvent` isolates interval and `requestAnimationFrame` callback logic from reactive effect dependencies.
- **Calendar-Synchronized Gig State Machine**:
  - `weekSchedule[dayOfWeek]` acts as the Single Source of Truth for the daily active contract (`activeGig`).
  - Each scheduled contract slot can be executed only once per day (`slot.result` + `completedGigIdsThisWeek`), consuming tier-scaled **Stamina** (`25%` / `35%` / `45%` base) and advancing the **Workday Clock** (`4h` / `5h` / `6h`, with a hard `22:00` cutoff).
- **Game-Clock Daily Settlement & Financial Ledger**:
  - All monetary mutations are rounded to 2 decimal places (`Math.round(val * 100) / 100`) to prevent IEEE 754 floating-point drift.
  - Passive contract, automation, and technician team revenues are settled deterministically at the end of each workday (`advanceDay()`) into the `TransactionRecord` ledger, and same-day manual workshop clicks are coalesced into a single `click_labor` entry.
- **TradingView-Style Multi-Timeframe Market (`1m` – `1d`)**:
  - 7 timeframes, OHLCV candlestick charting, `SMA-20` and `EMA-9` indicators, jobsite-earned *Insider Intel*, and stamina-gated candle stepping.

---

## Local Development Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Environment Variables & Secret Hygiene (Optional Google Slides Export)
The application runs out of the box without external API keys. To enable the *Google Slides Pitch Deck Export* feature:
1. Copy `.env.example` to `.env` (or `firebase-applet-config.example.json` to `firebase-applet-config.json`).
2. Populate your own Firebase / Google OAuth credentials.
3. **Note:** Both `.env` and `firebase-applet-config.json` are ignored via `.gitignore` so credentials are never committed to Git.

### 3. Run the development server
```bash
pnpm run dev
```
The server starts at `http://localhost:3000`.

### 4. Verification & Tests
```bash
npm run lint
npm test
npm run build
cd backend && go test -v -race ./...
```
