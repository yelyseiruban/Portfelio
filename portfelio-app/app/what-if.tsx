import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Colors } from '../constants/colors'
import { usePickerScroll } from '../contexts/PickerVisibility'
import { ANTHROPIC_API_KEY } from '../constants/api'
import { useGameStore } from '../store/gameStore'

import savingsData from './data/assets/savings_account.json'
import depositData from './data/assets/deposit.json'
import bondsData from './data/assets/bonds.json'
import pkoTfiData from './data/assets/pko_tfi.json'
import sp500Data from './data/assets/sp500_etf.json'
import ethData from './data/assets/eth.json'

const ALL_ASSETS: any[] = [savingsData, depositData, bondsData, pkoTfiData, sp500Data, ethData]

async function fetchWhatIf(
  language: string,
  chosenAsset: string,
  alternativeAsset: string,
  chosenAmount: number,
  currentMonth: number,
  chosenReturn: number,
  altReturn: number
): Promise<string> {
  if (!ANTHROPIC_API_KEY) return language === 'pl'
    ? 'Symulacja niedostępna — brak klucza API.'
    : 'Simulation unavailable — API key missing.'

  const system = `You are a financial assistant in a mobile game. Always respond in ${language === 'pl' ? 'Polish' : 'English'}.`
  const user = `The player invested ${chosenAmount.toFixed(0)} PLN in ${chosenAsset} in month ${currentMonth}. It returned ${chosenReturn >= 0 ? '+' : ''}${chosenReturn.toFixed(1)}%. If they had chosen ${alternativeAsset} instead, it would have returned ${altReturn >= 0 ? '+' : ''}${altReturn.toFixed(1)}% — a difference of ${(altReturn - chosenReturn).toFixed(1)}%. Describe in 3 sentences what would have happened. Be specific with numbers. Neutral tone.`

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

export default function WhatIfScreen() {
  const router = useRouter()
  const { t } = useTranslation()

  const language = useGameStore(s => s.language)
  const currentMonth = useGameStore(s => s.currentMonth)
  const investments = useGameStore(s => s.investments)
  const currentMonthActions = useGameStore(s => s.currentMonthActions)

  // Pick the biggest buy action this month as the "chosen" decision
  const biggestBuy = [...currentMonthActions]
    .filter(a => a.type === 'buy')
    .sort((a, b) => b.amount - a.amount)[0]

  const chosenAsset = biggestBuy
    ? ALL_ASSETS.find(a => a.id === biggestBuy.assetId)
    : null

  // Pick an alternative: asset with biggest return delta vs chosen
  const alternativeAsset = ALL_ASSETS.find(a =>
    a.id !== biggestBuy?.assetId &&
    a.gameYear?.find((m: any) => m.month === currentMonth)
  ) ?? ALL_ASSETS[0]

  const getMonthReturn = (asset: any) => {
    const prev = asset.gameYear?.find((m: any) => m.month === currentMonth - 1)
    const curr = asset.gameYear?.find((m: any) => m.month === currentMonth)
    if (!prev || !curr) return 0
    return ((curr.valuePct - prev.valuePct) / prev.valuePct) * 100
  }

  const chosenReturn = chosenAsset ? getMonthReturn(chosenAsset) : 0
  const altReturn = getMonthReturn(alternativeAsset)

  const { onScroll } = usePickerScroll()
  const [narrative, setNarrative] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedAlt, setSelectedAlt] = useState(alternativeAsset?.id ?? '')

  useEffect(() => {
    if (!chosenAsset) {
      setLoading(false)
      return
    }
    const alt = ALL_ASSETS.find(a => a.id === selectedAlt) ?? alternativeAsset
    setLoading(true)
    fetchWhatIf(
      language,
      t(`assets.${chosenAsset.id}`),
      t(`assets.${alt.id}`),
      biggestBuy?.amount ?? 0,
      currentMonth,
      chosenReturn,
      getMonthReturn(alt)
    ).then(setNarrative).finally(() => setLoading(false))
  }, [selectedAlt])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('summary.what_if')}</Text>
        <Text style={styles.subtitle}>
          {t('month.title', { month: currentMonth })}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} onScroll={onScroll} scrollEventThrottle={16} scrollEnabled={false}>
        {!chosenAsset ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {language === 'pl'
                ? 'Brak transakcji w tym miesiącu — nic do porównania.'
                : 'No transactions this month — nothing to compare.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Chosen decision */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>
                {language === 'pl' ? 'Twój wybór' : 'Your choice'}
              </Text>
              <Text style={styles.assetName}>{t(`assets.${chosenAsset.id}`)}</Text>
              <Text style={styles.amount}>{biggestBuy?.amount.toFixed(0)} PLN</Text>
              <Text style={[styles.returnText, { color: chosenReturn >= 0 ? Colors.success : Colors.danger }]}>
                {chosenReturn >= 0 ? '+' : ''}{chosenReturn.toFixed(2)}% {language === 'pl' ? 'w tym miesiącu' : 'this month'}
              </Text>
            </View>

            {/* Alternative selector */}
            <Text style={styles.sectionLabel}>
              {language === 'pl' ? 'Co gdyby zamiast tego…' : 'What if instead…'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.altScroll}>
              {ALL_ASSETS.filter(a => a.id !== chosenAsset.id).map(alt => {
                const r = getMonthReturn(alt)
                const isSelected = alt.id === selectedAlt
                return (
                  <TouchableOpacity
                    key={alt.id}
                    style={[styles.altChip, isSelected && styles.altChipSelected]}
                    onPress={() => setSelectedAlt(alt.id)}
                  >
                    <Text style={[styles.altChipText, isSelected && styles.altChipTextSelected]}>
                      {t(`assets.${alt.id}`)}
                    </Text>
                    <Text style={[styles.altReturn, { color: r >= 0 ? Colors.success : Colors.danger }]}>
                      {r >= 0 ? '+' : ''}{r.toFixed(1)}%
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {/* AI Narrative */}
            <View style={styles.aiCard}>
              <Text style={styles.aiLabel}>AI</Text>
              {loading
                ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 10 }} />
                : <Text style={styles.aiText}>{narrative}</Text>
              }
            </View>

            {/* Delta */}
            {!loading && (
              <View style={styles.deltaCard}>
                {(() => {
                  const alt = ALL_ASSETS.find(a => a.id === selectedAlt) ?? alternativeAsset
                  const delta = getMonthReturn(alt) - chosenReturn
                  const amount = biggestBuy?.amount ?? 0
                  const plnDelta = (delta / 100) * amount
                  return (
                    <>
                      <Text style={styles.deltaLabel}>
                        {language === 'pl' ? 'Różnica zwrotu' : 'Return difference'}
                      </Text>
                      <Text style={[styles.deltaValue, { color: delta >= 0 ? Colors.success : Colors.danger }]}>
                        {delta >= 0 ? '+' : ''}{delta.toFixed(2)}% ({plnDelta >= 0 ? '+' : ''}{plnDelta.toFixed(0)} PLN)
                      </Text>
                    </>
                  )
                })()}
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: Colors.primary, fontSize: 15 },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: Colors.subtext, fontSize: 13, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: { color: Colors.subtext, fontSize: 14, textAlign: 'center' },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: { color: Colors.subtext, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  assetName: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  amount: { color: Colors.subtext, fontSize: 14, marginTop: 2 },
  returnText: { fontSize: 15, fontWeight: '700', marginTop: 4 },

  sectionLabel: { color: Colors.subtext, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },

  altScroll: { marginBottom: 16 },
  altChip: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 100,
  },
  altChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
  altChipText: { color: Colors.subtext, fontSize: 12, fontWeight: '600' },
  altChipTextSelected: { color: Colors.primary },
  altReturn: { fontSize: 13, fontWeight: '700', marginTop: 2 },

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

  deltaCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  deltaLabel: { color: Colors.subtext, fontSize: 12, marginBottom: 4 },
  deltaValue: { fontSize: 20, fontWeight: '800' },
})
