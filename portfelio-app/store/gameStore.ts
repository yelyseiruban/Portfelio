import i18n from '../i18n'
import { create } from 'zustand'

import savingsJson from '../app/data/assets/savings_account.json'
import depositJson from '../app/data/assets/deposit.json'
import bondsJson from '../app/data/assets/bonds.json'
import pkoTfiJson from '../app/data/assets/pko_tfi.json'
import sp500Json from '../app/data/assets/sp500_etf.json'
import ethJson from '../app/data/assets/eth.json'

const ASSET_GAME_YEARS: Partial<Record<string, { month: number; valuePct: number }[]>> = {
  savings_account: savingsJson.gameYear as any,
  deposit:         depositJson.gameYear as any,
  bonds:           bondsJson.gameYear as any,
  pko_tfi:         pkoTfiJson.gameYear as any,
  sp500_etf:       sp500Json.gameYear as any,
  eth:             ethJson.gameYear as any,
}

export type AssetId =
  | 'wallet'
  | 'savings_account'
  | 'deposit'
  | 'bonds'
  | 'pko_tfi'
  | 'sp500_etf'
  | 'eth'

export type Language = 'en' | 'pl'

export interface Investment {
  amountInvested: number
  currentValue: number
  lockedUntilMonth?: number
}

export interface Loan {
  active: boolean
  amount: number
  monthlyRepayment: number
  monthsRemaining: number
}

export interface MonthRecord {
  month: number
  walletStart: number
  walletEnd: number
  actions: MonthAction[]
  portfolioValue: number
  loanRepaymentPaid: number
}

export interface MonthAction {
  type: 'buy' | 'withdraw' | 'take_loan'
  assetId: AssetId
  amount: number
  fee?: number
}

export interface FinancialIQ {
  budgeting: number
  investing: number
  risk: number
  saving: number
}

export interface GameState {
  nickname: string
  language: Language
  currentMonth: number
  wallet: number
  loan: Loan
  investments: Partial<Record<AssetId, Investment>>
  monthlyHistory: MonthRecord[]
  financialIQ: FinancialIQ
  currentMonthActions: MonthAction[]
  tutorialDone: boolean

  // Actions
  setNickname: (nickname: string) => void
  setLanguage: (language: Language) => void
  setTutorialDone: () => void
  startGame: () => void
  buyAsset: (assetId: AssetId, amount: number, fee: number, lockedUntilMonth?: number) => void
  withdrawAsset: (assetId: AssetId, amount: number, fee: number) => void
  updateAssetValue: (assetId: AssetId, newValue: number) => void
  takeLoan: (amount: number, monthlyRepayment: number, months: number) => void
  advanceMonth: () => void
  updateFinancialIQ: (delta: Partial<FinancialIQ>) => void
  loadSaveState: (state: Partial<GameState>) => void
  resetGame: () => void
}

const STARTING_WALLET = 1000
const MONTHLY_INCOME = 400

const SAFE_ASSETS: AssetId[] = ['savings_account', 'deposit', 'bonds', 'pko_tfi']
const ALL_INVESTABLE: AssetId[] = ['savings_account', 'deposit', 'bonds', 'pko_tfi', 'sp500_etf', 'eth']

