# Ruki – Your AI Study Companion

## Project Overview
Ruki is an AI-powered desktop study companion designed to make learning more interactive, personalized, and engaging. Unlike traditional study applications, Ruki lives directly on the user's desktop as a small animated companion, always available to assist throughout the learning journey. It can walk, run, wave, dance, follow the cursor, react to user activity, and even play mini-games, creating a friendly and motivating study environment.

## Key Features
- **Desktop Companion**: Animated character floating on the desktop with idle, walk, run, wave, dance, follow-cursor, and sleepy states.
- **Pomodoro Chat Bubble**: When the focus timer is active, Ruki displays an animated speech bubble with encouraging messages and countdown.
- **AI Tutor**: Context-aware answers based on user's own study resources (PDFs, slides, notes) rather than generic internet knowledge.
- **PDF & Document Understanding**: Upload PDFs, lecture slides, and notes. Ruki extracts text, chunks it, and uses RAG for accurate answers.
- **Screen Region Selection**: Select any confusing text or diagram on screen, and Ruki explains it using OCR and the AI.
- **Adaptive Teaching**: Automatically adjusts explanations using simpler language, analogies, step-by-step breakdowns, or visual approaches.
- **Study Tools**: Auto-generated summaries, flashcards, quizzes, and revision materials.
- **Study Analytics**: Tracks progress, identifies weak topics, recommends revision schedules.
- **Gamification & Focus**: Pomodoro timer, achievements, streaks, and encouragement during difficult sessions.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Desktop Shell | Electron + React + TypeScript |
| Styling | Tailwind CSS |
| Backend | Python (FastAPI) |
| Database | SQLite |
| AI | OpenCode Go API |
| Animations | CSS Keyframes + JavaScript transforms |
| OCR | easyocr |
| PDF Parsing | pdfplumber |

## Architecture
```
┌─────────────────────────────────────────┐
│           Electron (Main Process)       │
│  ┌──────────────────────────────────┐   │
│  │   Ruki Window (Transparent,      │   │
│  │   Always-On-Top, Frameless)      │   │
│  │                                  │   │
│  │  ┌─────────────┐  ┌───────────┐ │   │
│  │  │ Ruki PNG    │  │  Chat     │ │   │
│  │  │ (Animated)  │  │  Bubble   │ │   │
│  │  │             │  │ (Pomodoro)│ │   │
│  │  └─────────────┘  └───────────┘ │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  Chat Panel / Study Dashboard    │   │
│  │  (React - slide-out or modal)    │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  System Tray & Global Hotkeys    │   │
│  │  (Overlay for Region Select)     │   │
│  └──────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │ HTTP (localhost)
┌──────────────┴──────────────────────────┐
│         Python FastAPI Backend          │
│  ┌────────┐ ┌────────┐ ┌────────────┐  │
│  │ AI     │ │ PDF    │ │ OCR        │  │
│  │Service │ │Service │ │ Service    │  │
│  │(OpenCode│ │(Chunk) │ │(Screenshot)│  │
│  │ Go)    │ │(RAG)   │ │            │  │
│  └────┬───┘ └────┬───┘ └─────┬──────┘  │
│       └───────────┴───────────┘         │
│              SQLite Database            │
│  (Chat History, Docs, Progress, Schedule)│
└─────────────────────────────────────────┘
```

