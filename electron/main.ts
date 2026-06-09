import { app, BrowserWindow, screen, Tray, Menu, ipcMain, globalShortcut } from 'electron'
import * as path from 'path'

let rukiWindow: BrowserWindow | null = null
let chatWindow: BrowserWindow | null = null
let tray: Tray | null = null
let overlayWindow: BrowserWindow | null = null

const RUKI_WIDTH = 220
const RUKI_HEIGHT = 300

function createRukiWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  rukiWindow = new BrowserWindow({
    width: RUKI_WIDTH,
    height: RUKI_HEIGHT,
    x: screenWidth - RUKI_WIDTH - 20,
    y: screenHeight - RUKI_HEIGHT - 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Remove the menu bar
  rukiWindow.setMenuBarVisibility(false)

  // Load the React app
  if (process.env.VITE_DEV_SERVER_URL) {
    rukiWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    rukiWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Make click-through when idle, but allow dragging
  rukiWindow.setIgnoreMouseEvents(false)

  // Constrain Ruki within screen bounds when moved
  rukiWindow.on('move', () => {
    if (!rukiWindow) return
    const bounds = rukiWindow.getBounds()
    const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
    const workArea = display.workArea

    let newX = bounds.x
    let newY = bounds.y

    if (newX < workArea.x) newX = workArea.x
    if (newY < workArea.y) newY = workArea.y
    if (newX + bounds.width > workArea.x + workArea.width) {
      newX = workArea.x + workArea.width - bounds.width
    }
    if (newY + bounds.height > workArea.y + workArea.height) {
      newY = workArea.y + workArea.height - bounds.height
    }

    if (newX !== bounds.x || newY !== bounds.y) {
      rukiWindow.setPosition(newX, newY)
    }
  })

  rukiWindow.on('closed', () => {
    rukiWindow = null
  })
}

function createChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.show()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  chatWindow = new BrowserWindow({
    width: 420,
    height: 640,
    x: screenWidth - 460,
    y: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  chatWindow.setMenuBarVisibility(false)

  if (process.env.VITE_DEV_SERVER_URL) {
    chatWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/chat')
  } else {
    chatWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'chat' })
  }

  chatWindow.on('closed', () => {
    chatWindow = null
  })
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.show()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    fullscreen: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  overlayWindow.setMenuBarVisibility(false)
  overlayWindow.setIgnoreMouseEvents(false)

  if (process.env.VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '#/overlay')
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'overlay' })
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/icon.png')
  // Use a default icon if custom one doesn't exist
  tray = new Tray(iconPath)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Chat',
      click: () => {
        createChatWindow()
        chatWindow?.show()
      },
    },
    {
      label: 'Start Focus Session',
      click: () => {
        rukiWindow?.webContents.send('start-pomodoro')
      },
    },
    {
      label: 'Follow Cursor',
      click: () => {
        rukiWindow?.webContents.send('start-follow')
      },
    },
    { type: 'separator' },
    {
      label: 'Explain Screen (Ctrl+Shift+R)',
      click: () => {
        createOverlayWindow()
        overlayWindow?.show()
        overlayWindow?.webContents.send('start-region-select')
      },
    },
    { type: 'separator' },
    {
      label: 'Show Ruki',
      click: () => {
        rukiWindow?.show()
      },
    },
    {
      label: 'Hide Ruki',
      click: () => {
        rukiWindow?.hide()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip('Ruki - Your AI Study Companion')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (rukiWindow?.isVisible()) {
      rukiWindow.hide()
    } else {
      rukiWindow?.show()
    }
  })
}

app.whenReady().then(() => {
  createRukiWindow()
  createTray()

  // Global shortcut for screen region selection
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    createOverlayWindow()
    overlayWindow?.show()
    overlayWindow?.webContents.send('start-region-select')
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createRukiWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep app running in background on Windows via tray
  }
})

app.on('before-quit', () => {
  globalShortcut.unregisterAll()
  tray?.destroy()
})

// IPC handlers
ipcMain.handle('get-ruki-bounds', () => {
  if (rukiWindow) {
    return rukiWindow.getBounds()
  }
  return null
})

ipcMain.handle('set-ruki-position', (_event, x: number, y: number) => {
  if (rukiWindow && Number.isFinite(x) && Number.isFinite(y)) {
    rukiWindow.setPosition(Math.round(x), Math.round(y))
  }
})

ipcMain.handle('open-chat', () => {
  createChatWindow()
  chatWindow?.show()
})

ipcMain.handle('close-chat', () => {
  chatWindow?.hide()
})

ipcMain.handle('start-region-select', () => {
  createOverlayWindow()
  overlayWindow?.show()
  overlayWindow?.webContents.send('start-region-select')
})

ipcMain.handle('close-overlay', () => {
  overlayWindow?.hide()
})

ipcMain.handle('capture-region', async (_event, region: { x: number; y: number; width: number; height: number }) => {
  if (overlayWindow) {
    const image = await overlayWindow.webContents.capturePage({
      x: Math.round(region.x),
      y: Math.round(region.y),
      width: Math.round(region.width),
      height: Math.round(region.height),
    })
    return image.toPNG().toString('base64')
  }
  return null
})

ipcMain.on('send-to-chat', (_event, message: string) => {
  chatWindow?.webContents.send('new-message', message)
})