function computeMonthlyIQDelta(
  investments: Partial<Record<AssetId, Investment>>,
  wallet: number,
  loan: Loan,
  actions: MonthAction[]
): Partial<FinancialIQ> {
  const portfolioValue = Object.values(investments).reduce((s, i) => s + (i?.currentValue ?? 0), 0)
  const netWorth = wallet + portfolioValue
  const walletRatio = netWorth > 0 ? wallet / netWorth : 1
  const uniqueAssets = ALL_INVESTABLE.filter(id => (investments[id]?.currentValue ?? 0) > 0).length
  const safeAssets = SAFE_ASSETS.filter(id => (investments[id]?.currentValue ?? 0) > 0).length
  const ethValue = investments['eth']?.currentValue ?? 0
  const sp500Value = investments['sp500_etf']?.currentValue ?? 0
  const ethPortfolioPct = portfolioValue > 0 ? ethValue / portfolioValue : 0
  const boughtThisMonth = actions.filter(a => a.type === 'buy').length > 0

  const totalGainLoss = ALL_INVESTABLE.reduce((s, id) => {
    const inv = investments[id]
    return inv ? s + (inv.currentValue - inv.amountInvested) : s
  }, 0)

  // --- SAVING: rewards parking money in safe instruments ---
  let saving = 0
  saving += safeAssets * 2                            // +2 per safe asset held
  if (walletRatio > 0.8 && !boughtThisMonth) saving -= 5  // idle — everything in wallet
  if (portfolioValue > 0 && walletRatio < 0.5) saving += 2 // majority deployed

  // --- INVESTING: rewards growth and diversification ---
  let investing = 0
  investing += Math.min(uniqueAssets * 2, 8)          // +2 per asset type, max +8
  if (totalGainLoss > 50) investing += 3              // portfolio growing
  if (totalGainLoss < -100) investing -= 4            // real losses
  if (portfolioValue === 0 && !boughtThisMonth) investing -= 5  // month wasted
  if (sp500Value > 0 || safeAssets >= 2) investing += 2  // productive assets

  // --- RISK: rewards balance, penalizes recklessness ---
  let risk = 0
  if (uniqueAssets >= 3) risk += 3                    // diversified
  if (ethPortfolioPct > 0.6) risk -= 5               // over-concentrated in crypto
  if (ethPortfolioPct > 0 && ethPortfolioPct <= 0.25 && uniqueAssets >= 3) risk += 3  // small crypto + diversified
  if (loan.active && ethValue > 0) risk -= 6         // borrowed money in crypto
  if (portfolioValue === 0 && wallet > 0) risk -= 2  // no risk management at all

  // --- BUDGETING: rewards cash flow discipline ---
  let budgeting = 0
  if (loan.active) {
    if (wallet >= loan.monthlyRepayment * 2) budgeting += 3
    else if (wallet < loan.monthlyRepayment) budgeting -= 6
  }
  if (walletRatio < 0.08) budgeting -= 3             // wallet nearly empty
  if (walletRatio >= 0.15 && walletRatio <= 0.45) budgeting += 2  // healthy buffer

  return {
    saving: Math.round(saving),
    investing: Math.round(investing),
    risk: Math.round(risk),
    budgeting: Math.round(budgeting),
  }
}

const defaultLoan: Loan = {
  active: false,
  amount: 0,
  monthlyRepayment: 0,
  monthsRemaining: 0,
}

const defaultIQ: FinancialIQ = {
  budgeting: 50,
  investing: 50,
  risk: 50,
  saving: 50,
}

