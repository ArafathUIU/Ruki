import { useState, useCallback } from 'react'

export type RukiState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'wave'
  | 'dance'
  | 'follow_cursor'
  | 'sleepy'
  | 'celebrating'

export function useRukiState(initialState: RukiState = 'idle') {
  const [state, setState] = useState<RukiState>(initialState)

  const setRukiState = useCallback((newState: RukiState) => {
    setState(newState)
  }, [])

  return {
    state,
    setState: setRukiState,
  }
}
