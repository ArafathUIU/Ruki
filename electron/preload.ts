import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getRukiBounds: () => Promise<{ x: number; y: number; width: number; height: number } | null>
  setRukiPosition: (x: number, y: number) => Promise<void>
  openChat: () => Promise<void>
  closeChat: () => Promise<void>
  startRegionSelect: () => Promise<void>
  closeOverlay: () => Promise<void>
  captureRegion: (region: { x: number; y: number; width: number; height: number }) => Promise<string | null>
  sendToChat: (message: string) => void
  onStartPomodoro: (callback: () => void) => void
  onStartRegionSelect: (callback: () => void) => void
  onNewMessage: (callback: (message: string) => void) => void
  removeAllListeners: (channel: string) => void
}

const api: ElectronAPI = {
  getRukiBounds: () => ipcRenderer.invoke('get-ruki-bounds'),
  setRukiPosition: (x: number, y: number) => ipcRenderer.invoke('set-ruki-position', x, y),
  openChat: () => ipcRenderer.invoke('open-chat'),
  closeChat: () => ipcRenderer.invoke('close-chat'),
  startRegionSelect: () => ipcRenderer.invoke('start-region-select'),
  closeOverlay: () => ipcRenderer.invoke('close-overlay'),
  captureRegion: (region) => ipcRenderer.invoke('capture-region', region),
  sendToChat: (message: string) => ipcRenderer.send('send-to-chat', message),
  onStartPomodoro: (callback: () => void) => {
    ipcRenderer.on('start-pomodoro', callback)
  },
  onStartRegionSelect: (callback: () => void) => {
    ipcRenderer.on('start-region-select', callback)
  },
  onNewMessage: (callback: (message: string) => void) => {
    ipcRenderer.on('new-message', (_event, message) => callback(message))
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
