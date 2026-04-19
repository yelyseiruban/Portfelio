import { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import { Colors } from '../../constants/colors'
import { useGameStore } from '../../store/gameStore'

export default function NicknameScreen() {
  const { t } = useTranslation()
  const nickname = useGameStore((state) => state.nickname)
  const setNickname = useGameStore((state) => state.setNickname)
  const startGame = useGameStore((state) => state.startGame)

  const [draftNickname, setDraftNickname] = useState(nickname)
  const [showError, setShowError] = useState(false)

  const helperText = useMemo(() => {
    if (!showError) return null
    return t('nickname.error_empty')
  }, [showError, t])

  const handleStart = () => {
    const trimmedNickname = draftNickname.trim()

    if (!trimmedNickname) {
      setShowError(true)
      return
    }

    setShowError(false)
    setNickname(trimmedNickname)
    startGame()
    router.replace('/(onboarding)/comic')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Portfelio</Text>
            <Text style={styles.title}>{t('nickname.title')}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{t('nickname.placeholder')}</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={24}
              onChangeText={(value) => {
                setDraftNickname(value)
                if (showError && value.trim()) setShowError(false)
              }}
              onSubmitEditing={handleStart}
              placeholder={t('nickname.placeholder')}
              placeholderTextColor={Colors.subtext}
              returnKeyType="done"
              selectionColor={Colors.primary}
              style={[styles.input, showError && styles.inputError]}
              value={draftNickname}
            />
            {helperText ? <Text style={styles.errorText}>{helperText}</Text> : null}
          </View>

          <Pressable onPress={handleStart} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t('nickname.startGame')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
  },
  hero: {
    marginTop: 56,
    gap: 12,
  },
  eyebrow: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  form: {
    gap: 12,
  },
  label: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: 18,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: 18,
    backgroundColor: Colors.primary,
    marginTop: 24,
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
})
