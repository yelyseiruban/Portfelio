import { useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { Colors } from '../../constants/colors'
import { useGameStore, selectTotalPortfolioValue, selectNetWorth, selectLoanWarning, type AssetId } from '../../store/gameStore'
import { usePickerScroll } from '../../contexts/PickerVisibility'
import AssetCard from '../../components/AssetCard'
import LoanWidget from '../../components/LoanWidget'
import TutorialOverlay from '../../components/TutorialOverlay'

const DEMO_STATE = {
  nickname: 'Demo',
  currentMonth: 11,
  wallet: 1350,
  investments: {
    sp500_etf: { amountInvested: 2200, currentValue: 2380 },
    savings_account: { amountInvested: 1000, currentValue: 1042 },
    eth: { amountInvested: 600, currentValue: 455 },
    pko_tfi: { amountInvested: 800, currentValue: 836 },
  },
  loan: { active: false, amount: 0, monthlyRepayment: 0, monthsRemaining: 0 },
  financialIQ: { budgeting: 64, investing: 73, risk: 52, saving: 67 },
  monthlyHistory: Array.from({ length: 10 }, (_, i) => ({
    month: i + 1, walletStart: 1000, walletEnd: 1200,
    actions: [], portfolioValue: 4200, loanRepaymentPaid: 0,
  })),
  currentMonthActions: [],
  tutorialDone: true,
}

import savingsData from '../data/assets/savings_account.json'
import depositData from '../data/assets/deposit.json'
import bondsData from '../data/assets/bonds.json'
import pkoTfiData from '../data/assets/pko_tfi.json'
import sp500Data from '../data/assets/sp500_etf.json'
import ethData from '../data/assets/eth.json'

const ALL_ASSETS: any[] = [savingsData, depositData, bondsData, pkoTfiData, sp500Data, ethData]

export default function MonthScreen() {
  const router = useRouter()
  const { t } = useTranslation()

  const currentMonth = useGameStore(s => s.currentMonth)
  const wallet = useGameStore(s => s.wallet)
  const investments = useGameStore(s => s.investments)
  const loanWarning = useGameStore(selectLoanWarning)
  const totalPortfolio = useGameStore(selectTotalPortfolioValue)
  const netWorth = useGameStore(selectNetWorth)

  const { onScroll } = usePickerScroll()
  const loadSaveState = useGameStore(s => s.loadSaveState)
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMonthLabelTap = () => {
    tapCountRef.current += 1
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0 }, 1500)
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      loadSaveState(DEMO_STATE as any)
    }
  }


  if (currentMonth === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>{t('common.loading')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleMonthLabelTap} activeOpacity={1}>
          <Text style={styles.monthLabel}>{t('month.title', { month: currentMonth })}</Text>
        </TouchableOpacity>
        <Text style={styles.netWorth}>{netWorth.toFixed(0)} PLN</Text>
        <Text style={styles.netWorthLabel}>{t('month.net_worth')}</Text>
      </View>

      {/* Loan warning */}
      {loanWarning && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{t('month.loan_warning')}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Wallet + Portfolio summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('month.wallet')}</Text>
            <Text style={styles.summaryValue}>{wallet.toFixed(0)} PLN</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('month.investments')}</Text>
            <Text style={styles.summaryValue}>{totalPortfolio.toFixed(0)} PLN</Text>
          </View>
        </View>

        {/* Asset list */}
        <Text style={styles.sectionTitle}>{t('month.investments')}</Text>
        {ALL_ASSETS.map(asset => (
          <AssetCard
            key={asset.id}
            assetId={asset.id as AssetId}
            name={t(`assets.${asset.id}`)}
            riskLevel={asset.riskLevel}
            annualReturnPct={asset.annualReturnPct}
            gameYear={asset.gameYear}
            currentMonth={currentMonth}
          />
        ))}

        {/* Loan widget */}
        <Text style={styles.sectionTitle}>{t('loan.title')}</Text>
        <LoanWidget />

        <View style={{ height: 24 }} />
      </ScrollView>

      <TutorialOverlay />

      {/* End month button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.endBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            router.push('/month-summary')
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.endBtnText}>{t('month.end_month')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  empty: { color: Colors.subtext, fontSize: 16 },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  monthLabel: { color: Colors.subtext, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  netWorth: { color: Colors.text, fontSize: 32, fontWeight: '800', marginTop: 4 },
  netWorthLabel: { color: Colors.subtext, fontSize: 12, marginTop: 2 },

  warning: {
    backgroundColor: Colors.danger + '20',
    borderBottomWidth: 1,
    borderBottomColor: Colors.danger + '40',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  warningText: { color: Colors.danger, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: { color: Colors.subtext, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { color: Colors.text, fontSize: 18, fontWeight: '700' },

  sectionTitle: { color: Colors.subtext, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },

  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  endBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  endBtnText: { color: Colors.text, fontSize: 16, fontWeight: '800' },
})
