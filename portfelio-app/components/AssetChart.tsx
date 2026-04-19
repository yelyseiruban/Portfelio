import { useRef, useState, useMemo } from 'react'
import { View, Text, StyleSheet, PanResponder } from 'react-native'
import Svg, { Polyline, Line, Circle } from 'react-native-svg'
import { Colors } from '../constants/colors'

interface DataPoint {
  month: number
  valuePct: number
  valueUSD?: number
  valuePLN?: number
}

interface Props {
  history: DataPoint[]
  gameYear: DataPoint[]
  currentMonth: number
  height?: number
  onInteractionStart?: () => void
  onInteractionEnd?: () => void
}

const Y_AXIS_W = 48
const CURRENT_YEAR = 2025

// month 1 = Jan 2025, month -11 = Feb 2024, month -23 = Feb 2023 ...
function monthToYear(m: number): number {
  if (m >= 1) return CURRENT_YEAR
  if (m >= -11) return CURRENT_YEAR - 1
  if (m >= -23) return CURRENT_YEAR - 2
  return CURRENT_YEAR - 3
}

// first month of each calendar year in the dataset
const X_YEAR_TICKS = [
  { month: -35, label: '2022' },
  { month: -23, label: '2023' },
  { month: -11, label: '2024' },
  { month: 1,   label: '2025' },
]

