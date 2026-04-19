import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Colors } from '../constants/colors'
import { usePickerScroll, usePickerOffset } from '../contexts/PickerVisibility'
import { ANTHROPIC_API_KEY } from '../constants/api'
import { useGameStore, selectTotalPortfolioValue, selectNetWorth } from '../store/gameStore'

async function fetchMonthlySummary(
  language: string,
  month: number,
  walletDelta: number,
  portfolioValue: number,
  actions: { type: string; assetId: string; amount: number }[]
): Promise<string> {
  if (!ANTHROPIC_API_KEY) return language === 'pl'
    ? 'Podsumowanie miesiąca niedostępne — brak klucza API.'
    : 'Monthly summary unavailable — API key missing.'

  const actionsSummary = actions.length > 0
    ? actions.map(a => `${a.type} ${a.assetId} ${a.amount.toFixed(0)} PLN`).join(', ')
    : (language === 'pl' ? 'brak transakcji' : 'no transactions')

  const system = `You are a concise financial coach in a simulation game. Always respond in ${language === 'pl' ? 'Polish' : 'English'}.`
  const user = `The player just completed month ${month} of 12. Actions this month: ${actionsSummary}. Portfolio value: ${portfolioValue.toFixed(0)} PLN. Summarize what they did and one key observation. Max 3 sentences. No jargon.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  const data = await res.json()
  return data?.content?.[0]?.text ?? (language === 'pl' ? 'Błąd API.' : 'API error.')
}

export default function MonthSummaryScreen() {
  const router = useRouter()
  const { t } = useTranslation()

  const currentMonth = useGameStore(s => s.currentMonth)
  const language = useGameStore(s => s.language)
  const wallet = useGameStore(s => s.wallet)
  const currentMonthActions = useGameStore(s => s.currentMonthActions)
  const monthlyHistory = useGameStore(s => s.monthlyHistory)
  const advanceMonth = useGameStore(s => s.advanceMonth)
  const portfolioValue = useGameStore(selectTotalPortfolioValue)
  const netWorth = useGameStore(selectNetWorth)

  const prevRecord = monthlyHistory[monthlyHistory.length - 1]
  const walletDelta = prevRecord ? wallet - prevRecord.walletStart : 0

  const { onScroll } = usePickerScroll()
  usePickerOffset(-20)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchMonthlySummary(language, currentMonth, walletDelta, portfolioValue, currentMonthActions)
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [])

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    advanceMonth()
    if (currentMonth >= 12) {
      router.replace('/year-summary')
    } else {
      router.replace('/(tabs)/game')
    }
  }

  const nextMonthLabel = currentMonth >= 12
    ? t('year_summary.title')
    : t('summary.next_month', { month: currentMonth + 1 })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('summary.title', { month: currentMonth })}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} onScroll={onScroll} scrollEventThrottle={16}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label={t('month.wallet')} value={`${wallet.toFixed(0)} PLN`} />
          <StatCard label={t('month.net_worth')} value={`${netWorth.toFixed(0)} PLN`} />
        </View>

        {/* Portfolio change */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('summary.portfolio_change')}</Text>
          <Text style={styles.portfolioValue}>{portfolioValue.toFixed(0)} PLN</Text>
        </View>

        {/* AI Summary */}
        <View style={styles.aiCard}>
          <Text style={styles.aiLabel}>AI</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
          ) : (
            <Text style={styles.aiText}>{summary}</Text>
          )}
        </View>

        {/* What if button */}
        <TouchableOpacity
          style={styles.whatIfBtn}
          onPress={() => router.push('/what-if')}
        >
          <Text style={styles.whatIfText}>{t('summary.what_if')}</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>{nextMonthLabel} →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={statStyles.value}>{value}</Text>
    </View>
  )
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { color: Colors.subtext, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  value: { color: Colors.text, fontSize: 18, fontWeight: '700' },
})

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

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: { color: Colors.subtext, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  portfolioValue: { color: Colors.text, fontSize: 24, fontWeight: '700' },

  aiCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  aiLabel: { color: Colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  aiText: { color: Colors.text, fontSize: 15, lineHeight: 22, marginTop: 8 },

  whatIfBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  whatIfText: { color: Colors.subtext, fontSize: 14 },

  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: Colors.text, fontSize: 16, fontWeight: '800' },
})