## Project Structure
```
Ruki/
├── assets/
│   └── ruki.png
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── requirements.txt
│   └── services/
│       ├── ai_service.py
│       ├── pdf_service.py
│       ├── ocr_service.py
│       └── study_service.py
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── overlay.ts
│   └── tray.ts
├── src/
│   ├── components/
│   │   ├── RukiCharacter.tsx
│   │   ├── PomodoroBubble.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── PdfUploader.tsx
│   │   ├── StudyDashboard.tsx
│   │   ├── FlashcardDeck.tsx
│   │   ├── QuizModal.tsx
│   │   └── RegionSelector.tsx
│   ├── hooks/
│   │   ├── useRukiState.ts
│   │   ├── usePomodoro.ts
│   │   ├── useElectron.ts
│   │   └── useStudyData.ts
│   ├── utils/
│   │   └── animations.ts
│   ├── App.tsx
│   └── index.css
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## Implementation Phases

### Phase 1: Desktop Companion & Animation Engine
- Initialize Electron app with a frameless, transparent, always-on-top window.
- Load `ruki.png` as the character sprite.
- **Ruki State Machine**:
  - `IDLE`: Gentle vertical bob & sway (breathing).
  - `WALK`: Horizontal translate + rhythmic bounce.
  - `RUN`: Faster translate + more aggressive bounce.
  - `WAVE`: Rotate Z + scale pulse.
  - `DANCE`: Energetic side-to-side + bounce.
  - `FOLLOW_CURSOR`: Smooth lerp towards mouse position.
  - `SLEEPY`: Opacity fade, head nod (rotate), "Zzz" particles.
- **Pomodoro Chat Bubble**: When focus timer state is `ACTIVE`, render a CSS-animated speech bubble above Ruki with encouraging text and countdown.
- Drag-to-move anywhere on screen.
- System tray integration (right-click menu: Open Chat, Start Focus, Exit).

### Phase 2: Python Backend & Database
- FastAPI server with CORS enabled for Electron.
- **SQLite Schema**:
  - `conversations`: Chat history (role, content, timestamp, document_id).
  - `documents`: Uploaded PDFs (title, path, extracted_text, chunks).
  - `study_progress`: Topics, time_spent, scores, weak_flags.
  - `flashcards`: Q/A pairs generated from docs.
  - `schedules`: Revision reminders, pomodoro logs.
- Basic health endpoint (`/health`).

### Phase 3: Chat & AI Tutor Integration
- React slide-out chat panel (triggered by clicking Ruki or a hotkey).
- **Message flow**:
  - User types question → Electron sends to FastAPI → `ai_service.py` constructs prompt → OpenCode Go API → Response saved to SQLite → Displayed in chat.
- **Adaptive Teaching**: If user clicks "I don't understand", the backend re-prompts the AI with instructions to simplify, use analogies, or break into steps.
- **Chat Bubble Animation**: Integrated into the Pomodoro module. When a focus session is started via the chat panel or tray, the bubble appears on Ruki with a countdown and motivational snippets.

### Phase 4: PDF Upload & RAG (Retrieval Augmented Generation)
- React drag-and-drop zone in the chat panel.
- Backend uses `pdfplumber` to extract text.
- Text is split into chunks and stored in `documents` table.
- When user asks a question, backend retrieves relevant chunks and injects them into the system prompt for context-aware answers.
- **"Explain This" (Screen Region Select)**:
  - Global hotkey (`Ctrl + Shift + R`) triggers a full-screen semi-transparent overlay.
  - User draws a rectangle.
  - Electron captures that region and sends it to FastAPI.
  - `ocr_service.py` (using `easyocr`) extracts text from the image.
  - Extracted text + user query sent to OpenCode Go API for explanation.

### Phase 5: Study Tools, Analytics & Gamification
- **Summaries**: One-click summary of uploaded PDF content.
- **Flashcards**: Auto-generated from PDF chunks. Interactive flip-card UI.
- **Quizzes**: MCQ or short-answer generated by AI based on weak topics.
- **Progress Dashboard**:
  - Charts (study time per day, topic mastery).
  - "Weak Topics" list with suggested revision.
- **Pomodoro / Focus Timer**:
  - Customizable work/break intervals.
  - Ruki reacts when timer completes (celebration animation).
  - **Chat Bubble active during focus**: Shows countdown and encouragement.
- **Achievements**: SQLite tracks streaks, scores; unlock badges (e.g., "First Focus Session", "Quiz Master").

### Phase 6: Polish & Packaging
- Smooth transitions between all Ruki states.
- Ensure Ruki stays within screen bounds.
- Final UI/UX pass on chat panel and dashboard.
- Build distributable for Windows (`.exe` installer via `electron-builder`).

## Pomodoro Bubble Text
The bubble will alternate between:
- A live countdown (e.g., "24:32 remaining")
- Random encouraging phrases (e.g., "Focus time! You got this!", "Stay sharp!", "Halfway there! Keep it up!")

## Notes
- Windows-only target.
- The Ruki character PNG will be animated via CSS transforms (translate, rotate, scale) rather than a sprite sheet.
- AI responses should prioritize user-uploaded documents over generic knowledge.
- Git commits will be made after each completed phase with descriptive messages.
