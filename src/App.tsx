import React, { useEffect, useState } from 'react'
import RukiCharacter from './components/RukiCharacter'
import ChatPanel from './components/ChatPanel'
import RegionSelector from './components/RegionSelector'

function App() {
  const [view, setView] = useState<'ruki' | 'chat' | 'overlay'>('ruki')

  useEffect(() => {
    // Detect which window we're in based on hash or query
    const hash = window.location.hash
    if (hash.includes('chat')) {
      setView('chat')
    } else if (hash.includes('overlay')) {
      setView('overlay')
    } else {
      setView('ruki')
    }
  }, [])

  return (
    <div className="w-full h-screen overflow-hidden">
      {view === 'ruki' && <RukiCharacter />}
      {view === 'chat' && <ChatPanel />}
      {view === 'overlay' && <RegionSelector />}
    </div>
  )
}

export default App
