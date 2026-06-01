import React, { useEffect, useRef, useState, useCallback } from 'react'
import { RukiState, useRukiState } from '../hooks/useRukiState'
import { usePomodoro } from '../hooks/usePomodoro'
import PomodoroBubble from './PomodoroBubble'
import rukiImage from '../../assets/ruki.png'

const RUKI_WIDTH = 160
const RUKI_HEIGHT = 220
const FOLLOW_SPEED = 0.05
const STOP_THRESHOLD = 30
const RESUME_THRESHOLD = 60

const stateAnimationClass: Record<RukiState, string> = {
  idle: 'ruki-idle',
  walk: 'ruki-walk',
  run: 'ruki-run',
  wave: 'ruki-wave',
  dance: 'ruki-dance',
  follow_cursor: 'ruki-walk',
  sleepy: 'ruki-sleepy',
  celebrating: 'ruki-celebrate',
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
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
  const cursorPos = useRef({ x: 0, y: 0 })
  const windowPos = useRef({ x: 0, y: 0 })
  const followAnimId = useRef<number>(0)
  const [isNearCursor, setIsNearCursor] = useState(false)
  const [followSpeedClass, setFollowSpeedClass] = useState('ruki-walk')

  // Get initial window position
  useEffect(() => {
    const fetchBounds = async () => {
      if (window.electronAPI) {
        const bounds = await window.electronAPI.getRukiBounds()
        if (bounds) {
          windowPos.current = { x: bounds.x, y: bounds.y }
        }
      }
    }
    fetchBounds()
  }, [])

  // Cursor following logic - moves the Electron window
  useEffect(() => {
    if (state !== 'follow_cursor') {
      if (followAnimId.current) cancelAnimationFrame(followAnimId.current)
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      cursorPos.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    const follow = async () => {
      if (!window.electronAPI) {
        followAnimId.current = requestAnimationFrame(follow)
        return
      }

      const bounds = await window.electronAPI.getRukiBounds()
      if (!bounds) {
        followAnimId.current = requestAnimationFrame(follow)
        return
      }

      const currentPos = { x: bounds.x, y: bounds.y }
      windowPos.current = currentPos

      const targetX = cursorPos.current.x - RUKI_WIDTH / 2
      const targetY = cursorPos.current.y - RUKI_HEIGHT
      const target = { x: targetX, y: targetY }

      const dist = distance(currentPos, target)

      if (dist < STOP_THRESHOLD) {
        // Close enough — stop, idle
        setIsNearCursor(true)
        setFollowSpeedClass('ruki-idle')
      } else if (dist < RESUME_THRESHOLD) {
        // Near — slow walk
        setIsNearCursor(false)
        setFollowSpeedClass('ruki-walk')
      } else {
        // Far — run
        setIsNearCursor(false)
        setFollowSpeedClass('ruki-run')
      }

      // Move window if far enough
      if (dist > STOP_THRESHOLD) {
        const speed = Math.min(dist * FOLLOW_SPEED, 15)
        const nx = currentPos.x + (targetX - currentPos.x) * (speed / dist)
        const ny = currentPos.y + (targetY - currentPos.y) * (speed / dist)
        await window.electronAPI.setRukiPosition(nx, ny)
      }

      followAnimId.current = requestAnimationFrame(follow)
    }

    followAnimId.current = requestAnimationFrame(follow)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (followAnimId.current) cancelAnimationFrame(followAnimId.current)
    }
  }, [state])

  // Dragging logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (state === 'follow_cursor') return
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - windowPos.current.x,
      y: e.clientY - windowPos.current.y,
    }
  }, [state])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const newX = e.clientX - dragOffset.current.x
    const newY = e.clientY - dragOffset.current.y
    windowPos.current = { x: newX, y: newY }
    if (window.electronAPI) {
      window.electronAPI.setRukiPosition(newX, newY)
    }
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Context menu for state switching
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const states: RukiState[] = ['idle', 'walk', 'run', 'wave', 'dance', 'follow_cursor', 'sleepy', 'celebrating']
    const currentIndex = states.indexOf(state)
    const nextState = states[(currentIndex + 1) % states.length]
    setState(nextState)
  }, [state, setState])

  // Single click — wave when not following
  const handleClick = useCallback(() => {
    if (state !== 'follow_cursor' && state !== 'wave' && state !== 'dance') {
      setState('wave')
    }
  }, [state, setState])

  // Double click — open chat
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
      if (!isActive && state !== 'follow_cursor') setState('sleepy')
    }, 60000)
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

  // Determine which animation class to use
  const animClass = state === 'follow_cursor' ? followSpeedClass : stateAnimationClass[state]

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none ruki-container"
      style={{ cursor: isDragging ? 'grabbing' : state === 'follow_cursor' ? 'default' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Pomodoro Bubble */}
      {isActive && (
        <PomodoroBubble
          timeRemaining={timeRemaining}
          formattedTime={formatTime(timeRemaining)}
        />
      )}

      {/* Cursor follow indicator */}
      {state === 'follow_cursor' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <span className="text-[10px] text-white/70 bg-black/30 rounded-full px-2 py-0.5">
            {isNearCursor ? 'Sniffing cursor' : 'Following...'}
          </span>
        </div>
      )}

      {/* Ruki Character */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 transition-transform duration-300 ${animClass}`}
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
          Click to wave · Double-click to chat · Right-click to animate
        </div>
      )}
    </div>
  )
}
