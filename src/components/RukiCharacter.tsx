import React, { useEffect, useRef, useState, useCallback } from 'react'
import { RukiState, useRukiState } from '../hooks/useRukiState'
import { usePomodoro } from '../hooks/usePomodoro'
import PomodoroBubble from './PomodoroBubble'
import RukiCartoon from './RukiCartoon'
import type { Emotion } from './RukiCartoon'

const RUKI_WIDTH = 160
const RUKI_HEIGHT = 220
const FOLLOW_SPEED = 0.06
const STOP_THRESHOLD = 25
const PROXIMITY_FOLLOW = 120
const PROXIMITY_WAVE = 250

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

const BORED_THOUGHTS = ['...', 'hmm', '💤']

interface Particle {
  id: number
  type: 'sparkle' | 'dust' | 'zzz'
  x: number
  y: number
  delay: number
}

let particleId = 0

export default function RukiCharacter() {
  const { state, setState, isAutoMode } = useRukiState()
  const { isActive, timeRemaining, startTimer, formatTime } = usePomodoro({
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
  })

  // Animation state
  const [rightArm, setRightArm] = useState(0)
  const [leftArm, setLeftArm] = useState(0)
  const [bodyTilt, setBodyTilt] = useState(0)
  const [bodyBob, setBodyBob] = useState(0)
  const [eyeScale, setEyeScale] = useState(1)
  const [mouth, setMouth] = useState<'smile' | 'neutral' | 'open' | 'sleep' | 'yawn'>('smile')
  const [emotion, setEmotion] = useState<Emotion>('happy')

  const cursorPos = useRef({ x: 0, y: 0 })
  const windowPos = useRef({ x: 0, y: 0 })
  const followAnimId = useRef<number>(0)
  const animFrameId = useRef<number>(0)
  const animTimeRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [isNearCursor, setIsNearCursor] = useState(false)
  const [followSpeedClass, setFollowSpeedClass] = useState('')
  const [particles, setParticles] = useState<Particle[]>([])
  const [boredThought, setBoredThought] = useState('...')
  const [thoughtBubble, setThoughtBubble] = useState<{ text: string; visible: boolean; key: number }>({ text: '', visible: false, key: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // --- Show thought bubble on state changes ---
  useEffect(() => {
    const messages: Record<string, string> = {
      idle: '',
      bored: boredThought,
      walk: '',
      run: '',
      wave: 'Hello! 👋',
      dance: 'La la la~ 🎵',
      follow_cursor: isNearCursor ? 'Oh hi!' : 'Coming! 🏃‍♀️',
      sleepy: 'Zzz...',
      celebrating: 'Yay! 🎉',
    }
    const text = messages[state] || ''
    if (text) {
      setThoughtBubble({ text, visible: true, key: Date.now() })
    } else if (state === 'bored') {
      // Bored updates continuously from the interval
    } else {
      setThoughtBubble((prev) => ({ ...prev, visible: false }))
    }
  }, [state, isNearCursor])

  // --- Animation frame loop ---
  useEffect(() => {
    const animate = (time: number) => {
      const dt = animTimeRef.current ? (time - animTimeRef.current) / 1000 : 0.016
      animTimeRef.current = time

      const t = time / 1000

      switch (state) {
        case 'idle':
          setRightArm(Math.sin(t * 2) * 5)
          setLeftArm(Math.sin(t * 2 + Math.PI) * 3)
          setBodyBob(Math.sin(t * 3) * 2)
          setBodyTilt(Math.sin(t * 1.5) * 1)
          setEyeScale(1)
          setMouth('smile')
          setEmotion('happy')
          break

        case 'bored':
          setRightArm(Math.sin(t * 1.2) * 3)
          setLeftArm(Math.sin(t * 1.2) * 2)
          setBodyBob(Math.sin(t * 2) * 1.5)
          setBodyTilt(Math.sin(t * 0.7) * 3)
          setEyeScale(0.85)
          setMouth(Math.sin(t * 0.3) > 0.5 ? 'yawn' : 'neutral')
          setEmotion('bored')
          break

        case 'walk':
          setRightArm(Math.sin(t * 10) * 25)
          setLeftArm(Math.sin(t * 10 + Math.PI) * 25)
          setBodyBob(Math.sin(t * 20) * 5)
          setBodyTilt(Math.sin(t * 5) * 2)
          setEyeScale(1)
          setMouth('smile')
          setEmotion('happy')
          break

        case 'run':
          setRightArm(Math.sin(t * 16) * 35)
          setLeftArm(Math.sin(t * 16 + Math.PI) * 35)
          setBodyBob(Math.sin(t * 28) * 7)
          setBodyTilt(Math.sin(t * 8) * 3)
          setEyeScale(1)
          setMouth('open')
          setEmotion('excited')
          break

        case 'wave':
          setRightArm(-20 + Math.sin(t * 6) * 25)
          setLeftArm(40 + Math.sin(t * 2) * 10)
          setBodyBob(Math.sin(t * 3) * 3)
          setBodyTilt(Math.sin(t * 4) * 2)
          setEyeScale(1)
          setMouth('open')
          setEmotion('excited')
          break

        case 'dance':
          setRightArm(Math.sin(t * 8) * 40 + 20)
          setLeftArm(Math.sin(t * 8 + Math.PI) * 40 + 20)
          setBodyBob(Math.sin(t * 12) * 8)
          setBodyTilt(Math.sin(t * 6) * 5)
          setEyeScale(1)
          setMouth('open')
          setEmotion('excited')
          break

        case 'follow_cursor':
          if (isNearCursor) {
            setRightArm(Math.sin(t * 4) * 3)
            setLeftArm(Math.sin(t * 4) * 2)
            setBodyBob(Math.sin(t * 3) * 1)
            setBodyTilt(0)
            setMouth('smile')
          } else {
            const speed = followSpeedClass === 'ruki-run' ? 16 : 10
            setRightArm(Math.sin(t * speed) * 28)
            setLeftArm(Math.sin(t * speed + Math.PI) * 28)
            setBodyBob(Math.sin(t * speed * 2) * 5)
            setBodyTilt(Math.sin(t * speed / 2) * 2)
            setEyeScale(1)
            setMouth('smile')
          }
          setEmotion('happy')
          setEyeScale(1)
          break

        case 'sleepy':
          setRightArm(-30 + Math.sin(t * 0.5) * 3)
          setLeftArm(-20 + Math.sin(t * 0.5) * 2)
          setBodyBob(Math.sin(t * 1) * 1)
          setBodyTilt(12 + Math.sin(t * 1.5) * 3)
          setEyeScale(0.4 + Math.sin(t * 0.4) * 0.15)
          setMouth('sleep')
          setEmotion('sleepy')
          break

        case 'celebrating':
          setRightArm(-50 + Math.sin(t * 8) * 15)
          setLeftArm(-50 + Math.sin(t * 8 + Math.PI) * 15)
          setBodyBob(Math.sin(t * 10) * 12)
          setBodyTilt(Math.sin(t * 6) * 4)
          setEyeScale(1)
          setMouth('open')
          setEmotion('excited')
          break
      }

      animFrameId.current = requestAnimationFrame(animate)
    }

    animFrameId.current = requestAnimationFrame(animate)
    return () => { if (animFrameId.current) cancelAnimationFrame(animFrameId.current) }
  }, [state, isNearCursor, followSpeedClass])

  // --- Get initial window position ---
  useEffect(() => {
    const fetchBounds = async () => {
      if (window.electronAPI) {
        const bounds = await window.electronAPI.getRukiBounds()
        if (bounds) windowPos.current = { x: bounds.x, y: bounds.y }
      }
    }
    fetchBounds()
  }, [])

  // --- Blink timer ---
  useEffect(() => {
    const blink = () => {
      setEyeScale(0.1)
      setTimeout(() => setEyeScale(1), 100)
    }
    const interval = setInterval(blink, 3000 + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [])

  // --- Particle system ---
  const spawnParticles = useCallback((type: 'sparkle' | 'dust' | 'zzz', count: number) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      newParticles.push({ id: particleId++, type, x: RUKI_WIDTH / 2, y: RUKI_HEIGHT - 20, delay: i * 0.1 })
    }
    setParticles((prev) => [...prev.slice(-30), ...newParticles])
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)))
    }, 2000)
  }, [])

  // Dust when walking/running
  useEffect(() => {
    if (state === 'walk' || state === 'run' || (state === 'follow_cursor' && !isNearCursor)) {
      const interval = setInterval(() => spawnParticles('dust', 2), 250)
      return () => clearInterval(interval)
    }
  }, [state, isNearCursor, spawnParticles])

  // Sparkles when waving/dancing
  useEffect(() => {
    if (state === 'wave' || state === 'dance' || state === 'celebrating') {
      const interval = setInterval(() => spawnParticles('sparkle', 3), 400)
      return () => clearInterval(interval)
    }
  }, [state, spawnParticles])

  // Bored thought bubbles
  useEffect(() => {
    if (state === 'bored') {
      const interval = setInterval(() => {
        const text = BORED_THOUGHTS[Math.floor(Math.random() * BORED_THOUGHTS.length)]
        setBoredThought(text)
        setThoughtBubble({ text, visible: true, key: Date.now() })
      }, 3500)
      return () => {
        clearInterval(interval)
        setThoughtBubble((prev) => ({ ...prev, visible: false }))
      }
    }
  }, [state])

  // --- Cursor proximity (global tracking) ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // screenX/Y = absolute screen coordinates (matches getRukiBounds)
      cursorPos.current = { x: e.screenX, y: e.screenY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    const proximityCheck = setInterval(async () => {
      if (!isAutoMode || !window.electronAPI) return
      if (isDragging || state === 'follow_cursor' || state === 'dance' || state === 'celebrating') return

      const bounds = await window.electronAPI.getRukiBounds()
      if (!bounds) return

      const rukiCenter = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      const dist = distance(cursorPos.current, rukiCenter)

      if (dist < PROXIMITY_FOLLOW) {
        if (state !== 'follow_cursor') setState('follow_cursor')
      } else if (dist < PROXIMITY_WAVE) {
        if (state === 'sleepy' || state === 'bored') {
          setState('wave')
          spawnParticles('sparkle', 5)
        }
      }
    }, 300)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearInterval(proximityCheck)
    }
  }, [isAutoMode, isDragging, state, setState, spawnParticles])

  // --- Cursor following (moves Electron window) ---
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
        setFollowSpeedClass('stopped')
      } else if (dist < PROXIMITY_WAVE) {
        setIsNearCursor(false)
        setFollowSpeedClass('walk')
      } else {
        setIsNearCursor(false)
        setFollowSpeedClass('run')
      }

      if (dist > STOP_THRESHOLD) {
        const speed = Math.min(dist * FOLLOW_SPEED, 15)
        const nx = currentPos.x + (targetX - currentPos.x) * (speed / dist)
        const ny = currentPos.y + (targetY - currentPos.y) * (speed / dist)
        if (Number.isFinite(nx) && Number.isFinite(ny)) {
          await window.electronAPI.setRukiPosition(nx, ny)
        }
      }

      followAnimId.current = requestAnimationFrame(follow)
    }

    followAnimId.current = requestAnimationFrame(follow)
    return () => { if (followAnimId.current) cancelAnimationFrame(followAnimId.current) }
  }, [state])

  // --- Dragging ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (state === 'follow_cursor') return
    setIsDragging(true)
    dragOffset.current = { x: e.screenX - windowPos.current.x, y: e.screenY - windowPos.current.y }
  }, [state])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const newX = e.screenX - dragOffset.current.x
    const newY = e.screenY - dragOffset.current.y
    if (Number.isFinite(newX) && Number.isFinite(newY)) {
      windowPos.current = { x: newX, y: newY }
      if (window.electronAPI) window.electronAPI.setRukiPosition(newX, newY)
    }
  }, [isDragging])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  // --- Interactions ---
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const states: RukiState[] = ['idle', 'wave', 'dance', 'follow_cursor', 'sleepy', 'celebrating']
    const currentIndex = states.indexOf(state)
    const next = states[(currentIndex + 1) % states.length]
    setState(next)
  }, [state, setState])

  const handleClick = useCallback(() => {
    if (state !== 'follow_cursor' && state !== 'wave' && state !== 'dance' && state !== 'celebrating') {
      setState('wave')
      spawnParticles('sparkle', 6)
    }
  }, [state, setState, spawnParticles])

  const handleDoubleClick = useCallback(() => {
    if (window.electronAPI) window.electronAPI.openChat()
  }, [])

  // Pomodoro tray
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
      {isActive && <PomodoroBubble timeRemaining={timeRemaining} formattedTime={formatTime(timeRemaining)} />}

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={`${p.type}-particle`}
          style={{
            '--tx': `${(Math.random() - 0.5) * 50}px`,
            '--ty': `${-20 - Math.random() * 30}px`,
            '--tx2': `${(Math.random() - 0.5) * 80}px`,
            '--ty2': `${-40 - Math.random() * 50}px`,
            left: p.x,
            top: p.y,
            animationDelay: `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Thought Bubble */}
      {thoughtBubble.visible && thoughtBubble.text && (
        <div key={thoughtBubble.key} className="thought-bubble absolute -top-16 left-1/2 -translate-x-1/2 z-50">
          {thoughtBubble.text}
        </div>
      )}

      {/* Follow indicator */}
      {state === 'follow_cursor' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <span className="text-[10px] text-white/70 bg-black/30 rounded-full px-2 py-0.5">
            {isNearCursor ? 'Hi! 😊' : followSpeedClass === 'run' ? 'Coming!' : 'Following...'}
          </span>
        </div>
      )}

      {/* Ruki Cartoon Character */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2" style={{ width: RUKI_WIDTH, height: RUKI_HEIGHT }}>
        <RukiCartoon
          emotion={emotion}
          rightArmRotate={rightArm}
          leftArmRotate={leftArm}
          bodyTilt={bodyTilt}
          bodyBob={bodyBob}
          eyeScale={eyeScale}
          mouthType={mouth}
          className="w-full h-full"
        />

        {/* Sleep Zzz */}
        {state === 'sleepy' && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <span className="inline-block text-blue-300 text-lg opacity-80" style={{ animation: 'zzzFloat 2.5s ease-out infinite' }}>Z</span>
            <span className="inline-block text-blue-300 text-sm opacity-60 ml-2" style={{ animation: 'zzzFloat 2.5s ease-out infinite', animationDelay: '0.6s' }}>z</span>
            <span className="inline-block text-blue-300 text-xs opacity-40 ml-2" style={{ animation: 'zzzFloat 2.5s ease-out infinite', animationDelay: '1.2s' }}>z</span>
          </div>
        )}
      </div>

      {/* Hint */}
      {!isActive && state !== 'follow_cursor' && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-white/40 text-[9px] whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          Click to wave · Double-click to chat · Right-click to cycle
        </div>
      )}
    </div>
  )
}
