import { useState, useCallback, useEffect, useRef } from 'react'

export type RukiState =
  | 'idle'
  | 'bored'
  | 'walk'
  | 'run'
  | 'wave'
  | 'dance'
  | 'follow_cursor'
  | 'sleepy'
  | 'celebrating'

interface UseRukiStateReturn {
  state: RukiState
  setState: (newState: RukiState) => void
  isAutoMode: boolean
  setAutoMode: (auto: boolean) => void
}

export function useRukiState(initialState: RukiState = 'idle'): UseRukiStateReturn {
  const [state, setState] = useState<RukiState>(initialState)
  const [isAutoMode, setAutoMode] = useState(true)
  const boredomTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetBoredom = useCallback(() => {
    if (boredomTimer.current) clearTimeout(boredomTimer.current)
    boredomTimer.current = null
  }, [])

  const setRukiState = useCallback((newState: RukiState) => {
    setState(newState)
    // Auto mode: reset boredom timer on any manual state change
    resetBoredom()
    if (newState === 'idle') {
      boredomTimer.current = setTimeout(() => setState('bored'), 2 * 60 * 1000)
    }
    if (newState === 'bored') {
      boredomTimer.current = setTimeout(() => setState('sleepy'), 3 * 60 * 1000)
    }
  }, [resetBoredom])

  // Auto boredom progression
  useEffect(() => {
    if (!isAutoMode) {
      resetBoredom()
      return
    }

    if (state === 'idle') {
      boredomTimer.current = setTimeout(() => {
        setState('bored')
      }, 2 * 60 * 1000) // 2 min idle → bored
    }

    if (state === 'bored') {
      boredomTimer.current = setTimeout(() => {
        setState('sleepy')
      }, 3 * 60 * 1000) // 3 min bored → sleepy
    }

    return () => resetBoredom()
  }, [state, isAutoMode, resetBoredom])

  // Cleanup on unmount
  useEffect(() => {
    return () => resetBoredom()
  }, [resetBoredom])

  return {
    state,
    setState: setRukiState,
    isAutoMode,
    setAutoMode,
  }
}
