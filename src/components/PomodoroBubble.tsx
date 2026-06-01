import React from 'react'

interface PomodoroBubbleProps {
  timeRemaining: number
  formattedTime: string
}

const ENCOURAGEMENTS = [
  "Focus time! You got this!",
  "Stay sharp!",
  "Halfway there! Keep it up!",
  "You're doing great!",
  "Deep focus now!",
  "One step at a time!",
  "Believe in yourself!",
  "Almost there!",
  "Stay in the zone!",
  "Knowledge is power!",
]

export default function PomodoroBubble({ timeRemaining, formattedTime }: PomodoroBubbleProps) {
  // Pick an encouragement based on the current minute to avoid flickering
  const minuteIndex = Math.floor(timeRemaining / 60) % ENCOURAGEMENTS.length
  const encouragement = ENCOURAGEMENTS[minuteIndex]

  return (
    <div className="bubble absolute -top-16 left-1/2 -translate-x-1/2 z-50">
      <div className="flex flex-col items-center gap-1">
        <span className="font-bold text-ruki-teal text-sm">{formattedTime}</span>
        <span className="text-xs text-gray-600 leading-tight">{encouragement}</span>
      </div>
    </div>
  )
}
