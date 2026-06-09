import React, { useEffect, useState, useCallback } from 'react'

interface StudyStats {
  total_focus_time_today: number
  total_sessions_completed: number
  average_quiz_score: number
  total_weak_topics: number
}

interface WeakTopic {
  title: string
  score: number
}

interface Recommendation {
  topic: string
  action: string
  priority: string
}

export default function StudyDashboard() {
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/recommendations')
      const data = await response.json()
      setStats(data.stats)
      setRecommendations(data.recommendations || [])
      setLastRefresh(Date.now())
    } catch (error) {
      // Backend not running — show empty state
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch + auto-refresh every 30 seconds
  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${mins}m`
    if (seconds === 0) return '--'
    return `${mins}m`
  }

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${seconds}s ago`
    return `${Math.floor(seconds / 60)}m ago`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-ruki-gold'
    return 'text-red-400'
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-ruki-teal border-t-transparent rounded-full" />
        <div className="text-white/40 text-xs">Loading stats...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Dashboard</h2>
        <button
          onClick={fetchStats}
          className="text-white/40 hover:text-white/80 text-xs transition-colors"
        >
          ↻ {formatRelativeTime(lastRefresh)}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/8 rounded-xl p-3 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Focus Today</div>
          <div className="text-2xl font-bold text-ruki-teal">
            {stats ? formatTime(stats.total_focus_time_today) : '--'}
          </div>
        </div>
        <div className="bg-white/8 rounded-xl p-3 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Sessions</div>
          <div className="text-2xl font-bold text-ruki-gold">
            {stats ? stats.total_sessions_completed : 0}
          </div>
        </div>
        <div className="bg-white/8 rounded-xl p-3 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Avg Quiz</div>
          <div className={`text-2xl font-bold ${
            stats ? getScoreColor(stats.average_quiz_score) : 'text-white/30'
          }`}>
            {stats ? `${Math.round(stats.average_quiz_score)}%` : '--'}
          </div>
        </div>
        <div className="bg-white/8 rounded-xl p-3 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Weak Topics</div>
          <div className="text-2xl font-bold text-red-400">
            {stats ? stats.total_weak_topics : 0}
          </div>
        </div>
      </div>

      {/* Weak Topics */}
      <div className="mb-5">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          Weak Topics
          <span className="text-[10px] text-white/30 font-normal">auto-refreshes</span>
        </h3>
        {recommendations.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <div className="text-3xl mb-1">🌟</div>
            <div className="text-white/40 text-sm">All clear! No weak topics.</div>
            <div className="text-white/20 text-xs mt-1">
              Keep studying and taking quizzes to track progress.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`bg-white/5 rounded-lg p-3 border-l-2 ${
                  rec.priority === 'high' ? 'border-red-400' : 'border-yellow-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    rec.priority === 'high'
                      ? 'bg-red-400/20 text-red-300'
                      : 'bg-yellow-400/20 text-yellow-300'
                  }`}>
                    {rec.priority.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-white">{rec.topic}</span>
                </div>
                <div className="text-xs text-white/60 mt-1.5">{rec.action}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Bars - topics with scores */}
      {stats && (
        <div className="mb-5">
          <h3 className="text-sm font-bold text-white mb-2">Topic Mastery</h3>
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            {[
              { label: 'Focus Sessions', value: Math.min(stats.total_sessions_completed * 10, 100), color: 'ruki-teal' },
              { label: 'Quiz Performance', value: Math.round(stats.average_quiz_score), color: 'green' },
              { label: 'Topics Covered', value: Math.max(100 - stats.total_weak_topics * 20, 0), color: 'ruki-gold' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">{item.label}</span>
                  <span className={`text-${item.color === 'green' ? 'green' : item.color === 'ruki-teal' ? 'ruki-teal' : 'ruki-gold'}-400`}>
                    {item.value}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.color === 'green' ? 'bg-green-400' : item.color === 'ruki-teal' ? 'bg-ruki-teal' : 'bg-ruki-gold'
                    }`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Tip */}
      <div className="bg-ruki-teal/10 rounded-xl p-4 border border-ruki-teal/10">
        <h3 className="text-sm font-bold text-ruki-teal mb-1">
          {stats && stats.total_focus_time_today > 1800 ? 'Great work!' : 'Ruki\'s Tip'}
        </h3>
        <p className="text-xs text-white/60 leading-relaxed">
          {stats && stats.total_focus_time_today > 3600
            ? "Over an hour of focus today! You're building strong study habits. Remember to take breaks."
            : stats && stats.total_focus_time_today > 1800
            ? "30+ minutes of focus — solid progress! Try a quiz to test your knowledge."
            : stats && stats.average_quiz_score > 0 && stats.average_quiz_score < 60
            ? "Quiz scores could improve. Use the flashcard tab and review weak topics."
            : "Break your study into 25-min focus blocks. Upload a PDF and generate flashcards!"}
        </p>
      </div>
    </div>
  )
}
