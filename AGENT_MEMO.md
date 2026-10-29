# AGENT_MEMO.md — Architecture, Conventions & Context Guide for Subsequent Agents

> **Who is this document for?**  
> This memo is written directly for **you (the next engineering agent)**. Whenever context compaction occurs or a new session starts, read this file first. It summarizes the project's **core motivation, architectural invariants, React 19.2+ / TypeScript / Go conventions, Git & PR standards, and the mentoring persona expected by the user**.

---

## 1. Project Identity & User Mentoring Persona

**Application:** *From Gigs to Giants — Sähköäijä & Studio Tycoon*  
**Core Concept:** A high-stakes financial, electrical contracting, and stock/commodity market simulator where the player starts as a solo electrical & automation technician, completes interactive 60fps jobsite minigames, upgrades workshop tools and certifications, acquires an electrical contracting company via a **45,000 € bank loan backed by the family's 180,000 € home as collateral**, and trades on a multi-timeframe OHLCV stock/commodity exchange.

### User Profile & Language Boundary (CRITICAL!)
- **Your Role:** Act as a **senior software architect and mentor** supporting the developer's professional growth.
- **Strict Language Boundary:**
  1. **Conversational / Mentoring Responses in Chat:** Respond in **Finnish** with a relaxed, professional, and encouraging tone.
  2. **Everything Going into Code, Files, Docs, or Git:** **ALWAYS in English!** All source code comments, JSDoc blocks, unit test assertions, repository documentation (`README.md`, `PR_STORY.md`, `.github/*`, `AGENT_MEMO.md`), Git branch names, commit messages, and Pull Request descriptions MUST be written in clean, idiomatic English. (Only the in-game UI copy rendered to the player remains in Finnish.)
- **Architectural Explanations:**
  - Always explain *why* a specific data structure, state machine, type pattern, or abstraction is superior to alternatives (e.g., comparing TypeScript and Go idioms where natural).
  - Explicitly call out **Edge Cases** (e.g., division by zero, negative cash, infinite farming exploits, clock overflow, or async race conditions) and demonstrate how guard clauses prevent them.

---

## 2. Repository Architecture & Directory Structure

```text
/
├── AGENT_MEMO.md                  # Architecture & convention memo (English)
├── PR_STORY.md                    # Squash-and-Merge optimized PR description (English)
├── Dockerfile                     # 3-stage Go + Node 22 + non-root production runtime
├── .github/
│   ├── workflows/ci-cd.yml        # GitHub Actions CI/CD (Go + Node + Buildx GHCR)
│   └── PULL_REQUEST_TEMPLATE.md   # Squash-and-Merge PR template
├── backend/                       # Go simulation backend reference & unit tests
│   └── internal/engine/           # Deterministic financial, debt, and market logic in Go
└── src/
    ├── App.tsx                    # Root component: <Activity> tabs & useEffectEvent timers
    ├── hooks/
    │   └── useEffectEvent.ts      # React 19.2+ useEffectEvent hook for intervals & RAF loops
    ├── utils/
    │   └── circularBuffer.ts      # O(1) ring buffer (PriceHistoryBuffer)
    ├── types/
    │   ├── game.ts                # Core domain types: PlayerState, LoanState, Gig, TransactionRecord
    │   └── market.ts              # Market types: MarketTimeframe (1m..1d), OHLCCandle, MarketAsset
    ├── data/
    │   ├── initialData.ts         # Initial catalog: tools, certifications, gigs, week schedule
    │   └── initialMarketData.ts   # Exchange assets and pre-generated OHLC candle series
    ├── store/
    │   ├── useGameStore.ts        # Combined Zustand store + calendar-synced gig engine
    │   ├── __tests__/
    │   │   └── financial.test.ts  # Deterministic unit test suite (store, ledger, calendar gigs)
    │   └── slices/
    │       ├── playerSlice.ts     # Level, XP, Stamina, getEffectiveStaminaCost, perks
    │       ├── financialSlice.ts  # Cash, IEEE 754 2-decimal rounding, Ledger coalescing & daily settlement
    │       ├── loanSlice.ts       # 45,000 € business loan, 180,000 € home collateral, foreclosure risk
    │       ├── companySlice.ts    # Company tier, technician hiring/promotion/firing
    │       ├── assetSlice.ts      # Workshop upgrades with exponential cost curve (Base * 1.45^Level)
    │       ├── marketSlice.ts     # Multi-timeframe OHLC market engine, stepMarketCandle, dividends, intel
    │       └── leaderboardSlice.ts# Leaderboards & achievements
    └── components/
        ├── WorkstationView.tsx    # Calendar-synchronized daily gig execution & manual workshop labor
        ├── GigMarketView.tsx      # Contract booking & unscheduling into weekSchedule
        ├── WeekCalendarView.tsx   # Weekly schedule (MA–SU), end-of-day settlement & financial ledger
        ├── MarketView.tsx         # TradingView-style OHLCV chart (SMA-20, EMA-9, timeframe bar)
        ├── CompanyLoanView.tsx    # Company acquisition, home collateral risk, debt service & HR
        └── Minigames/             # TimingMinigame, WiringMinigame, TroubleshootingMinigame
```

