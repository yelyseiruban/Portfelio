import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native'
import { useTranslation } from 'react-i18next'
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg'
import { Colors } from '../../constants/colors'
import { usePickerScroll } from '../../contexts/PickerVisibility'
import {
  useGameStore,
  selectTotalPortfolioValue,
  selectNetWorth,
  type AssetId,
  type Investment,
} from '../../store/gameStore'
import IQBar from '../../components/IQBar'

const { width: SCREEN_W } = Dimensions.get('window')
const CHART_W = SCREEN_W - 32
const CHART_H = 130

const RISK_LEVEL: Partial<Record<AssetId, string>> = {
  savings_account: 'very_low',
  deposit:         'very_low',
  bonds:           'low',
  pko_tfi:         'low',
  sp500_etf:       'medium',
  eth:             'high',
}

const RISK_COLOR: Record<string, string> = {
  very_low: Colors.success,
  low:      '#60A5FA',
  medium:   Colors.warning,
  high:     Colors.danger,
}

const ASSET_COLOR: Record<AssetId, string> = {
  wallet:          Colors.muted,
  savings_account: Colors.success,
  deposit:         '#34D399',
  bonds:           '#60A5FA',
  pko_tfi:         Colors.primary,
  sp500_etf:       Colors.warning,
  eth:             Colors.danger,
}

