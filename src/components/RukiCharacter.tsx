import React, { useEffect, useRef, useState, useCallback } from 'react'
import { RukiState, useRukiState } from '../hooks/useRukiState'
import { usePomodoro } from '../hooks/usePomodoro'
import PomodoroBubble from './PomodoroBubble'
import rukiImage from '../../assets/ruki.png'

const RUKI_WIDTH = 160
const RUKI_HEIGHT = 220

const stateAnimationClass: Record<RukiState, string> = {
  idle: 'ruki-idle',
  walk: 'ruki-walk',
  run: 'ruki-run',
  wave: 'ruki-wave',
  dance: 'ruki-dance',
  follow_cursor: 'ruki-idle',
  sleepy: 'ruki-sleepy',
  celebrating: 'ruki-celebrate',
}

export default function RukiCharacter() {
  const { state, setState } = useRukiState()
  const { isActive, timeRemaining, startTimer, stopTimer, formatTime } = usePomodoro({
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const cursorTarget = useRef({ x: 0, y: 0 })
  const followInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cursor following logic
  useEffect(() => {
    if (state === 'follow_cursor') {
      const handleMouseMove = (e: MouseEvent) => {
        cursorTarget.current = { x: e.clientX - RUKI_WIDTH / 2, y: e.clientY - RUKI_HEIGHT }
      }
      window.addEventListener('mousemove', handleMouseMove)

      followInterval.current = setInterval(() => {
        setPosition((prev) => {
          const dx = cursorTarget.current.x - prev.x
          const dy = cursorTarget.current.y - prev.y
          const newX = prev.x + dx * 0.08
          const newY = prev.y + dy * 0.08
          return { x: newX, y: newY }
        })
      }, 16)

      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        if (followInterval.current) clearInterval(followInterval.current)
      }
    }
  }, [state])

  // Dragging logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (state === 'follow_cursor') return
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }, [state, position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const newX = e.clientX - dragOffset.current.x
    const newY = e.clientY - dragOffset.current.y
    setPosition({ x: newX, y: newY })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Context menu for state switching (dev/test)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const states: RukiState[] = ['idle', 'walk', 'run', 'wave', 'dance', 'follow_cursor', 'sleepy', 'celebrating']
    const currentIndex = states.indexOf(state)
    const nextState = states[(currentIndex + 1) % states.length]
    setState(nextState)
  }, [state, setState])

  // Open chat on double click
  const handleDoubleClick = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.openChat()
    }
  }, [])

  // Listen for tray pomodoro start
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onStartPomodoro(() => {
        startTimer()
      })
      return () => {
        window.electronAPI.removeAllListeners('start-pomodoro')
      }
    }
  }, [startTimer])

  // Auto-return to idle after wave/dance/celebrate
  useEffect(() => {
    if (state === 'wave' || state === 'dance' || state === 'celebrating') {
      const timer = setTimeout(() => {
        setState('idle')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [state, setState])

  // Inactivity -> sleepy
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (state === 'sleepy') setState('idle')
    inactivityTimer.current = setTimeout(() => {
      if (!isActive) setState('sleepy')
    }, 60000) // 1 minute of inactivity
  }, [state, setState, isActive])

  useEffect(() => {
    window.addEventListener('mousemove', resetInactivity)
    window.addEventListener('keydown', resetInactivity)
    return () => {
      window.removeEventListener('mousemove', resetInactivity)
      window.removeEventListener('keydown', resetInactivity)
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [resetInactivity])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none"
      style={{
        transform: state === 'follow_cursor' ? `translate(${position.x}px, ${position.y}px)` : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {/* Pomodoro Bubble */}
      {isActive && (
        <PomodoroBubble
          timeRemaining={timeRemaining}
          formattedTime={formatTime(timeRemaining)}
        />
      )}

      {/* Ruki Character */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 transition-transform duration-300 ${stateAnimationClass[state]}`}
        style={{ width: RUKI_WIDTH, height: RUKI_HEIGHT }}
      >
        <img
          src={rukiImage}
          alt="Ruki"
          className="w-full h-full object-contain drop-shadow-lg"
          draggable={false}
        />

        {/* Sleep Zzz particles */}
        {state === 'sleepy' && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <span className="inline-block text-blue-300 text-lg animate-float">Z</span>
            <span className="inline-block text-blue-300 text-sm animate-float ml-1" style={{ animationDelay: '0.5s' }}>z</span>
            <span className="inline-block text-blue-300 text-xs animate-float ml-1" style={{ animationDelay: '1s' }}>z</span>
          </div>
        )}
      </div>

      {/* Click hint (only when idle) */}
      {state === 'idle' && !isActive && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-white/60 text-[10px] whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          Double-click to chat · Right-click to animate
        </div>
      )}
    </div>
  )
}