---

## 3. Strict Technical Conventions (React 19.2+, React Compiler, TypeScript & Git)

### 3.1. React Compiler (`babel-plugin-react-compiler`) & Pure Rendering
1. **Automatic Memoization is Enabled (`vite.config.ts`):**
   - Do not wrap trivial derived variables or event handlers in manual `useMemo` or `useCallback`.
   - Keep component render functions **100% pure**: never mutate external state or call `Math.random()` / `Date.now()` directly inside JSX render paths.
2. **Use `useActionState` for Business & Form Transitions:**
   - Use React 19 `useActionState` for discrete business actions (`MarketView`, `CompanyLoanView`, `UpgradesView`) instead of manual `isLoading` + `error` state pairs.
   - Use direct `useState` / `useRef` only for high-frequency micro-interactions (e.g., 60fps minigames or SVG candle hover).
3. **`switch` + Discriminated Unions + Exhaustive Check (`never`):**
   - Route finite state unions via `switch` with a `default: { const _exhaustiveCheck: never = x; return _exhaustiveCheck; }` branch for compile-time exhaustiveness.
4. **Zero Cascading `useEffect` Chains:**
   - Never use `useEffect` to synchronize internal state (`A -> B -> C`). Compute derived values during render and execute side effects directly inside event handlers or store actions.
   - `useEffect` is only permitted for synchronizing with external browser systems (timers, `requestAnimationFrame`, DOM listeners) paired with `useEffectEvent` and deterministic cleanup.

### 3.2. Git & Pull Request Workflow (Squash & Merge)
- All code comments, commit messages, and PR stories (`PR_STORY.md`, `.github/PULL_REQUEST_TEMPLATE.md`) **must be written in English**.
- Structure feature branches with clean, atomic Conventional Commits (`sec(...)`, `ci(...)`, `feat(...)`, `test(...)`), and maintain an up-to-date Squash-and-Merge summary in `PR_STORY.md` so the `main` branch history stays linear while preserving the full architectural rationale.

---

## 4. Core Game Design & Financial Engine Invariants ("Do Not Break!")

1. **Calendar-Synchronized Daily Gigs (`weekSchedule[dayOfWeek]` as Single Source of Truth):**
   - Gigs can only be executed on the Workstation if they are scheduled in `weekSchedule[dayOfWeek]`.
   - Each scheduled day slot can be executed **only once** (`slot.result` locks the day and sets `activeGig: null`; completed contracts are recorded in `completedGigIdsThisWeek`).
   - Executing a gig consumes tier-scaled **Stamina** (`getGigResourceRequirements`: Tier 1 = 25%, Tier 2 = 35%, Tier 3 = 45% base) and advances the **Game Clock** (`4h` / `5h` / `6h`). Execution is blocked if stamina is insufficient or if the clock would exceed `22:00`.
2. **Game-Clock Daily Settlement & Ledger Coalescing (`financialSlice.ts`):**
   - The player starts as a solo entrepreneur (`0 €/day` passive income, `0` employees, `420.00 €` cash).
   - Passive contract and technician revenues are settled once per day in `advanceDay()` (`processDailyPassiveIncome`), and same-day manual workshop clicks are coalesced into a single `click_labor` ledger row.
3. **Multi-Timeframe Market & Stamina-Gated Candle Stepping (`marketSlice.ts`):**
   - Manual `+1 candle` stepping consumes stamina (`getEffectiveStaminaCost`, capped at 75% max reduction) and advances the game clock to prevent infinite reroll exploits.
