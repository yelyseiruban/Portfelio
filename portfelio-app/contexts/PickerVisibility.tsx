import { createContext, useContext, useEffect, useState } from 'react'

interface PickerCtx {
  topOffset: number
  setTopOffset: (offset: number) => void
  onScroll: () => void
}

const PickerContext = createContext<PickerCtx>({
  topOffset: 0,
  setTopOffset: () => {},
  onScroll: () => {},
})

export function PickerVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [topOffset, setTopOffset] = useState(0)

  return (
    <PickerContext.Provider value={{ topOffset, setTopOffset, onScroll: () => {} }}>
      {children}
    </PickerContext.Provider>
  )
}

export function usePickerScroll() {
  return useContext(PickerContext)
}

// Call in a screen to shift the picker by `offset` px while that screen is mounted
export function usePickerOffset(offset: number) {
  const { setTopOffset } = useContext(PickerContext)
  useEffect(() => {
    setTopOffset(offset)
    return () => setTopOffset(0)
  }, [offset, setTopOffset])
}
