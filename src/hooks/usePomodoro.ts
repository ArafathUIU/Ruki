import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePomodoroOptions {
  workDuration: number // in seconds
  breakDuration: number // in seconds
}

interface UsePomodoroReturn {
  isActive: boolean
  timeRemaining: number
  isBreak: boolean
  startTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
  formatTime: (seconds: number) => string
}

export function usePomodoro(options: UsePomodoroOptions): UsePomodoroReturn {
  const { workDuration, breakDuration } = options
  const [isActive, setIsActive] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(workDuration)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    if (isActive) return
    setIsActive(true)
    setIsBreak(false)
    setTimeRemaining(workDuration)

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer finished
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [isActive, workDuration])

  const stopTimer = useCallback(() => {
    setIsActive(false)
    clearTimerInterval()
  }, [clearTimerInterval])

  const resetTimer = useCallback(() => {
    setIsActive(false)
    setIsBreak(false)
    setTimeRemaining(workDuration)
    clearTimerInterval()
  }, [workDuration, clearTimerInterval])

  // Handle timer completion
  useEffect(() => {
    if (isActive && timeRemaining === 0) {
      clearTimerInterval()
      setIsActive(false)
      // TODO: Send notification/celebration when timer completes
    }
  }, [isActive, timeRemaining, clearTimerInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimerInterval()
    }
  }, [clearTimerInterval])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  return {
    isActive,
    timeRemaining,
    isBreak,
    startTimer,
    stopTimer,
    resetTimer,
    formatTime,
  }
}
