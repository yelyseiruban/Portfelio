import { useCallback, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'

import { Colors } from '../../constants/colors'
import { useGameStore } from '../../store/gameStore'
import comicsData from '../data/comics.json'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

type QuizState = 'idle' | 'correct' | 'wrong'

interface SceneState {
  quizState: QuizState
  xpEarned: number
  aiExplanation: string | null
}

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? ''

async function fetchQuizExplanation(concept: string, language: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return ''
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
        max_tokens: 150,
        system: `You are a financial assistant in a mobile game. Always respond in ${language}.`,
        messages: [
          {
            role: 'user',
            content: `A student just got a quiz question wrong about ${concept}. Explain the correct answer in 1-2 sentences. Simple language, no jargon.`,
          },
        ],
      }),
    })
    const data = await res.json()
    return data?.content?.[0]?.text ?? ''
  } catch {
    return ''
  }
}

export default function ComicScreen() {
  const { t } = useTranslation()
  const language = useGameStore((s) => s.language)

  const flatListRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalXP, setTotalXP] = useState(0)
  const [bonusShown, setBonusShown] = useState(false)

  const [sceneStates, setSceneStates] = useState<SceneState[]>(
    comicsData.map(() => ({ quizState: 'idle', xpEarned: 0, aiExplanation: null }))
  )

  const lang = language as 'pl' | 'en'

  const updateScene = (index: number, patch: Partial<SceneState>) => {
    setSceneStates((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const handleViewableChange = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0] != null) {
        setCurrentIndex(viewableItems[0].index ?? 0)
      }
    },
    []
  )

  const goToNext = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex < comicsData.length) {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true })
    } else {
      handleFinish()
    }
  }

  const handleFinish = () => {
    if (!bonusShown) {
      setBonusShown(true)
      setTotalXP((prev) => prev + 200)
    }
    router.replace('/(tabs)/game')
  }

  const handleSkipAll = () => {
    router.replace('/(tabs)/game')
  }

  const handleQuizAnswer = async (sceneIndex: number, correct: boolean) => {
    const scene = comicsData[sceneIndex]
    const state = sceneStates[sceneIndex]
    if (state.quizState !== 'idle') return

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      const xp = scene.quiz.xp
      updateScene(sceneIndex, { quizState: 'correct', xpEarned: xp })
      setTotalXP((prev) => prev + xp)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      updateScene(sceneIndex, { quizState: 'wrong' })
      const explanation = await fetchQuizExplanation(scene.quiz.concept, lang)
      updateScene(sceneIndex, { aiExplanation: explanation })
    }
  }

  const renderScene = ({ item: scene, index }: { item: (typeof comicsData)[0]; index: number }) => {
    const state = sceneStates[index]
    const isLast = index === comicsData.length - 1

    return (
      <View style={styles.slide}>
        <View style={styles.sceneContent}>
          {/* Characters */}
          <View style={styles.charactersRow}>
            {scene.characters.map((char, i) => (
              <View key={i} style={styles.character}>
                <Text style={styles.emoji}>{char.emoji}</Text>
                <Text style={styles.characterName}>
                  {lang === 'en' && (char as any).nameEn ? (char as any).nameEn : char.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Dialogue bubble */}
          {scene.dialogue.map((line, i) => {
            const char = scene.characters[line.characterIndex]
            return (
              <View key={i} style={styles.bubble}>
                <Text style={styles.bubbleName}>
                  {lang === 'en' && (char as any).nameEn ? (char as any).nameEn : char.name}
                </Text>
                <Text style={styles.bubbleText}>{line.text[lang]}</Text>
              </View>
            )
          })}

          {/* Content card */}
          <View style={styles.contentCard}>
            <Text style={styles.contentTitle}>{scene.content.title[lang]}</Text>
            <Text style={styles.contentBody}>{scene.content.body[lang]}</Text>
          </View>

          {/* Product card */}
          {scene.productCard && (
            <Pressable
              onPress={() => Linking.openURL(scene.productCard!.url)}
              style={styles.productCard}
            >
              <View style={styles.productCardInner}>
                <View>
                  <Text style={styles.productName}>
                    {lang === 'en' && (scene.productCard as any).nameEn
                      ? (scene.productCard as any).nameEn
                      : scene.productCard.name}
                  </Text>
                  <Text style={styles.productTagline}>{scene.productCard.tagline[lang]}</Text>
                </View>
                <Text style={styles.productLink}>{t('comic.product_link')} →</Text>
              </View>
            </Pressable>
          )}

          {/* Quiz */}
          <View style={styles.quizBox}>
            <Text style={styles.quizQuestion}>{scene.quiz.question[lang]}</Text>
            <View style={styles.quizOptions}>
              {scene.quiz.options.map((opt, i) => {
                const answered = state.quizState !== 'idle'
                const isCorrect = opt.correct
                let optStyle = styles.quizOption
                if (answered) {
                  optStyle = isCorrect ? styles.quizOptionCorrect : styles.quizOptionWrong
                }
                return (
                  <Pressable
                    key={i}
                    onPress={() => handleQuizAnswer(index, isCorrect)}
                    style={[styles.quizOptionBase, optStyle]}
                    disabled={answered}
                  >
                    <Text style={[styles.quizOptionText, answered && isCorrect && styles.quizOptionTextCorrect]}>
                      {opt.text[lang]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {state.quizState === 'correct' && (
              <Text style={styles.feedbackCorrect}>
                {t('comic.quiz_correct')} {t('comic.quiz_xp', { xp: state.xpEarned })}
              </Text>
            )}
            {state.quizState === 'wrong' && (
              <Text style={styles.feedbackWrong}>{t('comic.quiz_wrong')}</Text>
            )}
            {state.aiExplanation ? (
              <Text style={styles.aiExplanation}>{state.aiExplanation}</Text>
            ) : null}
          </View>
        </View>

        {/* Bottom actions */}
        <View style={styles.bottomActions}>
          {isLast ? (
            <Pressable onPress={handleFinish} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t('comic.start_game')}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={goToNext} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{t('comic.next')}</Text>
              </Pressable>
              <Pressable onPress={handleSkipAll} style={styles.skipButton}>
                <Text style={styles.skipText}>{t('comic.skip_all')}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressDots}>
          {comicsData.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive, i < currentIndex && styles.dotDone]}
            />
          ))}
        </View>
      </View>

      {bonusShown && (
        <View style={styles.bonusBanner}>
          <Text style={styles.bonusText}>{t('comic.bonus')}</Text>
        </View>
      )}

      {/* XP counter */}
      <View style={styles.xpRow}>
        <Text style={styles.xpText}>XP: {totalXP}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={comicsData}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={renderScene}
        onViewableItemsChanged={handleViewableChange}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 20,
  },
  dotDone: {
    backgroundColor: Colors.muted,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    color: Colors.subtext,
    fontSize: 14,
  },
  xpRow: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  xpText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  bonusBanner: {
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bonusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'space-between',
  },
  sceneContent: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 14,
    paddingTop: 8,
  },
  charactersRow: {
    flexDirection: 'row',
    gap: 16,
  },
  character: {
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 40,
  },
  characterName: {
    color: Colors.subtext,
    fontSize: 12,
    fontWeight: '600',
  },
  bubble: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  bubbleName: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  bubbleText: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  contentCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  contentTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  contentBody: {
    color: Colors.subtext,
    fontSize: 14,
    lineHeight: 21,
  },
  productCard: {
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 14,
  },
  productCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  productTagline: {
    color: Colors.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  productLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  quizBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  quizQuestion: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  quizOptions: {
    gap: 8,
  },
  quizOptionBase: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  quizOption: {
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  quizOptionCorrect: {
    borderColor: Colors.success,
    backgroundColor: '#0D2B22',
  },
  quizOptionWrong: {
    borderColor: Colors.danger,
    backgroundColor: '#2B0D0D',
  },
  quizOptionText: {
    color: Colors.text,
    fontSize: 14,
  },
  quizOptionTextCorrect: {
    color: Colors.success,
    fontWeight: '700',
  },
  feedbackCorrect: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackWrong: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  aiExplanation: {
    color: Colors.subtext,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 4,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
})
