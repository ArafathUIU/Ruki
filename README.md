# Ruki – Your AI Study Companion

Ruki is an AI-powered desktop study companion that lives on your Windows desktop as an animated character. It helps you learn by understanding your PDFs, lecture slides, and notes, and provides personalized explanations, flashcards, quizzes, and focus sessions.

## Features

- **Desktop Companion**: Ruki floats on your desktop with idle, walk, run, wave, dance, follow-cursor, sleepy, and celebration animations.
- **Pomodoro Focus Timer**: Activate focus mode and Ruki displays an encouraging chat bubble with a live countdown.
- **AI Tutor**: Ask questions about your study materials. Ruki uses your uploaded documents to provide context-aware answers.
- **PDF Understanding**: Upload PDFs, lecture slides, and notes. Ruki extracts text, chunks it, and uses RAG for accurate responses.
- **Screen Region Selection**: Press `Ctrl + Shift + R`, draw a box over confusing text/diagrams, and Ruki explains them using OCR.
- **Adaptive Teaching**: Struggling with a concept? Click "I don't understand" and Ruki will simplify with analogies and step-by-step breakdowns.
- **Study Tools**: Auto-generated summaries, flashcards, quizzes, and revision schedules.
- **Study Analytics**: Tracks progress, identifies weak topics, and recommends focused revision.

## Tech Stack

- **Frontend**: Electron + React + TypeScript + Tailwind CSS
- **Backend**: Python (FastAPI)
- **Database**: SQLite
- **AI**: OpenCode Go API
- **OCR**: EasyOCR
- **PDF Parsing**: pdfplumber

## Prerequisites

- **Node.js** (v18 or later)
- **Python** (v3.9 or later)
- **Windows** (target OS)
- **OpenCode Go API Key**

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ArafathUIU/Ruki.git
cd Ruki
```

### 2. Configure Environment Variables

Copy the example environment file and add your OpenCode Go API key:

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
OPENCODE_API_KEY=your_api_key_here
OPENCODE_API_URL=https://api.opencode.ai/v1/chat/completions
```

### 3. Install Frontend Dependencies

```bash
npm install
```

### 4. Install Backend Dependencies

It is recommended to use a Python virtual environment:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 5. Replace the Placeholder Image

Replace `assets/ruki.png` with your actual Ruki character image. The image should have a transparent background for the best look.

### 6. Run the Application

**Start the backend:**

```bash
.\start-backend.bat
```

**In a new terminal, start the frontend:**

```bash
npm run electron:dev
```

Or use the combined start script (if available):

```bash
.\start-app.bat
```

## Usage

### Interacting with Ruki

- **Double-click** Ruki to open the chat panel.
- **Right-click** Ruki to cycle through animations (idle, walk, wave, dance, etc.).
- **Drag** Ruki to move her around the screen.
- After 1 minute of inactivity, Ruki becomes sleepy.

### Chat & Study Tools

- **Chat Tab**: Ask questions, upload PDFs, get summaries, and take quizzes.
- **Dashboard Tab**: View study stats, focus time, and weak topics.
- **Flashcards Tab**: Study auto-generated flashcards with flip animations.

### Focus Sessions

- Start a Pomodoro session from the chat panel or the system tray menu.
- Ruki will display a chat bubble with the countdown and encouragement.
- After 25 minutes, take a 5-minute break.

### Screen Region Selection (Explain This)

- Press `Ctrl + Shift + R` anywhere on your screen.
- Draw a box around confusing text or a diagram.
- Ruki will extract the text using OCR and explain it in the chat.

## Project Structure

```
Ruki/
├── assets/                 # Static assets (Ruki image, icons)
├── backend/                # Python FastAPI backend
│   ├── services/           # AI, PDF, OCR, Study logic
│   ├── main.py             # FastAPI entry point
│   ├── database.py         # SQLite schemas & queries
│   ├── config.py           # Configuration & prompts
│   └── requirements.txt    # Python dependencies
├── electron/               # Electron main process
│   ├── main.ts             # Main window, tray, hotkeys
│   └── preload.ts          # Secure IPC bridge
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── App.tsx             # Main app component
├── package.json            # Node.js dependencies & scripts
├── tailwind.config.js       # Tailwind CSS configuration
└── vite.config.ts          # Vite build configuration
```

## Building for Production

```bash
npm run dist
```

This will create a Windows installer in the `release/` directory.

## Customization

### Changing Pomodoro Durations

Edit `src/components/RukiCharacter.tsx`:

```typescript
const { isActive, timeRemaining, startTimer, stopTimer, formatTime } = usePomodoro({
  workDuration: 25 * 60,  // Change this (in seconds)
  breakDuration: 5 * 60,   // Change this (in seconds)
})
```

### Adding More Animations

Add new CSS keyframes in `src/index.css` and map them in `src/components/RukiCharacter.tsx`.

## Troubleshooting

### Ruki doesn't appear on screen
- Make sure both the backend and frontend are running.
- Check the Electron console for errors (`Ctrl + Shift + I` in the Ruki window).

### Backend connection errors
- Ensure the backend is running on port 8000.
- Check that your `.env` file has the correct `OPENCODE_API_KEY`.

### PDF upload fails
- Make sure `pdfplumber` is installed: `pip install pdfplumber`
- Only PDF files are supported.

### OCR doesn't work
- The first OCR run may take a while as EasyOCR downloads models.
- Ensure `easyocr` is installed: `pip install easyocr`

## Contributing

This project is under active development. All commits are made with descriptive messages following conventional commits style.

## License

MIT
