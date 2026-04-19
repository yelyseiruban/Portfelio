import { Redirect } from 'expo-router'
import { useGameStore } from '../store/gameStore'

export default function Index() {
  const nickname = useGameStore((s) => s.nickname)
  const currentMonth = useGameStore((s) => s.currentMonth)

  if (!nickname) return <Redirect href="/(onboarding)/nickname" />
  if (currentMonth === 0) return <Redirect href="/(onboarding)/comic" />
  if (currentMonth > 12) return <Redirect href="/year-summary" />
  return <Redirect href="/(tabs)/game" />
}
