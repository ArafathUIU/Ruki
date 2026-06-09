import React, { useState, useRef, useCallback } from 'react'

interface Selection {
  x: number
  y: number
  width: number
  height: number
}

export default function RegionSelector() {
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const startPos = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsSelecting(true)
    startPos.current = { x: e.screenX, y: e.screenY }
    setSelection({ x: e.screenX, y: e.screenY, width: 0, height: 0 })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return
    const x = Math.min(startPos.current.x, e.screenX)
    const y = Math.min(startPos.current.y, e.screenY)
    const width = Math.abs(e.screenX - startPos.current.x)
    const height = Math.abs(e.screenY - startPos.current.y)
    setSelection({ x, y, width, height })
  }, [isSelecting])

  const handleMouseUp = useCallback(async () => {
    if (!isSelecting || !selection || selection.width < 10 || selection.height < 10) {
      setIsSelecting(false)
      setSelection(null)
      return
    }

    setIsSelecting(false)

    // Send region coordinates to backend (backend uses PIL.ImageGrab)
    try {
      const response = await fetch('http://localhost:8000/api/ocr/region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: Math.round(selection.x),
          y: Math.round(selection.y),
          width: Math.round(selection.width),
          height: Math.round(selection.height),
        }),
      })

      const data = await response.json()

      if (data.text) {
        // Send extracted text to chat
        if (window.electronAPI) {
          window.electronAPI.sendToChat(`[Screen Selection] I found this text: "${data.text.substring(0, 300)}..." Can you explain it?`)
        }
      } else {
        // No text found — send the region to AI as an image description request anyway
        if (window.electronAPI) {
          window.electronAPI.sendToChat(`I selected a region on screen. Can you explain what you see there?`)
        }
      }
    } catch (error) {
      console.error('OCR failed:', error)
      if (window.electronAPI) {
        window.electronAPI.sendToChat(`I tried to read some text from the screen but the OCR service didn't respond.`)
      }
    } finally {
      if (window.electronAPI) window.electronAPI.closeOverlay()
    }
  }, [isSelecting, selection])

  return (
    <div
      ref={containerRef}
      className="region-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm pointer-events-none">
        Draw a box around the text or diagram you want Ruki to explain
      </div>

      {selection && (
        <div
          className="selection-box"
          style={{
            left: selection.x,
            top: selection.y,
            width: selection.width,
            height: selection.height,
          }}
        />
      )}
    </div>
  )
}
