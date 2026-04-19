import '../i18n'
import { Stack } from 'expo-router'
import { View } from 'react-native'
import LanguagePicker from '../components/LanguagePicker'
import { PickerVisibilityProvider, usePickerScroll } from '../contexts/PickerVisibility'

const BASE_TOP = 78

function PickerOverlay() {
  const { topOffset } = usePickerScroll()
  return (
    <View
      style={{ position: 'absolute', top: BASE_TOP + topOffset, right: 30, zIndex: 100 }}
      pointerEvents="box-none"
    >
      <LanguagePicker />
    </View>
  )
}

export default function RootLayout() {
  return (
    <PickerVisibilityProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="month-summary" options={{ gestureEnabled: false }} />
          <Stack.Screen name="what-if" />
          <Stack.Screen name="year-summary" options={{ gestureEnabled: false }} />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="asset/[id]" />
        </Stack>
        <PickerOverlay />
      </View>
    </PickerVisibilityProvider>
  )
}