function niceStep(min: number, max: number, count: number): number {
  const raw = (max - min) / count
  if (raw <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  return Math.ceil(raw / mag) * mag
}

export default function AssetChart({ history, gameYear, currentMonth, height = 200, onInteractionStart, onInteractionEnd }: Props) {
  const SVG_W = 340
  const H = height - 52 // space for x-axis bottom + value row

  const containerWidth = useRef(340)
  const [selected, setSelected] = useState<DataPoint | null>(null)
  const [cursorX, setCursorX] = useState<number | null>(null)

  const { histPts, gamePts, bridgeX, totalChangePct, isPositive, currentValue, startValue,
          allData, xMin, xRange, minY, maxY, yTicks, minUSD, maxUSD, hasUSD } = useMemo(() => {
    const hist = history.map(p => ({ x: p.month, y: p.valuePct, raw: p }))
    const game = gameYear.filter(p => p.month <= currentMonth).map(p => ({ x: p.month, y: p.valuePct, raw: p }))

    const allPts = [...hist, ...game]
    const allY = allPts.map(p => p.y)
    const minYv = Math.min(...allY)
    const maxYv = Math.max(...allY)
    const allX = allPts.map(p => p.x)
    const xMinV = Math.min(...allX)
    const xMaxV = Math.max(...allX)
    const xRangeV = xMaxV - xMinV || 1

    const toSvg = (pts: typeof hist) =>
      pts.map(p => ({
        sx: ((p.x - xMinV) / xRangeV) * SVG_W,
        sy: H - ((p.y - minYv) / (maxYv - minYv || 1)) * H,
      }))

    const hPts = toSvg(hist)
    const gPts = game.length > 0 ? toSvg(game) : []
    const bridgeXVal = hist.length > 0 ? hPts[hPts.length - 1].sx : 0

    const sv = history[0]?.valuePct ?? 100
    const cv = gameYear.find(p => p.month === currentMonth)?.valuePct ?? null
    const change = cv != null ? ((cv - sv) / sv) * 100 : null

    // Y axis: USD ticks
    const allUSD = allPts.map(p => p.raw.valueUSD).filter((v): v is number => v != null)
    const minUSDv = allUSD.length ? Math.min(...allUSD) : 0
    const maxUSDv = allUSD.length ? Math.max(...allUSD) : 1
    const step = niceStep(minUSDv, maxUSDv, 4)
    const tickStart = Math.floor(minUSDv / step) * step
    const ticks: number[] = []
    for (let v = tickStart; v <= maxUSDv + step * 0.1; v += step) {
      if (v >= minUSDv - step * 0.1) ticks.push(Math.round(v))
    }

    return {
      histPts: hPts, gamePts: gPts, bridgeX: bridgeXVal,
      totalChangePct: change, isPositive: change == null || change >= 0,
      currentValue: cv, startValue: sv,
      allData: allPts.map(p => p.raw), xMin: xMinV, xRange: xRangeV,
      minY: minYv, maxY: maxYv,
      yTicks: ticks, minUSD: minUSDv, maxUSD: maxUSDv, hasUSD: allUSD.length > 0,
    }
  }, [history, gameYear, currentMonth])

  const gameColor = isPositive ? Colors.success : Colors.danger
  const histStr = histPts.map(p => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ')
  const gameStr = gamePts.map(p => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ')
  const fillStr = gamePts.length > 1
    ? `${gamePts[0].sx.toFixed(1)},${H} ` + gameStr + ` ${gamePts[gamePts.length - 1].sx.toFixed(1)},${H}`
    : ''

  // map USD value → pixel Y (same scale as SVG)
  const usdToY = (usd: number) =>
    H - ((usd - minUSD) / (maxUSD - minUSD || 1)) * H

  // map month → pixel X within chart area (containerWidth - Y_AXIS_W)
  const monthToX = (m: number) =>
    ((m - xMin) / xRange) * (containerWidth.current - Y_AXIS_W)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => { onInteractionStart?.(); handleTouch(e.nativeEvent.locationX) },
      onPanResponderMove: (e) => handleTouch(e.nativeEvent.locationX),
      onPanResponderRelease: () => { setSelected(null); setCursorX(null); onInteractionEnd?.() },
      onPanResponderTerminate: () => { setSelected(null); setCursorX(null); onInteractionEnd?.() },
    })
  ).current

  const handleTouch = (touchX: number) => {
    const chartW = containerWidth.current - Y_AXIS_W
    const fraction = Math.max(0, Math.min(1, (touchX - Y_AXIS_W) / chartW))
    const targetMonth = xMin + fraction * xRange
    let closest = allData[0]
    let minDist = Infinity
    for (const p of allData) {
      const dist = Math.abs(p.month - targetMonth)
      if (dist < minDist) { minDist = dist; closest = p }
    }
    const screenX = Y_AXIS_W + ((closest.month - xMin) / xRange) * chartW
    setSelected(closest)
    setCursorX(screenX)
  }

  const cursorSvgX = cursorX != null
    ? ((cursorX - Y_AXIS_W) / (containerWidth.current - Y_AXIS_W)) * SVG_W
    : null
  const cursorSvgY = selected != null
    ? H - ((selected.valuePct - minY) / (maxY - minY || 1)) * H
    : null

  const tooltipOnLeft = cursorX != null && cursorX > containerWidth.current * 0.55

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={e => { containerWidth.current = e.nativeEvent.layout.width }}
      {...panResponder.panHandlers}
    >
      {/* ── Top spacer (mirrors X axis height) ── */}
      {hasUSD && <View style={{ height: 18 }} />}

      <View style={styles.chartRow}>
        {/* ── Y axis ── */}
        <View style={[styles.yAxis, { height: H }]}>
          {yTicks.map(tick => {
            const top = usdToY(tick)
            if (top < 0 || top > H) return null
            return (
              <Text key={tick} style={[styles.yTick, { top: top - 7 }]}>
                ${tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
              </Text>
            )
          })}
        </View>

        {/* ── SVG + tooltip ── */}
        <View style={styles.svgWrap}>
          <Svg width="100%" height={H} viewBox={`0 0 ${SVG_W} ${H}`} preserveAspectRatio="none">
            {/* Horizontal grid lines at Y ticks */}
            {yTicks.map(tick => {
              const sy = usdToY(tick) / H * H // already in px, but need SVG units
              const svgY = H - ((tick - minUSD) / (maxUSD - minUSD || 1)) * H
              if (svgY < 0 || svgY > H) return null
              return (
                <Line key={tick} x1={0} y1={svgY} x2={SVG_W} y2={svgY}
                  stroke={Colors.border} strokeWidth={0.5} strokeOpacity={0.5} />
              )
            })}

            {bridgeX > 0 && (
              <Line x1={bridgeX} y1={0} x2={bridgeX} y2={H}
                stroke={Colors.border} strokeWidth={1} strokeDasharray="4,3" />
            )}
            {histPts.length > 1 && (
              <Polyline points={histStr} fill="none" stroke={Colors.muted} strokeWidth={1.5} />
            )}
            {fillStr !== '' && (
              <Polyline points={fillStr} fill={gameColor} fillOpacity={0.12} stroke="none" />
            )}
            {gamePts.length > 1 && (
              <Polyline points={gameStr} fill="none" stroke={gameColor} strokeWidth={2.5} />
            )}
            {cursorSvgX != null && cursorSvgY != null && (
              <>
                <Line x1={cursorSvgX} y1={0} x2={cursorSvgX} y2={H}
                  stroke={Colors.text} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="3,3" />
                <Circle cx={cursorSvgX} cy={cursorSvgY} r={4}
                  fill={gameColor} stroke={Colors.background} strokeWidth={1.5} />
              </>
            )}
          </Svg>

          {/* Tooltip */}
          {selected && cursorX != null && (
            <View
              pointerEvents="none"
              style={[
                styles.tooltip,
                tooltipOnLeft
                  ? { right: containerWidth.current - cursorX + 4 }
                  : { left: cursorX - Y_AXIS_W + 4 },
              ]}
            >
              <Text style={styles.tooltipMonth}>
                {selected.month >= 1 ? `Month ${selected.month}` : `${Math.abs(selected.month)}m ago`}
              </Text>
              {selected.valueUSD != null && (
                <Text style={styles.tooltipUSD}>${selected.valueUSD.toFixed(2)}</Text>
              )}
              {selected.valuePLN != null && (
                <Text style={styles.tooltipPLN}>({selected.valuePLN.toFixed(2)} PLN)</Text>
              )}
            </View>
          )}
        </View>

        {/* ── Right spacer (mirrors Y axis width) ── */}
        {hasUSD && <View style={{ width: Y_AXIS_W }} />}
      </View>

      {/* ── X axis ── */}
      <View style={[styles.xAxis, { marginLeft: Y_AXIS_W, marginRight: Y_AXIS_W }]}>
        {X_YEAR_TICKS.map(({ month, label }) => {
          if (month < xMin || month > xMin + xRange) return null
          const left = monthToX(month)
          return (
            <Text key={label} style={[styles.xTick, { left }]}>{label}</Text>
          )
        })}
      </View>

      {/* ── Value row ── */}
      {totalChangePct != null && (
        <View style={[styles.valueRow, { marginLeft: Y_AXIS_W }]}>
          {!hasUSD && <Text style={styles.valueLabel}>{startValue.toFixed(0)} pts</Text>}
          <Text style={[styles.changeBadge, { color: gameColor }]}>
            {isPositive ? '+' : ''}{totalChangePct.toFixed(1)}% total
          </Text>
          {!hasUSD && currentValue != null && <Text style={styles.valueLabel}>{currentValue.toFixed(0)} pts</Text>}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  chartRow: { flexDirection: 'row' },
  yAxis: { width: Y_AXIS_W, position: 'relative' },
  yTick: {
    position: 'absolute',
    right: 4,
    color: Colors.muted,
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'right',
  },
  svgWrap: { flex: 1, position: 'relative' },
  xAxis: { height: 18, position: 'relative', marginTop: 2 },
  xTick: {
    position: 'absolute',
    color: Colors.muted,
    fontSize: 9,
    fontWeight: '500',
    transform: [{ translateX: -12 }],
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  valueLabel: { color: Colors.muted, fontSize: 10 },
  changeBadge: { fontSize: 12, fontWeight: '700' },
  tooltip: {
    position: 'absolute',
    top: 4,
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 10,
    minWidth: 90,
  },
  tooltipMonth: { color: Colors.subtext, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  tooltipUSD: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  tooltipPLN: { color: Colors.subtext, fontSize: 11, fontWeight: '500', marginTop: 1 },
})
