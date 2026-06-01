import React, { useState, useEffect } from 'react'

interface QuizQuestion {
  question: string
  options: string[]
  correct: string
}

interface QuizModalProps {
  documentId?: number
  onClose: () => void
}

export default function QuizModal({ documentId, onClose }: QuizModalProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showResult, setShowResult] = useState(false)
  const [answered, setAnswered] = useState(false)

  useEffect(() => {
    generateQuiz()
  }, [])

  const generateQuiz = async () => {
    if (!documentId) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId, num_questions: 5 }),
      })

      const data = await response.json()
      setQuestions(data.quiz || [])
    } catch (error) {
      console.error('Failed to generate quiz:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAnswer = (option: string) => {
    if (answered) return
    setSelectedAnswer(option)
    setAnswered(true)

    const currentQuestion = questions[currentIndex]
    if (option === currentQuestion.correct) {
      setScore((prev) => prev + 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedAnswer(null)
      setAnswered(false)
    } else {
      setShowResult(true)
    }
  }

  const getOptionLetter = (index: number) => {
    return ['A', 'B', 'C', 'D'][index]
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-ruki-dark rounded-2xl p-8 text-white">
          <div className="animate-pulse">Generating quiz...</div>
        </div>
      </div>
    )
  }

  if (!documentId || questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-ruki-dark rounded-2xl p-6 text-white max-w-md w-full mx-4">
          <h3 className="text-lg font-bold mb-4">Quiz</h3>
          <p className="text-white/60 mb-6">
            Upload a PDF document first to generate a quiz based on its content.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-ruki-teal hover:bg-ruki-teal/80 text-white rounded-xl py-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-ruki-dark rounded-2xl p-6 text-white max-w-md w-full mx-4 text-center">
          <div className="text-4xl mb-2">{percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '💪'}</div>
          <h3 className="text-xl font-bold mb-2">Quiz Complete!</h3>
          <div className="text-3xl font-bold text-ruki-teal mb-2">
            {score} / {questions.length}
          </div>
          <div className="text-sm text-white/60 mb-6">
            {percentage}% correct
          </div>
          <button
            onClick={onClose}
            className="w-full bg-ruki-teal hover:bg-ruki-teal/80 text-white rounded-xl py-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-ruki-dark rounded-2xl p-6 text-white max-w-lg w-full mx-4">
        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-white/60">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            ✕
          </button>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1 mb-6">
          <div
            className="bg-ruki-teal rounded-full h-1 transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="text-lg font-medium mb-6">{currentQuestion.question}</div>

        {/* Options */}
        <div className="space-y-2 mb-6">
          {currentQuestion.options.map((option, index) => {
            const letter = getOptionLetter(index)
            const isSelected = selectedAnswer === letter
            const isCorrect = letter === currentQuestion.correct
            const showCorrect = answered && isCorrect
            const showWrong = answered && isSelected && !isCorrect

            return (
              <button
                key={index}
                onClick={() => handleSelectAnswer(letter)}
                disabled={answered}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  showCorrect
                    ? 'bg-green-500/20 border-green-500/50 text-green-300'
                    : showWrong
                    ? 'bg-red-500/20 border-red-500/50 text-red-300'
                    : isSelected
                    ? 'bg-ruki-teal/20 border-ruki-teal/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                }`}
              >
                <span className="font-bold mr-2">{letter})</span>
                {option.replace(/^[A-D]\)\s*/, '')}
              </button>
            )
          })}
        </div>

        {/* Next button */}
        {answered && (
          <button
            onClick={handleNext}
            className="w-full bg-ruki-teal hover:bg-ruki-teal/80 text-white rounded-xl py-2 transition-colors"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        )}
      </div>
    </div>
  )
}
