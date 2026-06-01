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
    startPos.current = { x: e.clientX, y: e.clientY }
    setSelection({
      x: e.clientX,
      y: e.clientY,
      width: 0,
      height: 0,
    })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return
    const x = Math.min(startPos.current.x, e.clientX)
    const y = Math.min(startPos.current.y, e.clientY)
    const width = Math.abs(e.clientX - startPos.current.x)
    const height = Math.abs(e.clientY - startPos.current.y)
    setSelection({ x, y, width, height })
  }, [isSelecting])

  const handleMouseUp = useCallback(async () => {
    if (!isSelecting || !selection || selection.width < 10 || selection.height < 10) {
      setIsSelecting(false)
      setSelection(null)
      return
    }

    setIsSelecting(false)

    // Capture the selected region
    if (window.electronAPI) {
      try {
        const imageBase64 = await window.electronAPI.captureRegion(selection)
        if (imageBase64) {
          // Send to backend for OCR
          const response = await fetch('http://localhost:8000/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageBase64 }),
          })

          const data = await response.json()
          const extractedText = data.text || ''

          // Send extracted text to chat
          window.electronAPI.sendToChat(
            `[Screen Selection] I found this text: "${extractedText.substring(0, 200)}..." Can you explain it?`
          )
        }
      } catch (error) {
        console.error('OCR failed:', error)
      } finally {
        window.electronAPI.closeOverlay()
      }
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
      {/* Instructions */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm pointer-events-none">
        Draw a box around the text or diagram you want Ruki to explain
      </div>

      {/* Selection box */}
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