export const useGameStore = create<GameState>((set, get) => ({
  nickname: '',
  language: 'en',
  currentMonth: 0,
  wallet: STARTING_WALLET,
  loan: defaultLoan,
  investments: {},
  monthlyHistory: [],
  financialIQ: { ...defaultIQ },
  currentMonthActions: [],
  tutorialDone: false,

  setNickname: (nickname) => set({ nickname }),
  setTutorialDone: () => set({ tutorialDone: true }),

  setLanguage: (language) => {
    i18n.changeLanguage(language)
    set({ language })
  },

  startGame: () =>
    set({
      currentMonth: 1,
      wallet: STARTING_WALLET,
      loan: defaultLoan,
      investments: {},
      monthlyHistory: [],
      financialIQ: { ...defaultIQ },
      currentMonthActions: [],
    }),

  buyAsset: (assetId, amount, fee, lockedUntilMonth) => {
    const { wallet, investments, currentMonthActions } = get()
    const totalCost = amount + fee
    if (wallet < totalCost) return

    const existing = investments[assetId]
    const newInvestment: Investment = {
      amountInvested: (existing?.amountInvested ?? 0) + amount,
      currentValue: (existing?.currentValue ?? 0) + amount,
      ...(lockedUntilMonth != null ? { lockedUntilMonth } : {}),
    }

    set({
      wallet: wallet - totalCost,
      investments: { ...investments, [assetId]: newInvestment },
      currentMonthActions: [
        ...currentMonthActions,
        { type: 'buy', assetId, amount, fee },
      ],
    })
  },

  withdrawAsset: (assetId, amount, fee) => {
    const { wallet, investments, currentMonth, currentMonthActions } = get()
    const existing = investments[assetId]
    if (!existing) return
    if (existing.lockedUntilMonth != null && existing.lockedUntilMonth > currentMonth) return
    if (existing.currentValue < amount) return

    const received = amount - fee
    const remaining = existing.currentValue - amount

    const updated = { ...investments }
    if (remaining <= 0) {
      delete updated[assetId]
    } else {
      const ratio = remaining / existing.currentValue
      updated[assetId] = {
        amountInvested: existing.amountInvested * ratio,
        currentValue: remaining,
        lockedUntilMonth: existing.lockedUntilMonth,
      }
    }

    set({
      wallet: wallet + received,
      investments: updated,
      currentMonthActions: [
        ...currentMonthActions,
        { type: 'withdraw', assetId, amount, fee },
      ],
    })
  },

  updateAssetValue: (assetId, newValue) => {
    const { investments } = get()
    const existing = investments[assetId]
    if (!existing) return
    set({
      investments: {
        ...investments,
        [assetId]: { ...existing, currentValue: newValue },
      },
    })
  },

  takeLoan: (amount, monthlyRepayment, months) => {
    const { wallet, currentMonthActions } = get()
    set({
      wallet: wallet + amount,
      loan: { active: true, amount, monthlyRepayment, monthsRemaining: months },
      currentMonthActions: [
        ...currentMonthActions,
        { type: 'take_loan', assetId: 'wallet', amount },
      ],
    })
  },

  advanceMonth: () => {
    const { currentMonth, wallet, loan, investments, monthlyHistory, currentMonthActions } = get()

    let newWallet = wallet
    let newLoan = { ...loan }
    let repaymentPaid = 0

    // Deduct loan repayment
    if (loan.active) {
      repaymentPaid = loan.monthlyRepayment
      newWallet -= loan.monthlyRepayment
      newLoan.monthsRemaining -= 1
      if (newLoan.monthsRemaining <= 0) {
        newLoan = defaultLoan
      }
    }

    // Add monthly income
    newWallet += MONTHLY_INCOME

    const record: MonthRecord = {
      month: currentMonth,
      walletStart: wallet,
      walletEnd: newWallet,
      actions: currentMonthActions,
      portfolioValue: Object.values(investments).reduce((sum, inv) => sum + (inv?.currentValue ?? 0), 0),
      loanRepaymentPaid: repaymentPaid,
    }

    // Apply this month's price movement to all held investments (runs exactly once here)
    const updatedInvestments: typeof investments = {}
    for (const [assetId, inv] of Object.entries(investments) as [string, Investment | undefined][]) {
      if (!inv) continue
      const gameYear = ASSET_GAME_YEARS[assetId]
      const prevPoint = gameYear?.find(m => m.month === currentMonth)
      const currPoint = gameYear?.find(m => m.month === currentMonth + 1)
      if (prevPoint && currPoint && prevPoint.valuePct > 0) {
        const ratio = currPoint.valuePct / prevPoint.valuePct
        updatedInvestments[assetId as AssetId] = { ...inv, currentValue: inv.currentValue * ratio }
      } else {
        updatedInvestments[assetId as AssetId] = inv
      }
    }

    const iqDelta = computeMonthlyIQDelta(investments, wallet, loan, currentMonthActions)
    const { financialIQ } = get()
    const newIQ: FinancialIQ = {
      budgeting: Math.min(100, Math.max(0, financialIQ.budgeting + (iqDelta.budgeting ?? 0))),
      investing: Math.min(100, Math.max(0, financialIQ.investing + (iqDelta.investing ?? 0))),
      risk: Math.min(100, Math.max(0, financialIQ.risk + (iqDelta.risk ?? 0))),
      saving: Math.min(100, Math.max(0, financialIQ.saving + (iqDelta.saving ?? 0))),
    }

    set({
      currentMonth: currentMonth + 1,
      wallet: newWallet,
      loan: newLoan,
      investments: updatedInvestments,
      monthlyHistory: [...monthlyHistory, record],
      currentMonthActions: [],
      financialIQ: newIQ,
    })
  },

  updateFinancialIQ: (delta) => {
    const { financialIQ } = get()
    set({
      financialIQ: {
        budgeting: Math.min(100, Math.max(0, financialIQ.budgeting + (delta.budgeting ?? 0))),
        investing: Math.min(100, Math.max(0, financialIQ.investing + (delta.investing ?? 0))),
        risk: Math.min(100, Math.max(0, financialIQ.risk + (delta.risk ?? 0))),
        saving: Math.min(100, Math.max(0, financialIQ.saving + (delta.saving ?? 0))),
      },
    })
  },

  loadSaveState: (state) => set(state),

  resetGame: () =>
    set({
      nickname: '',
      language: 'en',
      currentMonth: 0,
      wallet: STARTING_WALLET,
      loan: defaultLoan,
      investments: {},
      monthlyHistory: [],
      financialIQ: { ...defaultIQ },
      currentMonthActions: [],
    }),
}))

export const selectTotalPortfolioValue = (state: GameState) =>
  Object.values(state.investments).reduce((sum, inv) => sum + (inv?.currentValue ?? 0), 0)

export const selectNetWorth = (state: GameState) =>
  state.wallet + selectTotalPortfolioValue(state)

export const selectLoanWarning = (state: GameState) =>
  state.loan.active && state.wallet < state.loan.monthlyRepayment * 1.5
