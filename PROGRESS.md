# Portfelio — Progress Tracker

Statuses: ⚪ `to do` | 🟡 `testing` | 🟢 `done`

---

## Step 1 — Foundation

| # | Task | Status | Test depends on |
|---|---|---|---|
| 1.1 | `app/store/gameStore.ts` — Zustand state | 🟡 testing | 1.3, 2.2, 3.1 |
| 1.2 | `app/i18n/en.json` + `pl.json` — UI strings | 🟡 testing | 1.3, 2.2 |
| 1.3 | Navigation — expo-router: stack + bottom tabs | 🟡 testing | 2.2 |

---

## Step 2 — Onboarding

| # | Task | Status | Test depends on |
|---|---|---|---|
| 2.1 | `app/data/comics.json` — 8 scenes + quiz + PKO links | 🟡 testing | 2.3 |
| 2.2 | `NicknameScreen.tsx` — nickname input + language selector | 🟡 testing | 1.3 |
| 2.3 | `ComicOnboarding.tsx` — 8 swipeable scenes with quiz | 🟡 testing | 1.3, 2.1, 2.2 |

---

## Step 3 — Game Loop (core)

| # | Task | Status | Test depends on |
|---|---|---|---|
| 3.1 | `MonthScreen.tsx` — wallet balance, asset list, End Month button | 🟡 testing | 1.1, 1.2, 1.3 |
| 3.2 | `AssetCard.tsx` — asset row: name, value, mini chart | 🟡 testing | 3.1, 4.1 |
| 3.3 | `AssetDetailScreen.tsx` — full chart + buy/withdraw | 🟡 testing | 1.1, 1.3, 3.2, 4.1 |
| 3.4 | `FeeConfirmModal.tsx` — crypto fee confirmation | 🟡 testing | 3.3 |
| 3.5 | `LoanWidget.tsx` — loan status + next repayment | 🟡 testing | 1.1, 3.1 |
| 3.6 | `MonthSummaryScreen.tsx` — AI summary (Claude API Call 1) | 🟡 testing | 1.1, 1.3, 3.1 |

---

## Step 4 — Components & Details

| # | Task | Status | Test depends on |
|---|---|---|---|
| 4.1 | `AssetChart.tsx` — Victory Native XL line chart (history + gameYear) | 🟡 testing | 3.1 |
| 4.2 | `WhatIfScreen.tsx` — read-only alternative timeline (Claude API Call 2) | 🟡 testing | 1.1, 3.6 |
| 4.3 | Loan flow — take loan, auto monthly deduction, warning (Claude API Call 3) | 🟡 testing | 1.1, 3.1, 3.5 |

---

## Step 5 — End Game & Meta

| # | Task | Status | Test depends on |
|---|---|---|---|
| 5.1 | `YearSummaryScreen.tsx` — year summary: returns, breakdown by asset | 🟡 testing | 1.1, 3.6, 5.2 |
| 5.2 | `IQBar.tsx` — 4 IQ category bars | 🟡 testing | 5.1 |
| 5.3 | `LeaderboardScreen.tsx` — GET /leaderboard, ranked by IQ | 🟡 testing | 5.1, backend |
| 5.4 | `BankScreen.tsx` — PKO products list + links + `products.json` | 🟡 testing | 1.3 |

---

## Step 6 — Polish

| # | Task | Status | Test depends on |
|---|---|---|---|
| 6.1 | Tutorial tooltips — overlay hints for first month | 🟡 testing | 3.1 |
| 6.2 | Haptics — tactile feedback on key actions | 🟡 testing | 3.1, 3.3 |
| 6.3 | Pre-seeded save state — for demo script (skip to month 12) | 🟡 testing | 1.1, full flow |
| 6.4 | Full flow test via Expo Go | ⚪ to do | все вище |
| 6.5 | Onboarding UI polish — fix visual issues in NicknameScreen + ComicOnboarding | ⚪ to do | 2.2, 2.3 |
