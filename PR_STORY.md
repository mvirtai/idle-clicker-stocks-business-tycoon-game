# PR Title (Squash & Merge Subject Line)

```text
feat(gigs): synchronize daily gigs with calendar, stamina & clock + add CI/CD pipeline
```

---

## 🎯 Architecture & Feature Story (Why & How)

### 1. Problem Statement & Motivation (Why)
1. **Unbounded Gig Farming & Calendar Bypass (`WorkstationView` & `useGameStore`):**
   - Previously, players could select any gig from the Gig Market directly into `activeGig`—bypassing the Weekly Calendar (`weekSchedule`)—and execute the daily gig minigame an infinite number of times on the same day.
   - Executing a gig did not consume Stamina or advance the in-game workday clock, breaking both the resource economy and time-management loop.
2. **Real-Time Passive Cash Polling & Starting State:**
   - Passive cash previously ticked every real-time second via a background timer, and the player started with pre-assigned employees before purchasing the company.
3. **Secret Hygiene, Containerization & Automated CI/CD:**
   - The repository needed strict secret isolation (`.env.example` / `VITE_FIREBASE_*`), automated secret-leak guards, and a production-grade GitHub Actions CI/CD pipeline covering the Go backend, React 19.2+ / TypeScript frontend, and multi-stage Docker image builds.

---

### 2. Architectural Decisions & Implementation (How)

#### A. Weekly Calendar as the Single Source of Truth
- Instead of maintaining `activeGig` and `weekSchedule[dayOfWeek]` as independent states that can drift out of sync, `resolveActiveGigForDay(schedule, day, catalog)` derives the active daily contract directly from the current day's calendar slot (`weekSchedule[dayOfWeek]`).
- In `GigMarketView`, contracts are booked into free weekday slots (`MA`–`PE`) via `scheduleGigInCalendar(gigId, preferredStartDay)`, supporting multi-day contracts (`durationDays`, e.g., `Osa 1/2` and `Osa 2/2`).
- When a daily gig is completed (`completeMinigame`), the result is locked into `weekSchedule[dayOfWeek].result`, the contract ID is appended to `completedGigIdsThisWeek` (enforcing unique 1x completion per week), and `activeGig` is cleared for the remainder of the day.

#### B. Resource Gating: Stamina & Workday Clock
- `getGigResourceRequirements(gig)` computes tier-scaled resource requirements:
  - **Stamina Cost:** Tier 1 = `25%`, Tier 2 = `35%`, Tier 3 = `45%` base cost (mitigated by tools, certifications, player level, team efficiency, and the `precision_grip` perk).
  - **Workday Clock Duration:** Tier 1 = `4h (240 min)`, Tier 2 = `5h (300 min)`, Tier 3 = `6h (360 min)`.
- The state machine guard `canExecuteTodayGig()` blocks execution if:
  1. Today has no scheduled gig (`empty`) or is a weekend rest day (`LA`/`SU`).
  2. Today's scheduled gig slot is already completed (`slot.result !== undefined`).
  3. Player stamina is below `staminaCost`.
  4. Advancing the clock by `durationMinutes` would exceed the `22:00` end-of-workday cutoff (`currentMinutes + durationMinutes > 22 * 60`).

#### C. Game-Clock Daily Settlement & Ledger Coalescing
- Players start as solo entrepreneurs (`0 €/day` passive income, `0` employees, `420.00 €` starting cash).
- Passive contract and team revenues are settled deterministically into the financial ledger (`TransactionRecord`) at the end of each day (`advanceDay()`), and same-day manual workshop clicks are coalesced into a single `click_labor` ledger entry.

#### D. Production CI/CD Pipeline & Multi-Stage Docker Build
- `.github/workflows/ci-cd.yml` runs parallel verification jobs for the Go backend (`go vet`, `golangci-lint`, `go test -race`) and React/TypeScript frontend (`npm ci`, leaked API key scan, `tsc --noEmit`, `npm test`, `npm run build`), followed by a multi-stage `Dockerfile` build using Buildx GitHub Actions cache, SBOM generation, and SLSA provenance attestation.

---

## 📦 Atomic Commit Breakdown (Preserved for Squash & Merge)

1. **`sec(config): remove hardcoded Firebase config and enforce env-based initialization`**
   - Removed tracked Firebase config file, hardened `.gitignore`, added `.env.example` & `firebase-applet-config.example.json`, and refactored `slidesExportService.ts` + `server.ts`.
2. **`ci(pipeline): add GitHub Actions CI/CD workflow and multi-stage Dockerfile`**
   - Added `.github/workflows/ci-cd.yml`, `Dockerfile`, `.dockerignore`, and Go unit tests (`backend/internal/engine/engine_test.go`).
3. **`feat(store): synchronize daily gigs with week calendar, stamina, and game clock`**
   - Implemented `getGigResourceRequirements`, `canExecuteTodayGig`, `scheduleGigInCalendar`, `unscheduleGigFromDay`, deterministic daily settlement, and ledger coalescing (`useGameStore.ts`, `financialSlice.ts`, `initialData.ts`).
4. **`feat(ui): update Workstation, GigMarket, and WeekCalendar for calendar-locked gigs`**
   - Updated `WorkstationView.tsx`, `GigMarketView.tsx`, and `WeekCalendarView.tsx` to display calendar state, stamina/clock costs, daily completion summary cards, and the financial ledger table.
5. **`test(store): add deterministic unit tests for ledger, calendar gigs, and PR story docs`**
   - Added `src/store/__tests__/financial.test.ts` (5/5 test suites), `.github/PULL_REQUEST_TEMPLATE.md`, `PR_STORY.md`, and updated `AGENT_MEMO.md`.

---

## 🛡️ Edge Cases & Guardrails Covered

- [x] **Duplicate Execution Guard (Idempotency):** Even if `completeMinigame` is invoked programmatically a second time on the same day, `canExecuteTodayGig()` rejects the call and returns `pay: 0, staminaConsumed: 0, minutesElapsed: 0`.
- [x] **Workday Clock Overflow Guard:** If a player performs manual workshop tasks until `18:30`, a 4-hour gig cannot be started that evening (`18:30 + 4h > 22:00`); the player must end the workday first.
- [x] **Atomic Multi-Day Unscheduling:** Canceling a 2-day contract (`unscheduleGigFromDay`) atomically releases all uncompleted weekday slots assigned to that contract.
- [x] **CI Secret Leak Guard:** The CI workflow fails immediately if any tracked source file contains an `AIzaSy`-prefixed API key.

---

## 🧪 Verification & Test Results

- `npm run lint` (`tsc --noEmit`) — **0 errors**
- `npm test` (`tsx src/store/__tests__/financial.test.ts`) — **5/5 test suites passed**
- `npm run build` (`tsc && vite build`) — **Production bundle compiled cleanly**
