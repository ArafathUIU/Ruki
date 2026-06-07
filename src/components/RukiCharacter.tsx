import React, { useEffect, useRef, useState, useCallback } from 'react'
import { RukiState, useRukiState } from '../hooks/useRukiState'
import { usePomodoro } from '../hooks/usePomodoro'
import PomodoroBubble from './PomodoroBubble'
import rukiImage from '../../assets/ruki.png'

const RUKI_WIDTH = 160
const RUKI_HEIGHT = 220
const FOLLOW_SPEED = 0.06
const STOP_THRESHOLD = 25
const PROXIMITY_FOLLOW = 120
const PROXIMITY_WAVE = 250

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

const stateAnimationClass: Record<string, string> = {
  idle: 'ruki-idle',
  bored: 'ruki-bored',
  walk: 'ruki-walk',
  run: 'ruki-run',
  wave: 'ruki-wave',
  dance: 'ruki-dance',
  follow_cursor: 'ruki-walk',
  sleepy: 'ruki-sleepy',
  celebrating: 'ruki-celebrate',
}

const BORED_THOUGHTS = ['...', 'hmm', '💤', 'zzz', '🥱']

interface Particle {
  id: number
  type: 'sparkle' | 'dust' | 'zzz'
  x: number
  y: number
  style: React.CSSProperties
  delay: number
}

let particleId = 0

