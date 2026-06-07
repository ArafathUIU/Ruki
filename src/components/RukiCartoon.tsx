import React from 'react'

export type Emotion = 'neutral' | 'happy' | 'sleepy' | 'excited' | 'bored'

interface RukiCartoonProps {
  emotion?: Emotion
  rightArmRotate?: number
  leftArmRotate?: number
  bodyTilt?: number
  bodyBob?: number
  eyeScale?: number
  mouthType?: 'smile' | 'neutral' | 'open' | 'sleep' | 'yawn'
  className?: string
}

const EYE_PATH_OPEN = 'M-16,-4 Q-10,-14 0,-4 Q10,-14 16,-4 Q16,5 0,5 Q-16,5 -16,-4 Z'
const EYE_PATH_SLEEP = 'M-16,2 Q0,8 16,2 Q0,-2 -16,2 Z'
const MOUTH_SMILE = 'M-6,0 Q0,7 6,0'
const MOUTH_NEUTRAL = 'M-5,0 L5,0'
const MOUTH_OPEN = 'M-6,0 Q0,10 6,0 Q0,5 -6,0'
const MOUTH_SLEEP = 'M-3,2 Q0,6 3,2'
const MOUTH_YAWN = 'M-8,0 Q0,14 8,0 Q0,8 -8,0'

