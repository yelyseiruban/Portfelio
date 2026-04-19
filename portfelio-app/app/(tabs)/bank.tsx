import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Colors } from '../../constants/colors'
import { useGameStore } from '../../store/gameStore'
import { usePickerScroll } from '../../contexts/PickerVisibility'
import productsData from '../data/products.json'

const RISK_COLOR: Record<string, string> = {
  'Bardzo niskie': Colors.success,
  'Very low':      Colors.success,
  'Niskie':        '#60A5FA',
  'Low':           '#60A5FA',
  'Niskie–średnie':'#60A5FA',
  'Low–medium':    '#60A5FA',
}

export default function BankTab() {
  const { t } = useTranslation()
  const language = useGameStore(s => s.language)
  const investments = useGameStore(s => s.investments)
  const { onScroll } = usePickerScroll()

  const lang = language as 'pl' | 'en'
  const isPL = lang === 'pl'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('bank.title')}</Text>
        <Text style={styles.subtitle}>{t('bank.subtitle')}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} onScroll={onScroll} scrollEventThrottle={16}>
        {productsData.map(product => {
          const wasUsed = !!investments[product.id as keyof typeof investments]
          const name = isPL ? product.name : product.nameEn
          const tagline = isPL ? product.tagline : product.taglineEn
          const ret = isPL ? product.return : product.returnEn
          const risk = isPL ? product.risk : product.riskEn
          const liquidity = isPL ? product.liquidity : product.liquidityEn
          const riskColor = RISK_COLOR[risk] ?? Colors.subtext

          return (
            <View key={product.id} style={styles.card}>
              {wasUsed && (
                <View style={styles.usedBadge}>
                  <Text style={styles.usedText}>
                    {isPL ? 'używałeś w grze' : 'used in game'}
                  </Text>
                </View>
              )}

              <Text style={styles.productName}>{name}</Text>
              <Text style={styles.tagline}>{tagline}</Text>

              <View style={styles.detailsRow}>
                <DetailChip label={isPL ? 'Zwrot' : 'Return'} value={ret} color={Colors.success} />
                <DetailChip label={isPL ? 'Ryzyko' : 'Risk'} value={risk} color={riskColor} />
              </View>

              <Text style={styles.liquidity}>{liquidity}</Text>

              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => Linking.openURL(product.url)}
                activeOpacity={0.75}
              >
                <Text style={styles.linkBtnText}>{t('bank.open_link')} ↗</Text>
              </TouchableOpacity>
            </View>
          )
        })}

        <Text style={styles.disclaimer}>{t('bank.disclaimer')}</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

function DetailChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
    </View>
  )
}

const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { color: Colors.muted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  value: { fontSize: 13, fontWeight: '700', marginTop: 2 },
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
  subtitle: { color: Colors.subtext, fontSize: 13, marginTop: 4 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  usedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '25',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  usedText: { color: Colors.primary, fontSize: 10, fontWeight: '700' },

  productName: { color: Colors.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  tagline: { color: Colors.subtext, fontSize: 13, lineHeight: 19, marginBottom: 12 },

  detailsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },

  liquidity: { color: Colors.muted, fontSize: 12, marginBottom: 14 },

  linkBtn: {
    backgroundColor: Colors.pko,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  linkBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  disclaimer: {
    color: Colors.muted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
    marginTop: 8,
  },
})
