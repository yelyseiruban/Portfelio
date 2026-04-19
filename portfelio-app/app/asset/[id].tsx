import { useState, useMemo } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Haptics from 'expo-haptics'
import { Colors } from '../../constants/colors'
import { usePickerScroll } from '../../contexts/PickerVisibility'
import { useGameStore, type AssetId } from '../../store/gameStore'
import FeeConfirmModal from '../../components/FeeConfirmModal'
import AssetChart from '../../components/AssetChart'
import { ANTHROPIC_API_KEY } from '../../constants/api'

import walletData from '../data/assets/wallet.json'
import savingsData from '../data/assets/savings_account.json'
import depositData from '../data/assets/deposit.json'
import bondsData from '../data/assets/bonds.json'
import pkoTfiData from '../data/assets/pko_tfi.json'
import sp500Data from '../data/assets/sp500_etf.json'
import ethData from '../data/assets/eth.json'

async function fetchLoanWarning(language: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return language === 'pl'
    ? 'Uwaga: inwestujesz pożyczone pieniądze w kryptowaluty. To bardzo wysokie ryzyko.'
    : 'Warning: you are investing borrowed money in crypto. This is very high risk.'
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        system: `You are a financial assistant in a mobile game. Always respond in ${language === 'pl' ? 'Polish' : 'English'}.`,
        messages: [{
          role: 'user',
          content: 'The player took a student loan and is about to invest borrowed money in cryptocurrency. Flag this risk in 1-2 sentences. Direct, not preachy.',
        }],
      }),
    })
    const data = await res.json()
    return data?.content?.[0]?.text ?? ''
  } catch {
    return language === 'pl'
      ? 'Uwaga: inwestujesz pożyczone pieniądze w kryptowaluty. To bardzo wysokie ryzyko.'
      : 'Warning: you are investing borrowed money in crypto. This is very high risk.'
  }
}

