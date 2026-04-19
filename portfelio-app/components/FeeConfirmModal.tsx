import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Colors } from '../constants/colors'

interface Props {
  visible: boolean
  type: 'buy' | 'withdraw'
  amount: number
  fee: number
  onConfirm: () => void
  onCancel: () => void
}

export default function FeeConfirmModal({ visible, type, amount, fee, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{t('fee.title')}</Text>
          <Text style={styles.description}>{t('fee.description', { pct: 4 })}</Text>

          <View style={styles.divider} />

          {type === 'buy' ? (
            <>
              <Row label={t('fee.you_invest', { amount: amount.toFixed(2) })} />
              <Row label={t('fee.buy_fee', { fee: fee.toFixed(2) })} highlight />
            </>
          ) : (
            <>
              <Row label={t('fee.you_receive', { amount: (amount - fee).toFixed(2) })} />
              <Row label={t('fee.withdraw_fee', { fee: fee.toFixed(2) })} highlight />
            </>
          )}

          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={styles.confirmText}>{t('fee.confirm')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function Row({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <Text style={[styles.row, highlight && styles.rowHighlight]}>{label}</Text>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  description: { color: Colors.subtext, fontSize: 13, marginBottom: 16 },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16 },
  row: { color: Colors.text, fontSize: 14, marginBottom: 8 },
  rowHighlight: { color: Colors.danger, fontWeight: '600' },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmText: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  cancelBtn: { alignItems: 'center', marginTop: 12, padding: 8 },
  cancelText: { color: Colors.subtext, fontSize: 14 },
})
