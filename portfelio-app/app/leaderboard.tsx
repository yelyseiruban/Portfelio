import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Colors } from '../constants/colors'
import { usePickerScroll } from '../contexts/PickerVisibility'
import { useGameStore } from '../store/gameStore'

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://portfelio-backend.fly.dev/:3000'

interface LeaderboardEntry {
  nickname: string
  financialIQ: number
  totalReturn: number
  decisions: number
}

export default function LeaderboardScreen() {
  const router = useRouter()
  const { t } = useTranslation()
  const nickname = useGameStore(s => s.nickname)

  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${BACKEND_URL}/leaderboard`)
      const data = await res.json()
      setEntries(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const { onScroll } = usePickerScroll()
  const myRank = entries.findIndex(e => e.nickname === nickname) + 1

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('leaderboard.title')}</Text>
        {myRank > 0 && (
          <Text style={styles.myRank}>
            {nickname} · #{myRank}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {t('language') === 'pl'
              ? 'Brak połączenia z serwerem'
              : 'Cannot connect to server'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('leaderboard.empty')}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Column headers */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, { width: 36 }]}>#</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>{t('leaderboard.player')}</Text>
            <Text style={[styles.headerCell, { width: 72, textAlign: 'right' }]}>{t('leaderboard.iq_score')}</Text>
            <Text style={[styles.headerCell, { width: 72, textAlign: 'right' }]}>Return</Text>
          </View>

          {entries.map((entry, index) => {
            const isMe = entry.nickname === nickname
            const isTop3 = index < 3
            const medal = ['🥇', '🥈', '🥉'][index] ?? null

            return (
              <View
                key={`${entry.nickname}-${index}`}
                style={[styles.row, isMe && styles.myRow]}
              >
                <Text style={[styles.rank, isTop3 && styles.rankTop]}>
                  {medal ?? index + 1}
                </Text>
                <Text style={[styles.playerName, isMe && styles.myName]} numberOfLines={1}>
                  {entry.nickname}
                </Text>
                <Text style={[styles.iqScore, { color: Colors.primary }]}>
                  {entry.financialIQ}
                </Text>
                <Text style={[
                  styles.returnVal,
                  { color: entry.totalReturn >= 0 ? Colors.success : Colors.danger }
                ]}>
                  {entry.totalReturn >= 0 ? '+' : ''}{entry.totalReturn.toFixed(1)}%
                </Text>
              </View>
            )
          })}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { marginBottom: 8 },
  backText: { color: Colors.primary, fontSize: 15 },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  myRank: { color: Colors.accent, fontSize: 13, fontWeight: '700', marginTop: 4 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { color: Colors.subtext, fontSize: 15 },
  emptyText: { color: Colors.subtext, fontSize: 15 },
  retryBtn: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryText: { color: Colors.text, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    marginBottom: 4,
  },
  headerCell: { color: Colors.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  myRow: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  rank: { width: 36, color: Colors.subtext, fontSize: 14, fontWeight: '600' },
  rankTop: { fontSize: 18 },
  playerName: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: '600' },
  myName: { color: Colors.primary },
  iqScore: { width: 72, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  returnVal: { width: 72, fontSize: 13, fontWeight: '700', textAlign: 'right' },
})
