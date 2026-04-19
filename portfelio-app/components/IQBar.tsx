import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'

interface Props {
  label: string
  value: number // 0–100
  color?: string
}

export default function IQBar({ label, value, color = Colors.primary }: Props) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.score, { color }]}>{clamped}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  score: { fontSize: 14, fontWeight: '800' },
  track: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4 },
})
