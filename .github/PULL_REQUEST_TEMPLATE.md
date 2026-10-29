## 🎯 Architecture & Feature Story (Why & How)

### 1. Problem Statement & Motivation (Why)
<!-- What gameplay, architectural, or technical problem does this PR solve? -->

### 2. Architectural Decisions & Implementation (How)
<!-- Why was this specific data structure, state machine, or abstraction chosen over alternatives? -->

---

## 📦 Atomic Topic Breakdown (For Squash & Merge History)
<!-- When using Squash & Merge, this section preserves the logical commit breakdown inside the final main branch commit message. -->

- **`feat(store)` / State Machine & Invariants:**
- **`feat(ui)` / UI Components & Interaction:**
- **`ci` / `sec` / Infrastructure & Security:**
- **`test` / Unit Tests & Verification:**

---

## 🛡️ Edge Cases & Guardrails

- [ ] **Single Source of Truth:** No duplicated or conflicting state across slices/views.
- [ ] **Resource & Clock Gating (Exploit Prevention):** Actions cannot be farmed infinitely without consuming Stamina or advancing the Game Clock.
- [ ] **IEEE 754 Precision & Financial Ledger:** All monetary mutations are rounded to 2 decimal places and recorded in `TransactionRecord`.
- [ ] **React 19.2+ & Compiler Compliance:** Pure render functions, zero cascading `useEffect` chains.

---

## 🧪 Verification

```bash
npm run lint
npm test
npm run build
cd backend && go test -v -race ./...
```