function buildChart(values: number[], w: number, h: number) {
  if (values.length < 2) return null
  const pT = 12, pB = 8, pH = 0
  const iW = w - pH * 2
  const iH = h - pT - pB
  const min = Math.min(...values) * 0.96
  const max = Math.max(...values) * 1.04
  const range = max - min || 1
  const toX = (i: number) => pH + (i / (values.length - 1)) * iW
  const toY = (v: number) => pT + (1 - (v - min) / range) * iH
  const pts = values.map((v, i) => ({ x: toX(i), y: toY(v) }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const bot = pT + iH
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${bot} L${pts[0].x.toFixed(1)},${bot} Z`
  return { line, area, last: pts[pts.length - 1], first: pts[0] }
}

function riskTransKey(id: AssetId): string {
  const level = RISK_LEVEL[id]
  if (!level || level === 'very_low') return 'asset.risk_very_low'
  return `asset.risk_${level}`
}

export default function PortfolioTab() {
  const { t } = useTranslation()

  const currentMonth   = useGameStore(s => s.currentMonth)
  const wallet         = useGameStore(s => s.wallet)
  const investments    = useGameStore(s => s.investments)
  const monthlyHistory = useGameStore(s => s.monthlyHistory)
  const financialIQ    = useGameStore(s => s.financialIQ)
  const loan           = useGameStore(s => s.loan)
  const totalPortfolio = useGameStore(selectTotalPortfolioValue)
  const netWorth       = useGameStore(selectNetWorth)
  const { onScroll }   = usePickerScroll()

  if (currentMonth === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>{t('portfolio.no_game')}</Text>
      </View>
    )
  }

  // Net worth history: starting capital + each completed month + current
  const historyValues: number[] = [1000]
  for (const r of monthlyHistory) historyValues.push(r.walletEnd + r.portfolioValue)
  historyValues.push(netWorth)

  // Capital injected = 1000 start + 400 per completed month
  const completedMonths = currentMonth - 1
  const capitalIn = 1000 + completedMonths * 400
  const pnl = netWorth - capitalIn
  const pnlPct = (pnl / capitalIn) * 100
  const isUp = pnl >= 0
  const chartColor = isUp ? Colors.success : Colors.danger

  // Active investments sorted by current value desc
  const active: [AssetId, Investment][] = (
    Object.entries(investments) as [AssetId, Investment | undefined][]
  )
    .filter((e): e is [AssetId, Investment] => e[1] != null && e[1].currentValue > 0)
    .sort((a, b) => b[1].currentValue - a[1].currentValue)

  // Chart
  const chart = buildChart(historyValues, CHART_W, CHART_H)

  // Allocation: wallet + active investments
  const allocItems = [
    { id: 'wallet' as AssetId, value: wallet },
    ...active.map(([id, inv]) => ({ id, value: inv.currentValue })),
  ].filter(a => a.value > 0)
  const allocTotal = allocItems.reduce((s, a) => s + a.value, 0) || 1

  // Financial IQ average
  const iqTotal = Math.round(
    (financialIQ.budgeting + financialIQ.investing + financialIQ.risk + financialIQ.saving) / 4
  )

  // Loan repayment progress (assuming 12 month loan)
  const loanTotalMonths = loan.active ? (loan.monthsRemaining + completedMonths) : 12
  const loanPaidPct = loan.active ? Math.min(1, (loanTotalMonths - loan.monthsRemaining) / loanTotalMonths) : 0

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.monthLabel}>{t('month.title', { month: currentMonth })}</Text>
        <Text style={styles.netWorthNum}>
          {netWorth.toFixed(0)}
          <Text style={styles.netWorthCur}> PLN</Text>
        </Text>
        <View style={[styles.pnlBadge, { backgroundColor: chartColor + '1A' }]}>
          <Text style={[styles.pnlNum, { color: chartColor }]}>
            {isUp ? '+' : ''}{pnl.toFixed(0)} PLN &nbsp;·&nbsp; {isUp ? '+' : ''}{pnlPct.toFixed(1)}%
          </Text>
          <Text style={[styles.pnlSub, { color: chartColor }]}>{t('portfolio.vs_capital')}</Text>
        </View>

        {/* Wallet / Investments split pills */}
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <View style={[styles.pillDot, { backgroundColor: ASSET_COLOR.wallet }]} />
            <View>
              <Text style={styles.pillLabel}>{t('month.wallet')}</Text>
              <Text style={styles.pillValue}>{wallet.toFixed(0)} PLN</Text>
            </View>
          </View>
          <View style={styles.pillDivider} />
          <View style={styles.pill}>
            <View style={[styles.pillDot, { backgroundColor: Colors.primary }]} />
            <View>
              <Text style={styles.pillLabel}>{t('month.investments')}</Text>
              <Text style={styles.pillValue}>{totalPortfolio.toFixed(0)} PLN</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Net Worth Chart ── */}
      {chart && (
        <View style={styles.chartCard}>
          <Text style={styles.sectionLabel}>{t('portfolio.history')}</Text>
          <Svg width={CHART_W} height={CHART_H}>
            <Defs>
              <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={chartColor} stopOpacity="0.28" />
                <Stop offset="100%" stopColor={chartColor} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>
            {/* Area fill */}
            <Path d={chart.area} fill="url(#areaGrad)" />
            {/* Line */}
            <Path
              d={chart.line}
              fill="none"
              stroke={chartColor}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Start dot */}
            <Circle cx={chart.first.x} cy={chart.first.y} r={3.5} fill={Colors.muted} />
            {/* End dot with glow */}
            <Circle cx={chart.last.x} cy={chart.last.y} r={10} fill={chartColor} fillOpacity={0.15} />
            <Circle cx={chart.last.x} cy={chart.last.y} r={5} fill={chartColor} />
          </Svg>
          <View style={styles.chartFooter}>
            <Text style={styles.chartLabelTxt}>Start · 1 000 PLN</Text>
            <Text style={styles.chartLabelTxt}>{t('portfolio.now')} · {netWorth.toFixed(0)} PLN</Text>
          </View>
        </View>
      )}

      {/* ── Allocation ── */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('portfolio.allocation')}</Text>
        {/* Segmented bar */}
        <View style={styles.allocBar}>
          {allocItems.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.allocSeg,
                {
                  flex: item.value / allocTotal,
                  backgroundColor: ASSET_COLOR[item.id],
                  borderTopLeftRadius: idx === 0 ? 4 : 0,
                  borderBottomLeftRadius: idx === 0 ? 4 : 0,
                  borderTopRightRadius: idx === allocItems.length - 1 ? 4 : 0,
                  borderBottomRightRadius: idx === allocItems.length - 1 ? 4 : 0,
                },
              ]}
            />
          ))}
        </View>
        {/* Legend */}
        <View style={styles.legend}>
          {allocItems.map(item => (
            <View key={item.id} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: ASSET_COLOR[item.id] }]} />
              <Text style={styles.legendName} numberOfLines={1}>{t(`assets.${item.id}`)}</Text>
              <Text style={styles.legendPct}>{((item.value / allocTotal) * 100).toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Active Investments ── */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('portfolio.active_investments')}</Text>
        {active.length === 0 && (
          <Text style={styles.emptyInv}>{t('portfolio.no_investments')}</Text>
        )}
        {active.map(([id, inv], idx) => {
          const invPnl = inv.currentValue - inv.amountInvested
          const invPnlPct = (invPnl / inv.amountInvested) * 100
          const up = invPnl >= 0
          const rc = RISK_COLOR[RISK_LEVEL[id] ?? 'very_low']
          const sharePct = Math.min(100, (inv.currentValue / allocTotal) * 100)

          return (
            <View key={id} style={[styles.invRow, idx > 0 && styles.invBorder]}>
              {/* Title row */}
              <View style={styles.invTitleRow}>
                <View style={styles.invTitleLeft}>
                  <View style={[styles.invDot, { backgroundColor: ASSET_COLOR[id] }]} />
                  <Text style={styles.invName} numberOfLines={1}>{t(`assets.${id}`)}</Text>
                  {inv.lockedUntilMonth != null && (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockTxt}>m.{inv.lockedUntilMonth}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.invTitleRight}>
                  <Text style={styles.invCurVal}>{inv.currentValue.toFixed(0)} PLN</Text>
                  <Text style={[styles.invPnl, { color: up ? Colors.success : Colors.danger }]}>
                    {up ? '+' : ''}{invPnl.toFixed(0)} ({up ? '+' : ''}{invPnlPct.toFixed(1)}%)
                  </Text>
                </View>
              </View>
              {/* Portfolio share bar */}
              <View style={styles.invBarTrack}>
                <View
                  style={[
                    styles.invBarFill,
                    { width: `${sharePct}%` as any, backgroundColor: ASSET_COLOR[id] },
                  ]}
                />
              </View>
              {/* Meta row */}
              <View style={styles.invMeta}>
                <Text style={[styles.invRisk, { color: rc }]}>{t(riskTransKey(id))}</Text>
                <Text style={styles.invInvested}>
                  {t('asset.invested')}: {inv.amountInvested.toFixed(0)} PLN
                </Text>
              </View>
            </View>
          )
        })}
      </View>

      {/* ── Financial IQ ── */}
      <View style={styles.card}>
        <View style={styles.iqHeader}>
          <Text style={styles.sectionLabel}>Financial IQ</Text>
          <View style={styles.iqBadge}>
            <Text style={styles.iqTotal}>{iqTotal}</Text>
            <Text style={styles.iqMax}>/100</Text>
          </View>
        </View>
        <IQBar label={t('year_summary.iq_budgeting')} value={financialIQ.budgeting} color={Colors.primary} />
        <IQBar label={t('year_summary.iq_investing')} value={financialIQ.investing} color={Colors.warning} />
        <IQBar label={t('year_summary.iq_risk')} value={financialIQ.risk} color={Colors.danger} />
        <IQBar label={t('year_summary.iq_saving')} value={financialIQ.saving} color={Colors.success} />
      </View>

      {/* ── Loan ── */}
      {loan.active && (
        <View style={[styles.card, styles.loanCard]}>
          <Text style={styles.sectionLabel}>{t('loan.title')}</Text>
          <View style={styles.loanStats}>
            <View style={styles.loanStat}>
              <Text style={styles.loanVal}>{loan.monthlyRepayment.toFixed(0)} PLN</Text>
              <Text style={styles.loanLbl}>{t('portfolio.monthly_repayment')}</Text>
            </View>
            <View style={[styles.pillDivider, { marginVertical: 0 }]} />
            <View style={styles.loanStat}>
              <Text style={styles.loanVal}>{loan.monthsRemaining}</Text>
              <Text style={styles.loanLbl}>{t('portfolio.months_left')}</Text>
            </View>
            <View style={[styles.pillDivider, { marginVertical: 0 }]} />
            <View style={styles.loanStat}>
              <Text style={styles.loanVal}>{(loan.monthsRemaining * loan.monthlyRepayment).toFixed(0)} PLN</Text>
              <Text style={styles.loanLbl}>{t('portfolio.remaining_debt')}</Text>
            </View>
          </View>
          {/* Repayment progress */}
          <View style={styles.loanTrack}>
            <View
              style={[styles.loanProgress, { width: `${loanPaidPct * 100}%` as any }]}
            />
          </View>
          <View style={styles.loanTrackLabels}>
            <Text style={styles.loanTrackLbl}>{t('loan.active')}</Text>
            <Text style={styles.loanTrackLbl}>{t('loan.paid_off')}</Text>
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingTop: 64 },

  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: { color: Colors.subtext, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // ── Header ──
  header: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthLabel: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  netWorthNum: { color: Colors.text, fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  netWorthCur: { fontSize: 22, fontWeight: '500', color: Colors.subtext },
  pnlBadge: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  pnlNum: { fontSize: 14, fontWeight: '700' },
  pnlSub: { fontSize: 11, fontWeight: '500', marginTop: 2, opacity: 0.75 },

  pillRow: { flexDirection: 'row', marginTop: 16, width: '100%' },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  pillDot: { width: 10, height: 10, borderRadius: 5 },
  pillLabel: { color: Colors.subtext, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  pillValue: { color: Colors.text, fontSize: 15, fontWeight: '700', marginTop: 1 },
  pillDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // ── Chart ──
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  sectionLabel: {
    color: Colors.subtext,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  chartLabelTxt: { color: Colors.muted, fontSize: 11 },

  // ── Card ──
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // ── Allocation ──
  allocBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
    gap: 1,
  },
  allocSeg: { height: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendName: { color: Colors.subtext, fontSize: 11 },
  legendPct: { color: Colors.muted, fontSize: 11, marginLeft: 2 },

  // ── Investments ──
  invRow: { paddingVertical: 13 },
  invBorder: { borderTopWidth: 1, borderTopColor: Colors.border },

  invTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 9,
  },
  invTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  invDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  invName: { color: Colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  lockBadge: {
    backgroundColor: Colors.muted + '40',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  lockTxt: { color: Colors.subtext, fontSize: 10, fontWeight: '600' },
  invTitleRight: { alignItems: 'flex-end' },
  invCurVal: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  invPnl: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  invBarTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 7,
  },
  invBarFill: { height: 4, borderRadius: 2, opacity: 0.75 },

  invMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invRisk: { fontSize: 11, fontWeight: '600' },
  invInvested: { color: Colors.muted, fontSize: 11 },

  emptyInv: { color: Colors.subtext, fontSize: 13, paddingVertical: 8 },

  // ── IQ ──
  iqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iqBadge: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  iqTotal: { color: Colors.primary, fontSize: 20, fontWeight: '800' },
  iqMax: { color: Colors.primary, fontSize: 12, fontWeight: '500', opacity: 0.7 },

  // ── Loan ──
  loanCard: { borderColor: Colors.warning + '50' },
  loanStats: { flexDirection: 'row', marginBottom: 14 },
  loanStat: { flex: 1, alignItems: 'center', gap: 4 },
  loanVal: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  loanLbl: { color: Colors.subtext, fontSize: 11, textAlign: 'center' },
  loanTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  loanProgress: { height: 6, backgroundColor: Colors.warning, borderRadius: 3 },
  loanTrackLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  loanTrackLbl: { color: Colors.muted, fontSize: 10 },
})
