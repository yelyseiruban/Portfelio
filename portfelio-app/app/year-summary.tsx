import { useEffect, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Colors } from '../constants/colors'
import { usePickerScroll } from '../contexts/PickerVisibility'
import { useGameStore, selectNetWorth, type AssetId } from '../store/gameStore'
import IQBar from '../components/IQBar'

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://portfelio-backend.fly.dev:3000'

const INITIAL_WALLET = 1000
const MONTHLY_INCOME = 400
const TOTAL_INCOME = INITIAL_WALLET + MONTHLY_INCOME * 12 // 5800 PLN total put in

const ASSET_NAMES: Record<string, { pl: string; en: string }> = {
  savings_account: { pl: 'PKO Konto Oszczędnościowe', en: 'PKO Savings Account' },
  deposit:         { pl: 'PKO Depozyt',               en: 'PKO Deposit' },
  bonds:           { pl: 'Obligacje skarbowe',         en: 'Government Bonds' },
  pko_tfi:         { pl: 'PKO TFI',                   en: 'PKO TFI' },
  sp500_etf:       { pl: 'S&P 500 ETF',               en: 'S&P 500 ETF' },
  eth:             { pl: 'ETH (Ethereum)',             en: 'ETH (Ethereum)' },
}

const IQ_COLORS = {
  budgeting: '#F59E0B',
  investing: '#3B82F6',
  risk:      '#10B981',
  saving:    '#A78BFA',
}

export default function YearSummaryScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const posted = useRef(false)

  const nickname = useGameStore(s => s.nickname)
  const language = useGameStore(s => s.language)
  const financialIQ = useGameStore(s => s.financialIQ)
  const investments = useGameStore(s => s.investments)
  const monthlyHistory = useGameStore(s => s.monthlyHistory)
  const netWorth = useGameStore(selectNetWorth)

  const totalReturn = ((netWorth - TOTAL_INCOME) / TOTAL_INCOME) * 100
  const isPositive = totalReturn >= 0

  const iqTotal = Math.round(
    (financialIQ.budgeting + financialIQ.investing + financialIQ.risk + financialIQ.saving) / 4
  )

  // Best/worst by % return among held investments
  const assetResults = Object.entries(investments).map(([id, inv]) => ({
    id,
    pct: inv ? ((inv.currentValue - inv.amountInvested) / inv.amountInvested) * 100 : 0,
    pln: inv ? inv.currentValue - inv.amountInvested : 0,
  }))
  const best = assetResults.sort((a, b) => b.pct - a.pct)[0]
  const worst = assetResults[assetResults.length - 1]

  // Post score to leaderboard once
  useEffect(() => {
    if (posted.current || !nickname) return
    posted.current = true

    const totalDecisions = monthlyHistory.reduce((acc, m) => acc + m.actions.length, 0)

    fetch(`${BACKEND_URL}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname,
        financialIQ: iqTotal,
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        decisions: totalDecisions,
      }),
    }).catch(() => {}) // silent fail for hackathon
  }, [])

  const lang = language as 'pl' | 'en'
  const { onScroll } = usePickerScroll()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('year_summary.title')}</Text>
        <Text style={styles.nickname}>{nickname}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} onScroll={onScroll} scrollEventThrottle={16}>

        {/* Net worth hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{t('month.net_worth')}</Text>
          <Text style={styles.heroValue}>{netWorth.toFixed(0)} PLN</Text>
          <Text style={[styles.returnBadge, { color: isPositive ? Colors.success : Colors.danger }]}>
            {isPositive ? '+' : ''}{totalReturn.toFixed(1)}% {t('year_summary.total_return')}
          </Text>
        </View>

        {/* Best/Worst */}
        {best && (
          <View style={styles.row}>
            <View style={[styles.halfCard, { borderColor: Colors.success + '60' }]}>
              <Text style={styles.halfLabel}>{t('year_summary.best_decision')}</Text>
              <Text style={styles.halfAsset}>
                {ASSET_NAMES[best.id]?.[lang] ?? best.id}
              </Text>
              <Text style={[styles.halfReturn, { color: Colors.success }]}>
                +{best.pct.toFixed(1)}%
              </Text>
            </View>
            {worst && worst.id !== best.id && (
              <View style={[styles.halfCard, { borderColor: Colors.danger + '60' }]}>
                <Text style={styles.halfLabel}>{t('year_summary.worst_decision')}</Text>
                <Text style={styles.halfAsset}>
                  {ASSET_NAMES[worst.id]?.[lang] ?? worst.id}
                </Text>
                <Text style={[styles.halfReturn, { color: Colors.danger }]}>
                  {worst.pct.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Financial IQ */}
        <View style={styles.iqCard}>
          <View style={styles.iqHeader}>
            <Text style={styles.iqTitle}>{t('year_summary.financial_iq')}</Text>
            <Text style={styles.iqTotal}>{iqTotal}</Text>
          </View>

          <IQBar label={t('year_summary.iq_budgeting')} value={financialIQ.budgeting} color={IQ_COLORS.budgeting} />
          <IQBar label={t('year_summary.iq_investing')} value={financialIQ.investing} color={IQ_COLORS.investing} />
          <IQBar label={t('year_summary.iq_risk')}      value={financialIQ.risk}      color={IQ_COLORS.risk} />
          <IQBar label={t('year_summary.iq_saving')}    value={financialIQ.saving}    color={IQ_COLORS.saving} />
        </View>

        {/* Asset breakdown */}
        {assetResults.length > 0 && (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>
              {lang === 'pl' ? 'Podział portfela' : 'Portfolio breakdown'}
            </Text>
            {Object.entries(investments).map(([id, inv]) => {
              if (!inv) return null
              const pct = ((inv.currentValue - inv.amountInvested) / inv.amountInvested) * 100
              const isUp = pct >= 0
              return (
                <View key={id} style={styles.breakdownRow}>
                  <Text style={styles.breakdownAsset} numberOfLines={1}>
                    {ASSET_NAMES[id]?.[lang] ?? id}
                  </Text>
                  <Text style={styles.breakdownValue}>{inv.currentValue.toFixed(0)} PLN</Text>
                  <Text style={[styles.breakdownPct, { color: isUp ? Colors.success : Colors.danger }]}>
                    {isUp ? '+' : ''}{pct.toFixed(1)}%
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.leaderboardBtn}
          onPress={() => router.replace('/leaderboard')}
        >
          <Text style={styles.leaderboardBtnText}>{t('year_summary.see_leaderboard')} →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  nickname: { color: Colors.subtext, fontSize: 14, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroLabel: { color: Colors.subtext, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  heroValue: { color: Colors.text, fontSize: 40, fontWeight: '800', marginTop: 4 },
  returnBadge: { fontSize: 18, fontWeight: '700', marginTop: 4 },

  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  halfCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  halfLabel: { color: Colors.subtext, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  halfAsset: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  halfReturn: { fontSize: 16, fontWeight: '800', marginTop: 4 },

  iqCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iqTitle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  iqTotal: { color: Colors.primary, fontSize: 28, fontWeight: '800' },

  breakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  breakdownTitle: { color: Colors.text, fontSize: 14, fontWeight: '700', marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  breakdownAsset: { flex: 1, color: Colors.subtext, fontSize: 13 },
  breakdownValue: { color: Colors.text, fontSize: 13, fontWeight: '600', marginRight: 8 },
  breakdownPct: { fontSize: 13, fontWeight: '700', minWidth: 52, textAlign: 'right' },

  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  leaderboardBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  leaderboardBtnText: { color: Colors.text, fontSize: 16, fontWeight: '800' },
})
