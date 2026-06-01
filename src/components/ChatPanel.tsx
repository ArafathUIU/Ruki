import React, { useState, useRef, useEffect } from 'react'
import PdfUploader from './PdfUploader'
import StudyDashboard from './StudyDashboard'
import FlashcardDeck from './FlashcardDeck'
import QuizModal from './QuizModal'

type Tab = 'chat' | 'dashboard' | 'flashcards'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isAdaptive?: boolean
}

export default function ChatPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm Ruki, your AI study companion. Upload a PDF or ask me anything about your studies!",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [currentDocId, setCurrentDocId] = useState<number | undefined>(undefined)
  const [showQuiz, setShowQuiz] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Listen for messages from overlay/region selector
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onNewMessage((content: string) => {
        handleSend(content)
      })
      return () => {
        window.electronAPI.removeAllListeners('new-message')
      }
    }
  }, [])

  const handleSend = async (content: string = input, isAdaptive = false) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      isAdaptive,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          session_id: sessionId,
          document_id: currentDocId,
          is_adaptive: isAdaptive,
        }),
      })

      const data = await response.json()
      if (data.session_id) setSessionId(data.session_id)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I'm thinking...",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting to my brain right now. Please make sure the backend is running!",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdaptiveExplain = (content: string) => {
    handleSend(`I don't understand this: "${content.substring(0, 200)}..." Please explain it in a simpler way with analogies.`, true)
  }

  const handleSummarize = async () => {
    if (!currentDocId) {
      handleSend("Please summarize the current document.")
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: currentDocId }),
      })
      const data = await response.json()
      const summaryMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Summary:**\n${data.summary}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, summaryMsg])
    } catch (error) {
      console.error('Summarize failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateFlashcards = async () => {
    if (!currentDocId) return
    setIsLoading(true)
    try {
      await fetch('http://localhost:8000/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: currentDocId, num_cards: 5 }),
      })
      const successMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Flashcards generated! Switch to the Flashcards tab to study them.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, successMsg])
    } catch (error) {
      console.error('Flashcards generation failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeChat()
    }
  }

  return (
    <div className="chat-panel w-full h-full flex flex-col text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-ruki-teal flex items-center justify-center text-sm font-bold">
            R
          </div>
          <div>
            <h2 className="text-sm font-bold">Ruki</h2>
            <span className="text-[10px] text-green-400">Online</span>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-white/60 hover:text-white transition-colors text-lg no-drag"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-1 mb-2">
        {(['chat', 'dashboard', 'flashcards'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-ruki-teal/20 text-ruki-teal'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full px-4 pb-4">
            {/* PDF Uploader */}
            <PdfUploader
              onUploadSuccess={(doc) => {
                setCurrentDocId(doc.document_id)
                const msg: Message = {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `Great! I've loaded "${doc.title}". You can now ask me questions about it, generate flashcards, or take a quiz.`,
                  timestamp: new Date(),
                }
                setMessages((prev) => [...prev, msg])
              }}
            />

            {/* Quick Actions */}
            {currentDocId && (
              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  onClick={handleSummarize}
                  disabled={isLoading}
                  className="bg-white/10 hover:bg-white/20 text-white/80 rounded-lg px-3 py-1 text-xs transition-colors"
                >
                  Summarize
                </button>
                <button
                  onClick={handleGenerateFlashcards}
                  disabled={isLoading}
                  className="bg-white/10 hover:bg-white/20 text-white/80 rounded-lg px-3 py-1 text-xs transition-colors"
                >
                  Flashcards
                </button>
                <button
                  onClick={() => setShowQuiz(true)}
                  className="bg-white/10 hover:bg-white/20 text-white/80 rounded-lg px-3 py-1 text-xs transition-colors"
                >
                  Quiz
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[90%]">
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-ruki-teal text-white rounded-br-sm'
                          : 'bg-white/10 text-white/90 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'assistant' && (
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => handleAdaptiveExplain(msg.content)}
                          className="text-[10px] text-white/40 hover:text-ruki-teal transition-colors"
                        >
                          I don't understand
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-white/60">
                    <span className="animate-pulse">Ruki is typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 mt-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend()
                }}
                placeholder="Ask Ruki anything..."
                className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-ruki-teal no-drag"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="bg-ruki-teal hover:bg-ruki-teal/80 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-bold transition-colors no-drag"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && <StudyDashboard />}
        {activeTab === 'flashcards' && <FlashcardDeck />}
      </div>

      {/* Quiz Modal */}
      {showQuiz && (
        <QuizModal documentId={currentDocId} onClose={() => setShowQuiz(false)} />
      )}
    </div>
  )
}
