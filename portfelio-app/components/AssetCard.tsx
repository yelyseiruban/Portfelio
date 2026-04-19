import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Svg, { Polyline } from 'react-native-svg'
import { useTranslation } from 'react-i18next'
import { Colors } from '../constants/colors'
import { useGameStore, type AssetId } from '../store/gameStore'

const RISK_COLOR: Record<string, string> = {
  none:     Colors.success,
  very_low: Colors.success,
  low:      '#60A5FA',
  medium:   Colors.warning,
  high:     Colors.danger,
}

interface Props {
  assetId: AssetId
  name: string
  riskLevel: string
  annualReturnPct: number | null
  gameYear: { month: number; valuePct: number }[]
  currentMonth: number
}

function sparkline(points: { month: number; valuePct: number }[]): string {
  if (points.length < 2) return ''
  const w = 64, h = 32, pad = 2
  const vals = points.map(p => p.valuePct)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  return points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2)
      const y = h - pad - ((p.valuePct - min) / range) * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function AssetCard({ assetId, name, riskLevel, annualReturnPct, gameYear, currentMonth }: Props) {
  const router = useRouter()
  const { t } = useTranslation()
  const investment = useGameStore(s => s.investments[assetId])

  const visiblePoints = gameYear.filter(p => p.month <= currentMonth)
  const path = sparkline(visiblePoints)

  const returnPct = investment
    ? ((investment.currentValue - investment.amountInvested) / investment.amountInvested) * 100
    : null
  const isUp = returnPct != null && returnPct >= 0
  const riskColor = RISK_COLOR[riskLevel] ?? Colors.subtext

  const riskKey = riskLevel === 'very_low' ? 'asset.risk_very_low'
    : riskLevel === 'none' ? 'asset.risk_very_low'
    : `asset.risk_${riskLevel}`

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/asset/${assetId}` as any)}
      activeOpacity={0.75}
    >
      <View style={styles.left}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={[styles.badge, { backgroundColor: riskColor + '25' }]}>
            <Text style={[styles.badgeText, { color: riskColor }]}>{t(riskKey)}</Text>
          </View>
        </View>

        {investment ? (
          <View style={styles.valueRow}>
            <Text style={styles.value}>{investment.currentValue.toFixed(0)} PLN</Text>
            <Text style={[styles.ret, { color: isUp ? Colors.success : Colors.danger }]}>
              {isUp ? '+' : ''}{returnPct!.toFixed(1)}%
            </Text>
          </View>
        ) : (
          <Text style={styles.sub}>
            {annualReturnPct != null
              ? t('asset.annual_return', { pct: annualReturnPct })
              : t('asset.risk_high')}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        {path ? (
          <Svg width={64} height={32}>
            <Polyline
              points={path}
              fill="none"
              stroke={investment ? (isUp ? Colors.success : Colors.danger) : Colors.muted}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        ) : (
          <View style={{ width: 64 }} />
        )}
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  left: { flex: 1, marginRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { color: Colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  ret: { fontSize: 13, fontWeight: '600' },
  sub: { color: Colors.subtext, fontSize: 12 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { color: Colors.subtext, fontSize: 20 },
})