const ASSET_MAP: Record<string, typeof sp500Data> = {
  wallet: walletData as any,
  savings_account: savingsData as any,
  deposit: depositData as any,
  bonds: bondsData as any,
  pko_tfi: pkoTfiData as any,
  sp500_etf: sp500Data,
  eth: ethData as any,
}

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()

  const asset = ASSET_MAP[id ?? '']

  const currentMonth = useGameStore(s => s.currentMonth)
  const wallet = useGameStore(s => s.wallet)
  const investment = useGameStore(s => s.investments[id as AssetId])
  const loan = useGameStore(s => s.loan)
  const buyAsset = useGameStore(s => s.buyAsset)
  const withdrawAsset = useGameStore(s => s.withdrawAsset)

  const [buyAmount, setBuyAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [feeModal, setFeeModal] = useState<{ type: 'buy' | 'withdraw'; amount: number; fee: number } | null>(null)
  const [loanWarn, setLoanWarn] = useState<{ text: string; pendingAmount: number; pendingFee: number } | null>(null)
  const [loanWarnLoading, setLoanWarnLoading] = useState(false)
  const language = useGameStore(s => s.language)
  const { onScroll } = usePickerScroll()

  const isCrypto = asset?.fee > 0
  const isLocked = investment?.lockedUntilMonth != null && investment.lockedUntilMonth > currentMonth
  const isWallet = id === 'wallet'

  const currentMonthData = useMemo(
    () => asset?.gameYear.find(m => m.month === currentMonth),
    [asset, currentMonth]
  )

  if (!asset) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Asset not found</Text>
      </View>
    )
  }

  const handleBuy = () => {
    const amount = parseFloat(buyAmount)
    if (!amount || amount <= 0) return

    const fee = isCrypto ? Math.round(amount * asset.fee * 100) / 100 : 0
    const totalCost = amount + fee

    if (totalCost > wallet) {
      Alert.alert(t('errors.not_enough_wallet'))
      return
    }

    if (isCrypto && loan.active) {
      setLoanWarnLoading(true)
      fetchLoanWarning(language).then(text => {
        setLoanWarnLoading(false)
        setLoanWarn({ text, pendingAmount: amount, pendingFee: fee })
      })
      return
    }

    if (isCrypto) {
      setFeeModal({ type: 'buy', amount, fee })
    } else {
      confirmBuy(amount, fee)
    }
  }

  const confirmBuy = (amount: number, fee: number) => {
    const lockedUntilMonth = asset.lockedMonths != null ? currentMonth + asset.lockedMonths : undefined
    buyAsset(id as AssetId, amount, fee, lockedUntilMonth)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setBuyAmount('')
    setFeeModal(null)
  }

  const handleWithdraw = () => {
    if (!investment) return
    const amount = parseFloat(withdrawAmount) || investment.currentValue

    if (isLocked) {
      Alert.alert(t('errors.asset_locked', { month: investment.lockedUntilMonth }))
      return
    }

    if (amount > investment.currentValue) {
      Alert.alert(t('errors.not_enough_wallet'))
      return
    }

    const fee = isCrypto ? Math.round(amount * asset.fee * 100) / 100 : 0

    if (isCrypto) {
      setFeeModal({ type: 'withdraw', amount, fee })
    } else {
      confirmWithdraw(amount, fee)
    }
  }

  const confirmWithdraw = (amount: number, fee: number) => {
    withdrawAsset(id as AssetId, amount, fee)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setWithdrawAmount('')
    setFeeModal(null)
  }

  const returnPct = investment
    ? ((investment.currentValue - investment.amountInvested) / investment.amountInvested) * 100
    : null
  const isUp = returnPct != null && returnPct >= 0

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.assetName}>{t(`assets.${id}`)}</Text>
        <Text style={styles.riskLabel}>
          {asset.annualReturnPct != null
            ? t('asset.annual_return', { pct: asset.annualReturnPct })
            : t('asset.risk_high')}
        </Text>
        {currentMonthData?.valueUSD != null && (
          <Text style={styles.currentPrice}>
            ${currentMonthData.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {currentMonthData.valuePLN != null && (
              ` (${currentMonthData.valuePLN.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PLN)`
            )}
          </Text>
        )}
      </View>

      {/* Full chart: fixed, not scrollable */}
      <View style={styles.chartContainer}>
        <AssetChart
          history={asset.history as any}
          gameYear={asset.gameYear as any}
          currentMonth={currentMonth}
          height={200}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Position info */}
        {investment && (
          <View style={styles.positionCard}>
            <Row label={t('asset.invested')} value={`${investment.amountInvested.toFixed(2)} PLN`} />
            <Row label={t('asset.current_value')} value={`${investment.currentValue.toFixed(2)} PLN`} />
            <Row
              label={t('asset.return')}
              value={`${isUp ? '+' : ''}${returnPct!.toFixed(2)}%`}
              valueColor={isUp ? Colors.success : Colors.danger}
            />
            {isLocked && (
              <Row
                label={t('asset.locked_until', { month: investment.lockedUntilMonth })}
                value=""
                valueColor={Colors.warning}
              />
            )}
          </View>
        )}

        {/* Liquidity / lock info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            {asset.lockedMonths != null
              ? t('asset.liquidity_locked', { months: asset.lockedMonths })
              : t('asset.liquidity_any')}
          </Text>
          {isCrypto && (
            <Text style={styles.feeInfo}>⚠ 4% {t('fee.title').toLowerCase()}</Text>
          )}
        </View>

        {/* Buy section */}
        {!isWallet && (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>{t('asset.buy')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={buyAmount}
                onChangeText={setBuyAmount}
                keyboardType="numeric"
                placeholder={`Max: ${wallet.toFixed(0)} PLN`}
                placeholderTextColor={Colors.muted}
              />
              <TouchableOpacity style={styles.actionBtn} onPress={handleBuy}>
                <Text style={styles.actionBtnText}>{t('asset.buy')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Withdraw section */}
        {investment && !isWallet && (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>{t('asset.withdraw')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="numeric"
                placeholder={`Max: ${investment.currentValue.toFixed(0)} PLN`}
                placeholderTextColor={Colors.muted}
              />
              <TouchableOpacity
                style={[styles.actionBtn, isLocked && styles.actionBtnDisabled]}
                onPress={handleWithdraw}
                disabled={isLocked}
              >
                <Text style={styles.actionBtnText}>{t('asset.withdraw')}</Text>
              </TouchableOpacity>
            </View>
            {isLocked && (
              <Text style={styles.lockedNote}>{t('errors.asset_locked', { month: investment.lockedUntilMonth })}</Text>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Loan + crypto risk warning modal */}
      <Modal transparent animationType="fade" visible={!!loanWarn || loanWarnLoading} onRequestClose={() => setLoanWarn(null)}>
        <View style={styles.warnOverlay}>
          <View style={styles.warnModal}>
            <Text style={styles.warnTitle}>⚠ {language === 'pl' ? 'Wysokie ryzyko' : 'High risk'}</Text>
            {loanWarnLoading
              ? <ActivityIndicator color={Colors.danger} style={{ marginVertical: 20 }} />
              : <Text style={styles.warnText}>{loanWarn?.text}</Text>
            }
            {!loanWarnLoading && (
              <View style={styles.warnButtons}>
                <TouchableOpacity style={styles.warnCancel} onPress={() => setLoanWarn(null)}>
                  <Text style={styles.warnCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.warnConfirm}
                  onPress={() => {
                    if (!loanWarn) return
                    setLoanWarn(null)
                    setFeeModal({ type: 'buy', amount: loanWarn.pendingAmount, fee: loanWarn.pendingFee })
                  }}
                >
                  <Text style={styles.warnConfirmText}>
                    {language === 'pl' ? 'Rozumiem, kontynuuj' : 'I understand, continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Fee modal for crypto */}
      {feeModal && (
        <FeeConfirmModal
          visible
          type={feeModal.type}
          amount={feeModal.amount}
          fee={feeModal.fee}
          onConfirm={() =>
            feeModal.type === 'buy'
              ? confirmBuy(feeModal.amount, feeModal.fee)
              : confirmWithdraw(feeModal.amount, feeModal.fee)
          }
          onCancel={() => setFeeModal(null)}
        />
      )}
    </View>
  )
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      {value ? <Text style={[rowStyles.value, valueColor ? { color: valueColor } : undefined]}>{value}</Text> : null}
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: Colors.subtext, fontSize: 14 },
  value: { color: Colors.text, fontSize: 14, fontWeight: '600' },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: Colors.danger, fontSize: 16 },

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
  assetName: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  riskLabel: { color: Colors.subtext, fontSize: 13, marginTop: 2 },
  currentPrice: { color: Colors.text, fontSize: 18, fontWeight: '700', marginTop: 6 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 0 },

  chartContainer: {
    backgroundColor: Colors.card,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },

  positionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: { color: Colors.subtext, fontSize: 13 },
  feeInfo: { color: Colors.warning, fontSize: 13, marginTop: 4, fontWeight: '600' },

  actionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionTitle: { color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionBtnDisabled: { backgroundColor: Colors.muted },
  actionBtnText: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  lockedNote: { color: Colors.warning, fontSize: 12, marginTop: 8 },

  warnOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  warnModal: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.danger + '60',
  },
  warnTitle: { color: Colors.danger, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  warnText: { color: Colors.text, fontSize: 15, lineHeight: 22 },
  warnButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  warnCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  warnCancelText: { color: Colors.subtext, fontWeight: '600' },
  warnConfirm: {
    flex: 2,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  warnConfirmText: { color: Colors.text, fontWeight: '700', fontSize: 13 },
})
