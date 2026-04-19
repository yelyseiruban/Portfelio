import { useState } from 'react'
import { Modal, Pressable, TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import { useGameStore, type Language } from '../store/gameStore'
import { Colors } from '../constants/colors'

const OPTIONS: { lang: Language; flag: string; label: string }[] = [
  { lang: 'en', flag: '🇺🇸', label: 'EN' },
  { lang: 'pl', flag: '🇵🇱', label: 'PL' },
]

export default function LanguagePicker() {
  const language = useGameStore(s => s.language)
  const setLanguage = useGameStore(s => s.setLanguage)
  const [open, setOpen] = useState(false)

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={styles.dotsBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.dots}>···</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            {OPTIONS.map(({ lang, flag, label }) => (
              <TouchableOpacity
                key={lang}
                onPress={() => { setLanguage(lang); setOpen(false) }}
                style={[styles.option, language === lang && styles.optionActive]}
                activeOpacity={0.7}
              >
                <Text style={styles.flag}>{flag}</Text>
                <Text style={[styles.label, language === lang && styles.labelActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  dotsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    color: '#fff',
    fontSize: 18,
    letterSpacing: 2,
    lineHeight: 22,
  },
  backdrop: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 122,
    right: 24,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionActive: {
    backgroundColor: Colors.primary + '33',
  },
  flag: {
    fontSize: 22,
  },
  label: {
    color: Colors.subtext,
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.text,
  },
})
