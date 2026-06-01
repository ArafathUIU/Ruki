import React, { useState, useEffect } from 'react'

interface Flashcard {
  id: number
  question: string
  answer: string
  difficulty: string
}

export default function FlashcardDeck() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadFlashcards()
  }, [])

  const loadFlashcards = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/flashcards')
      const data = await response.json()
      setFlashcards(data.flashcards || [])
    } catch (error) {
      console.error('Failed to load flashcards:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNext = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % flashcards.length)
  }

  const handlePrev = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
  }

  const handleReview = async (correct: boolean) => {
    const card = flashcards[currentIndex]
    if (!card) return

    try {
      await fetch(`http://localhost:8000/api/flashcards/${card.id}/review?correct=${correct}`, {
        method: 'POST',
      })
    } catch (error) {
      console.error('Failed to record review:', error)
    }

    handleNext()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-white/60">
        Loading flashcards...
      </div>
    )
  }

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/60">
        <div className="text-4xl mb-2">📝</div>
        <div className="text-sm">No flashcards yet.</div>
        <div className="text-xs mt-1">Upload a PDF and generate flashcards!</div>
      </div>
    )
  }

  const currentCard = flashcards[currentIndex]

  return (
    <div className="w-full h-full p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Flashcards</h2>
        <span className="text-xs text-white/60">
          {currentIndex + 1} / {flashcards.length}
        </span>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center mb-4">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative w-full max-w-sm h-64 cursor-pointer perspective-1000"
        >
          <div
            className={`w-full h-full transition-all duration-500 preserve-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 bg-white/10 rounded-2xl p-6 flex items-center justify-center border border-white/20"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-center">
                <div className="text-xs text-ruki-teal mb-2 uppercase tracking-wider">Question</div>
                <div className="text-white text-lg font-medium">{currentCard.question}</div>
                <div className="text-white/40 text-xs mt-4">Click to flip</div>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-ruki-teal/20 rounded-2xl p-6 flex items-center justify-center border border-ruki-teal/30"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="text-center">
                <div className="text-xs text-ruki-teal mb-2 uppercase tracking-wider">Answer</div>
                <div className="text-white text-lg">{currentCard.answer}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Previous
        </button>

        {isFlipped && (
          <div className="flex gap-2">
            <button
              onClick={() => handleReview(false)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg px-4 py-2 text-sm transition-colors"
            >
              ❌ Hard
            </button>
            <button
              onClick={() => handleReview(true)}
              className="bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg px-4 py-2 text-sm transition-colors"
            >
              ✅ Easy
            </button>
          </div>
        )}

        <button
          onClick={handleNext}
          className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 text-sm transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
