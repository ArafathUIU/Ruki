import React, { useState, useRef } from 'react'

interface PdfUploaderProps {
  onUploadSuccess?: (doc: { document_id: number; title: string }) => void
}

export default function PdfUploader({ onUploadSuccess }: PdfUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      await uploadFile(files[0])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await uploadFile(files[0])
    }
  }

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setUploadStatus('Please upload a PDF file')
      return
    }

    setIsUploading(true)
    setUploadStatus('Uploading...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setUploadStatus(`Uploaded: ${data.title} (${data.total_pages} pages)`)
        onUploadSuccess?.({ document_id: data.document_id, title: data.title })
      } else {
        setUploadStatus('Upload failed')
      }
    } catch (error) {
      setUploadStatus('Upload failed - backend not running?')
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadStatus(null), 5000)
    }
  }

  return (
    <div className="mb-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-ruki-teal bg-ruki-teal/10'
            : 'border-white/20 hover:border-white/40 bg-white/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-white/60 text-sm">
          {isUploading ? (
            <span className="animate-pulse">Uploading PDF...</span>
          ) : (
            <>
              <span className="font-medium">Drop PDF here</span> or click to browse
            </>
          )}
        </div>
      </div>
      {uploadStatus && (
        <div className="mt-2 text-xs text-center text-ruki-teal">{uploadStatus}</div>
      )}
    </div>
  )
}
