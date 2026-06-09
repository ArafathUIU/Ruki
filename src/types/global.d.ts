interface ElectronAPI {
  getRukiBounds: () => Promise<{ x: number; y: number; width: number; height: number } | null>
  setRukiPosition: (x: number, y: number) => Promise<void>
  openChat: () => Promise<void>
  closeChat: () => Promise<void>
  startRegionSelect: () => Promise<void>
  closeOverlay: () => Promise<void>
  captureRegion: (region: { x: number; y: number; width: number; height: number }) => Promise<string | null>
  sendToChat: (message: string) => void
  onStartPomodoro: (callback: () => void) => void
  onStartFollow: (callback: () => void) => void
  onStartRegionSelect: (callback: () => void) => void
  onNewMessage: (callback: (message: string) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
