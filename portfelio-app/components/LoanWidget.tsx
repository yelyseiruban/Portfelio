import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Colors } from '../constants/colors'
import { useGameStore } from '../store/gameStore'

const LOAN_AMOUNT = 3000
const LOAN_REPAYMENT = 300
const LOAN_MONTHS = 12

export default function LoanWidget() {
  const { t } = useTranslation()
  const loan = useGameStore(s => s.loan)
  const takeLoan = useGameStore(s => s.takeLoan)
  const loanAlreadyTakenEver = useGameStore(
    s => s.monthlyHistory.some(m => m.actions.some(a => a.type === 'take_loan'))
  )

  if (loan.active) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('loan.active')}</Text>
          <View style={styles.activeDot} />
        </View>
        <Text style={styles.detail}>{t('loan.repayment', { amount: loan.monthlyRepayment })}</Text>
        <Text style={styles.detail}>{t('loan.months_remaining', { months: loan.monthsRemaining })}</Text>
      </View>
    )
  }

  if (loanAlreadyTakenEver) return null

  const handleTakeLoan = () => {
    Alert.alert(
      t('loan.title'),
      `${t('loan.amount', { amount: LOAN_AMOUNT })}\n${t('loan.repayment', { amount: LOAN_REPAYMENT })}\n${t('loan.months_remaining', { months: LOAN_MONTHS })}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('loan.take_loan'), onPress: () => takeLoan(LOAN_AMOUNT, LOAN_REPAYMENT, LOAN_MONTHS) },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>{t('loan.available')}</Text>
          <Text style={styles.detail}>{t('loan.amount', { amount: LOAN_AMOUNT })}</Text>
          <Text style={styles.detail}>{t('loan.repayment', { amount: LOAN_REPAYMENT })}/mo × {LOAN_MONTHS}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleTakeLoan}>
          <Text style={styles.buttonText}>{t('loan.take_loan')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: Colors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  detail: { color: Colors.subtext, fontSize: 12, marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
})
