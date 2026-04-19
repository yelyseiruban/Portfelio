import { useState } from 'react'
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Colors } from '../constants/colors'
import { useGameStore } from '../store/gameStore'

interface Step {
  icon: string
  titlePL: string
  titleEN: string
  bodyPL: string
  bodyEN: string
}

const STEPS: Step[] = [
  {
    icon: '💰',
    titlePL: 'Twój portfel',
    titleEN: 'Your wallet',
    bodyPL: 'Tu jest Twoja gotówka. Zaczynasz z 1 000 PLN i dostajesz +400 PLN na początku każdego miesiąca.',
    bodyEN: 'This is your liquid cash. You start with 1 000 PLN and receive +400 PLN at the start of each month.',
  },
  {
    icon: '📈',
    titlePL: 'Aktywa inwestycyjne',
    titleEN: 'Investment assets',
    bodyPL: 'Kliknij dowolne aktywo, żeby zobaczyć wykres i zdecydować czy kupić. Każde ma inny poziom ryzyka i płynności.',
    bodyEN: 'Tap any asset to see its chart and decide whether to buy. Each has different risk and liquidity.',
  },
  {
    icon: '🏦',
    titlePL: 'Pożyczka studencka',
    titleEN: 'Student loan',
    bodyPL: 'Możesz wziąć jednorazową pożyczkę 3 000 PLN. Rata 300 PLN/mies. jest odliczana automatycznie — pilnuj salda.',
    bodyEN: 'You can take a one-time 3 000 PLN loan. A 300 PLN/month repayment is deducted automatically — watch your balance.',
  },
  {
    icon: '⚠️',
    titlePL: 'Decyzje są permanentne',
    titleEN: 'Decisions are permanent',
    bodyPL: 'Nie możesz cofnąć żadnego ruchu. Działaj jak inwestor — przemyśl zanim klikniesz.',
    bodyEN: 'You cannot undo any move. Act like an investor — think before you click.',
  },
  {
    icon: '✅',
    titlePL: 'Zakończ miesiąc',
    titleEN: 'End the month',
    bodyPL: 'Kiedy skończysz decyzje, kliknij "Zakończ miesiąc". Claude podsumuje co zrobiłeś i co się wydarzyło.',
    bodyEN: 'When you\'re done making decisions, tap "End month". Claude will summarize what you did.',
  },
]

export default function TutorialOverlay() {
  const tutorialDone = useGameStore(s => s.tutorialDone)
  const currentMonth = useGameStore(s => s.currentMonth)
  const setTutorialDone = useGameStore(s => s.setTutorialDone)
  const language = useGameStore(s => s.language)

  const [step, setStep] = useState(0)

  if (tutorialDone || currentMonth !== 1) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isPL = language === 'pl'

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isLast) {
      setTutorialDone()
    } else {
      setStep(s => s + 1)
    }
  }

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setTutorialDone()
  }

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Progress dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
            ))}
          </View>

          <Text style={styles.icon}>{current.icon}</Text>
          <Text style={styles.title}>{isPL ? current.titlePL : current.titleEN}</Text>
          <Text style={styles.body}>{isPL ? current.bodyPL : current.bodyEN}</Text>

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {isLast
                ? (isPL ? 'Zaczynam! 🚀' : 'Let\'s go! 🚀')
                : (isPL ? 'Dalej →' : 'Next →')}
            </Text>
          </TouchableOpacity>

          {!isLast && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>{isPL ? 'Pomiń tutorial' : 'Skip tutorial'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 44,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 18 },
  dotDone: { backgroundColor: Colors.muted },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  body: { color: Colors.subtext, fontSize: 15, lineHeight: 23, marginBottom: 24 },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  skipBtn: { alignItems: 'center', marginTop: 14, padding: 8 },
  skipText: { color: Colors.muted, fontSize: 13 },
})