export default function RukiCartoon({
  emotion = 'neutral',
  rightArmRotate = 0,
  leftArmRotate = 0,
  bodyTilt = 0,
  bodyBob = 0,
  eyeScale = 1,
  mouthType = 'smile',
  className = '',
}: RukiCartoonProps) {
  const eyePath = emotion === 'sleepy' ? EYE_PATH_SLEEP : EYE_PATH_OPEN
  const mouthPath = (() => {
    switch (mouthType) {
      case 'smile': return MOUTH_SMILE
      case 'neutral': return MOUTH_NEUTRAL
      case 'open': return MOUTH_OPEN
      case 'sleep': return MOUTH_SLEEP
      case 'yawn': return MOUTH_YAWN
      default: return MOUTH_SMILE
    }
  })()

  const blushOpacity = emotion === 'happy' || emotion === 'excited' ? 0.4 : 0
  const tearOpacity = emotion === 'bored' || emotion === 'sleepy' ? 0.3 : 0

  return (
    <svg
      viewBox="-60 -80 120 170"
      className={className}
      width="160"
      height="220"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="skinGrad" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#FDE8D0" />
          <stop offset="100%" stopColor="#F0C8A0" />
        </radialGradient>
        <radialGradient id="hairGrad" cx="50%" cy="30%">
          <stop offset="0%" stopColor="#3D1C00" />
          <stop offset="100%" stopColor="#1A0A00" />
        </radialGradient>
        <linearGradient id="sareeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2D9CDB" />
          <stop offset="50%" stopColor="#1E7AB5" />
          <stop offset="100%" stopColor="#2D9CDB" />
        </linearGradient>
        <linearGradient id="sareePallu" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#3DB8E8" />
          <stop offset="100%" stopColor="#2D9CDB" />
        </linearGradient>
        <filter id="dropShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#00000030" />
        </filter>
      </defs>

      {/* Body group with tilt and bob */}
      <g transform={`rotate(${bodyTilt}, 0, 20) translate(0, ${bodyBob})`}>
        {/* --- Shadow --- */}
        <ellipse cx="0" cy="85" rx="28" ry="6" fill="#00000018" />

        {/* --- Feet / Legs --- */}
        <g transform="translate(-12, 65)">
          <ellipse cx="0" cy="0" rx="8" ry="4" fill="#F0C8A0" />
        </g>
        <g transform="translate(12, 65)">
          <ellipse cx="0" cy="0" rx="8" ry="4" fill="#F0C8A0" />
        </g>

        {/* --- Saree / Body --- */}
        <path
          d="M-28,20 L-32,68 Q-28,72 0,72 Q28,72 32,68 L28,20 Q20,10 0,10 Q-20,10 -28,20 Z"
          fill="url(#sareeGrad)"
          filter="url(#dropShadow)"
        />
        {/* Saree border */}
        <path
          d="M-28,20 Q-26,25 -24,20 M28,20 Q26,25 24,20"
          stroke="#F2C94C"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Saree pallu drape */}
        <path
          d="M8,15 Q20,30 14,55 Q10,65 0,72"
          stroke="url(#sareePallu)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        {/* Gold border on pallu */}
        <path
          d="M8,15 Q20,30 14,55 Q10,65 0,72"
          stroke="#F2C94C"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        {/* Gold bangles */}
        <circle cx="-24" cy="40" r="3" fill="none" stroke="#F2C94C" strokeWidth="1.5" />
        <circle cx="-24" cy="45" r="3" fill="none" stroke="#F2C94C" strokeWidth="1.5" />
        <circle cx="24" cy="40" r="3" fill="none" stroke="#F2C94C" strokeWidth="1.5" />
        <circle cx="24" cy="45" r="3" fill="none" stroke="#F2C94C" strokeWidth="1.5" />

        {/* --- Neck --- */}
        <rect x="-10" y="0" width="20" height="14" rx="5" fill="#F0C8A0" />

        {/* --- Head --- */}
        <g>
          {/* Hair back */}
          <ellipse cx="0" cy="-20" rx="32" ry="36" fill="url(#hairGrad)" />
          <ellipse cx="-15" cy="-8" rx="10" ry="28" fill="#2D1000" />
          <ellipse cx="15" cy="-8" rx="10" ry="28" fill="#2D1000" />
          {/* Hair top */}
          <ellipse cx="0" cy="-48" rx="30" ry="18" fill="url(#hairGrad)" />

          {/* Face */}
          <ellipse cx="0" cy="-18" rx="26" ry="28" fill="url(#skinGrad)" />

          {/* Hair strand */}
          <path d="M18,-30 Q30,-8 22,15" stroke="#2D1000" strokeWidth="4" fill="none" strokeLinecap="round" />

          {/* --- Eye whites --- */}
          <g transform={`scale(${eyeScale}, 1)`}>
            {/* Left eye white */}
            <ellipse cx="-10" cy="-22" rx="12" ry="10" fill="white" />
            {/* Right eye white */}
            <ellipse cx="10" cy="-22" rx="12" ry="10" fill="white" />

            {/* Left iris */}
            <ellipse cx="-10" cy="-22" rx="7" ry="8" fill="#2D1B00" />
            {/* Right iris */}
            <ellipse cx="10" cy="-22" rx="7" ry="8" fill="#2D1B00" />

            {/* Left pupil */}
            <ellipse cx="-10" cy="-22" rx="3.5" ry="4" fill="#0A0500" />
            {/* Right pupil */}
            <ellipse cx="10" cy="-22" rx="3.5" ry="4" fill="#0A0500" />

            {/* Eye shine */}
            <circle cx="-7" cy="-25" r="2.5" fill="white" opacity="0.9" />
            <circle cx="13" cy="-25" r="2.5" fill="white" opacity="0.9" />
            {/* Small shine */}
            <circle cx="-12" cy="-20" r="1.2" fill="white" opacity="0.6" />
            <circle cx="8" cy="-20" r="1.2" fill="white" opacity="0.6" />
          </g>

          {/* Sleepy/happy eyelids */}
          {emotion === 'sleepy' && (
            <>
              <path d="M-22,-20 Q-10,-14 2,-18" stroke="#F0C8A0" strokeWidth="4" fill="#F0C8A0C0" strokeLinecap="round" />
              <path d="M-2,-18 Q10,-14 22,-20" stroke="#F0C8A0" strokeWidth="4" fill="#F0C8A0C0" strokeLinecap="round" />
            </>
          )}

          {/* Eyebrows */}
          <path d="M-18,-32 Q-10,-36 -2,-32" stroke="#2D1000" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M2,-32 Q10,-36 18,-32" stroke="#2D1000" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Blush */}
          <ellipse cx="-16" cy="-14" rx="6" ry="3" fill="#FF9999" opacity={blushOpacity} />
          <ellipse cx="16" cy="-14" rx="6" ry="3" fill="#FF9999" opacity={blushOpacity} />

          {/* Tear drop (bored/sleepy) */}
          {emotion === 'sleepy' && (
            <>
              <ellipse cx="-20" cy="-8" rx="2" ry="3" fill="#93C5FD" opacity={tearOpacity} />
              <ellipse cx="-20" cy="-4" rx="1.5" ry="2" fill="#93C5FD" opacity={tearOpacity * 0.5} />
            </>
          )}

          {/* Nose */}
          <ellipse cx="0" cy="-12" rx="2.5" ry="2" fill="#E8B888" opacity="0.6" />

          {/* Mouth */}
          <path d={mouthPath} stroke="#C05840" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {mouthType === 'open' && (
            <ellipse cx="0" cy="4" rx="5" ry="3" fill="#E06060" opacity="0.7" />
          )}

          {/* Head bindi */}
          <circle cx="0" cy="-36" r="2.5" fill="#C04040" opacity="0.8" />

          {/* Earrings */}
          <circle cx="-28" cy="-16" r="3" fill="none" stroke="#F2C94C" strokeWidth="1.5" />
          <circle cx="-28" cy="-12" r="1.5" fill="#F2C94C" />
          <circle cx="28" cy="-16" r="3" fill="none" stroke="#F2C94C" strokeWidth="1.5" />
          <circle cx="28" cy="-12" r="1.5" fill="#F2C94C" />
        </g>

        {/* --- Arms --- */}
        {/* Left arm */}
        <g transform={`rotate(${leftArmRotate}, -30, 25)`}>
          <path d="M-30,25 Q-44,35 -38,50" stroke="#F0C8A0" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* Sleeve */}
          <path d="M-30,25 Q-36,20 -34,18" stroke="#2D9CDB" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Hand */}
          <circle cx="-38" cy="50" r="5" fill="#FDE8D0" />
        </g>

        {/* Right arm */}
        <g transform={`rotate(${rightArmRotate}, 30, 25)`}>
          <path d="M30,25 Q44,35 38,50" stroke="#F0C8A0" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* Sleeve */}
          <path d="M30,25 Q36,20 34,18" stroke="#2D9CDB" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Hand */}
          <circle cx="38" cy="50" r="5" fill="#FDE8D0" />
        </g>
      </g>
    </svg>
  )
}
