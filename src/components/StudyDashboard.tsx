import React, { useEffect, useState } from 'react'

interface StudyStats {
  total_focus_time_today: number
  total_sessions_completed: number
  average_quiz_score: number
}

interface WeakTopic {
  topic: string
  action: string
  priority: string
}

export default function StudyDashboard() {
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [recommendations, setRecommendations] = useState<WeakTopic[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/stats')
      const data = await response.json()
      setStats(data.stats)
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-white/60">
        Loading stats...
      </div>
    )
  }

  return (
    <div className="w-full h-full p-4 overflow-y-auto">
      <h2 className="text-lg font-bold text-white mb-4">Study Dashboard</h2>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-ruki-teal">{formatTime(stats.total_focus_time_today)}</div>
            <div className="text-[10px] text-white/60">Focus Today</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-ruki-gold">{stats.total_sessions_completed}</div>
            <div className="text-[10px] text-white/60">Sessions</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.average_quiz_score}%</div>
            <div className="text-[10px] text-white/60">Avg Score</div>
          </div>
        </div>
      )}

      {/* Weak Topics / Recommendations */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white mb-2">Focus Areas</h3>
        {recommendations.length === 0 ? (
          <div className="text-white/40 text-sm italic">No weak topics yet. Keep studying!</div>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`bg-white/5 rounded-lg p-3 border-l-2 ${
                  rec.priority === 'high' ? 'border-red-400' : 'border-yellow-400'
                }`}
              >
                <div className="text-sm font-medium text-white">{rec.topic}</div>
                <div className="text-xs text-white/60 mt-1">{rec.action}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Study Tips */}
      <div className="bg-ruki-teal/10 rounded-xl p-4">
        <h3 className="text-sm font-bold text-ruki-teal mb-2">Ruki's Tip</h3>
        <p className="text-xs text-white/70 leading-relaxed">
          Break your study sessions into 25-minute focused blocks (Pomodoro) with 5-minute breaks.
          This helps maintain high concentration and prevents burnout. Try starting a focus session now!
        </p>
      </div>
    </div>
  )
}