export default function RukiCharacter() {
  const { state, setState, isAutoMode } = useRukiState()
  const { isActive, timeRemaining, startTimer, formatTime } = usePomodoro({
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
  const [particles, setParticles] = useState<Particle[]>([])
  const [boredThought, setBoredThought] = useState('...')
  const prevState = useRef<RukiState>('idle')

  // Get initial window position
  useEffect(() => {
    const fetchBounds = async () => {
      if (window.electronAPI) {
        const bounds = await window.electronAPI.getRukiBounds()
        if (bounds) windowPos.current = { x: bounds.x, y: bounds.y }
      }
    }
    fetchBounds()
  }, [])

  // --- Particle system ---
  const spawnParticles = useCallback((type: 'sparkle' | 'dust' | 'zzz', count: number, x: number, y: number) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const radius = 20 + Math.random() * 30
      const style: React.CSSProperties = {
        '--tx': `${Math.cos(angle) * radius}px`,
        '--ty': `${Math.sin(angle) * radius - 30}px`,
        '--tx2': `${Math.cos(angle) * radius * 2}px`,
        '--ty2': `${Math.sin(angle) * radius * 2 - 60}px`,
        left: `${x}px`,
        top: `${y}px`,
      } as React.CSSProperties
      newParticles.push({ id: particleId++, type, x, y, style, delay: i * 0.15 })
    }
    setParticles((prev) => [...prev.slice(-30), ...newParticles])
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)))
    }, 2000)
  }, [])

  // Spawn dust when walking/running
  useEffect(() => {
    if (state === 'walk' || state === 'run' || (state === 'follow_cursor' && !isNearCursor)) {
      const interval = setInterval(() => {
        spawnParticles('dust', 2, RUKI_WIDTH / 2, RUKI_HEIGHT - 10)
      }, 300)
      return () => clearInterval(interval)
    }
  }, [state, isNearCursor, spawnParticles])

  // Spawn sparkles when waving
  useEffect(() => {
    if (state === 'wave') {
      const interval = setInterval(() => {
        spawnParticles('sparkle', 3, RUKI_WIDTH / 2 + 30, RUKI_HEIGHT / 3)
      }, 600)
      return () => clearInterval(interval)
    }
  }, [state, spawnParticles])

  // Bored thought bubbles
  useEffect(() => {
    if (state === 'bored') {
      const interval = setInterval(() => {
        setBoredThought(BORED_THOUGHTS[Math.floor(Math.random() * BORED_THOUGHTS.length)])
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [state])

  // --- Cursor proximity (global tracking) ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorPos.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Proximity checker - runs even when not following
    const proximityCheck = setInterval(async () => {
      if (!isAutoMode || !window.electronAPI) return
      if (isDragging || state === 'follow_cursor' || state === 'dance' || state === 'celebrating') return

      const bounds = await window.electronAPI.getRukiBounds()
      if (!bounds) return

      const rukiCenter = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      }
      const dist = distance(cursorPos.current, rukiCenter)

      if (dist < PROXIMITY_FOLLOW) {
        // Close — start following
        if (state !== 'follow_cursor') setState('follow_cursor')
      } else if (dist < PROXIMITY_WAVE) {
        // Near — wake up and wave
        if (state === 'sleepy' || state === 'bored') {
          setState('wave')
          spawnParticles('sparkle', 5, RUKI_WIDTH / 2, RUKI_HEIGHT / 3)
        }
      }
    }, 500)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearInterval(proximityCheck)
    }
  }, [isAutoMode, isDragging, state, setState, spawnParticles])

  // --- Cursor following (moves the Electron window) ---
  useEffect(() => {
    if (state !== 'follow_cursor') {
      if (followAnimId.current) cancelAnimationFrame(followAnimId.current)
      return
    }

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
        setIsNearCursor(true)
        setFollowSpeedClass('ruki-idle')
      } else if (dist < PROXIMITY_WAVE) {
        setIsNearCursor(false)
        setFollowSpeedClass('ruki-walk')
      } else {
        setIsNearCursor(false)
        setFollowSpeedClass('ruki-run')
      }

      if (dist > STOP_THRESHOLD) {
        const speed = Math.min(dist * FOLLOW_SPEED, 15)
        const nx = currentPos.x + (targetX - currentPos.x) * (speed / dist)
        const ny = currentPos.y + (targetY - currentPos.y) * (speed / dist)
        await window.electronAPI.setRukiPosition(nx, ny)
      } else {
        // Cursor near but not moving → exit follow after a while
        // We keep following for now, just stopped
      }

      followAnimId.current = requestAnimationFrame(follow)
    }

    followAnimId.current = requestAnimationFrame(follow)

    return () => {
      if (followAnimId.current) cancelAnimationFrame(followAnimId.current)
    }
  }, [state])

  // --- Dragging ---
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
    if (window.electronAPI) window.electronAPI.setRukiPosition(newX, newY)
  }, [isDragging])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  // --- Interactions ---
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const states: RukiState[] = ['idle', 'wave', 'dance', 'follow_cursor', 'sleepy', 'celebrating']
    const currentIndex = states.indexOf(state)
    const next = states[(currentIndex + 1) % states.length]
    setState(next)
    if (next === 'wave') spawnParticles('sparkle', 6, RUKI_WIDTH / 2, RUKI_HEIGHT / 3)
    if (next === 'dance') spawnParticles('sparkle', 10, RUKI_WIDTH / 2, RUKI_HEIGHT / 2)
  }, [state, setState, spawnParticles])

  const handleClick = useCallback(() => {
    if (state !== 'follow_cursor' && state !== 'wave' && state !== 'dance' && state !== 'celebrating') {
      setState('wave')
      spawnParticles('sparkle', 6, RUKI_WIDTH / 2 + 30, RUKI_HEIGHT / 3)
    }
  }, [state, setState, spawnParticles])

  const handleDoubleClick = useCallback(() => {
    if (window.electronAPI) window.electronAPI.openChat()
  }, [])

  // Listen for pomodoro start from tray
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onStartPomodoro(() => startTimer())
      return () => { window.electronAPI.removeAllListeners('start-pomodoro') }
    }
  }, [startTimer])

  // Auto-return after wave/dance/celebrate
  useEffect(() => {
    if (state === 'wave' || state === 'dance' || state === 'celebrating') {
      const timer = setTimeout(() => setState('idle'), 4000)
      return () => clearTimeout(timer)
    }
  }, [state, setState])

  // Track state changes for transitions
  useEffect(() => { prevState.current = state }, [state])

  // Fix: wake from sleepy on any interaction
  useEffect(() => {
    if (state === 'sleepy' && prevState.current !== 'sleepy') {
      // Just entered sleepy
    }
  }, [state])

  // Determine animation class
  const animClass = state === 'follow_cursor' ? followSpeedClass : stateAnimationClass[state] || 'ruki-idle'

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
        <PomodoroBubble timeRemaining={timeRemaining} formattedTime={formatTime(timeRemaining)} />
      )}

      {/* Particles */}
      {particles.map((p) => (
        <div key={p.id} className={`${p.type}-particle`} style={{ ...p.style, animationDelay: `${p.delay}s` }} />
      ))}

      {/* Bored thought bubble */}
      {state === 'bored' && !isActive && (
        <div
          className="thought-bubble absolute -top-10 left-1/2 -translate-x-1/2 z-40"
          style={{ animationDelay: `${Math.random() * 2}s` }}
        >
          {boredThought}
        </div>
      )}

      {/* Cursor follow indicator */}
      {state === 'follow_cursor' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <span className="text-[10px] text-white/70 bg-black/30 rounded-full px-2 py-0.5">
            {isNearCursor ? 'Here!' : followSpeedClass === 'ruki-run' ? 'Coming!' : 'Following...'}
          </span>
        </div>
      )}

      {/* Ruki Character */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 ${animClass}`}
        style={{ width: RUKI_WIDTH, height: RUKI_HEIGHT, willChange: 'transform' }}
      >
        <img
          src={rukiImage}
          alt="Ruki"
          className="w-full h-full object-contain drop-shadow-lg"
          draggable={false}
        />

        {/* Sleep Zzz particles and effects */}
        {state === 'sleepy' && (
          <>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <span className="inline-block text-blue-300 text-lg animate-float" style={{ animationDelay: '0s' }}>Z</span>
              <span className="inline-block text-blue-300 text-sm animate-float ml-2" style={{ animationDelay: '0.6s' }}>z</span>
              <span className="inline-block text-blue-300 text-xs animate-float ml-2" style={{ animationDelay: '1.2s' }}>z</span>
            </div>
            {/* Sleepy drool/cloud */}
            <div className="absolute top-4 -right-2 opacity-30">
              <div className="w-4 h-4 bg-blue-200 rounded-full animate-float" style={{ animationDelay: '0.3s' }} />
              <div className="w-3 h-3 bg-blue-200 rounded-full -ml-2 -mt-1 animate-float" style={{ animationDelay: '0.8s' }} />
            </div>
          </>
        )}
      </div>

      {/* State label */}
      {!isActive && state !== 'follow_cursor' && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-white/40 text-[9px] whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          Click to wave · Double-click to chat · Right-click to cycle
        </div>
      )}
    </div>
  )
}
