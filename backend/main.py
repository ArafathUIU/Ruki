from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid

from backend.config import UPLOADS_DIR
from backend.database import init_database, add_conversation, get_conversations, get_documents, get_document_chunks, add_flashcard, get_flashcards
from backend.services.ai_service import chat_with_ai, generate_summary, generate_flashcards, generate_quiz
from backend.services.pdf_service import process_pdf, get_document_context
from backend.services.ocr_service import ocr_from_base64
from backend.services.study_service import track_study_session, get_learning_recommendations, record_pomodoro_session, review_flashcard

app = FastAPI(
    title="Ruki Backend",
    description="AI Study Companion API",
    version="1.0.0",
)

# CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_database()

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ruki-backend"}

# Chat
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    document_id: Optional[int] = None
    is_adaptive: bool = False

class ChatResponse(BaseModel):
    response: str
    session_id: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())

    # Get document context if specified or if we have documents
    context = ""
    if request.document_id:
        context = get_document_context(request.message, request.document_id)
    else:
        # Try to find relevant context from all documents
        context = get_document_context(request.message)

    # Save user message
    add_conversation(role="user", content=request.message, session_id=session_id, is_adaptive=request.is_adaptive)

    # Get AI response
    ai_response = chat_with_ai(
        message=request.message,
        session_id=session_id,
        document_context=context if context else None,
        is_adaptive=request.is_adaptive,
    )

    # Save AI response
    add_conversation(role="assistant", content=ai_response, session_id=session_id, is_adaptive=request.is_adaptive)

    return ChatResponse(response=ai_response, session_id=session_id)

# Get chat history
@app.get("/api/chat/history")
async def chat_history(session_id: Optional[str] = None, limit: int = 50):
    messages = get_conversations(session_id=session_id, limit=limit)
    return {"messages": messages}

# PDF Upload
@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOADS_DIR, f"{file_id}_{file.filename}")

    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Process PDF
    result = process_pdf(file_path, file.filename)

    if not result["success"]:
        # Clean up file if processing failed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to process PDF"))

    return {
        "success": True,
        "document_id": result["document_id"],
        "title": result["title"],
        "total_pages": result["total_pages"],
        "chunk_count": result["chunk_count"],
    }

# Get all documents
@app.get("/api/documents")
async def list_documents():
    documents = get_documents()
    return {"documents": documents}

# Get document chunks
@app.get("/api/documents/{doc_id}/chunks")
async def document_chunks(doc_id: int):
    chunks = get_document_chunks(doc_id)
    return {"chunks": chunks}

# Generate summary
class SummaryRequest(BaseModel):
    document_id: int

@app.post("/api/summarize")
async def summarize_document(request: SummaryRequest):
    chunks = get_document_chunks(request.document_id)
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found or has no content")

    text = "\n\n".join(chunks)
    summary = generate_summary(text)

    return {"summary": summary}

# Generate flashcards
class FlashcardsRequest(BaseModel):
    document_id: int
    num_cards: int = 5

@app.post("/api/flashcards/generate")
async def generate_document_flashcards(request: FlashcardsRequest):
    chunks = get_document_chunks(request.document_id)
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found or has no content")

    text = "\n\n".join(chunks)
    flashcards = generate_flashcards(text, request.num_cards)

    # Store in database
    stored_cards = []
    for card in flashcards:
        card_id = add_flashcard(
            document_id=request.document_id,
            question=card["question"],
            answer=card["answer"],
        )
        stored_cards.append({"id": card_id, **card})

    return {"flashcards": stored_cards}

# Get flashcards
@app.get("/api/flashcards")
async def list_flashcards(document_id: Optional[int] = None):
    flashcards = get_flashcards(document_id)
    return {"flashcards": flashcards}

# Review flashcard
@app.post("/api/flashcards/{card_id}/review")
async def review_flashcard_endpoint(card_id: int, correct: bool):
    review_flashcard(card_id, correct)
    return {"success": True}

# Generate quiz
class QuizRequest(BaseModel):
    document_id: int
    num_questions: int = 5

@app.post("/api/quiz/generate")
async def generate_document_quiz(request: QuizRequest):
    chunks = get_document_chunks(request.document_id)
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found or has no content")

    text = "\n\n".join(chunks)
    quiz = generate_quiz(text, request.num_questions)

    return {"quiz": quiz}

# OCR
class OCRRequest(BaseModel):
    image: str  # base64 encoded image

@app.post("/api/ocr")
async def perform_ocr(request: OCRRequest):
    result = ocr_from_base64(request.image)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "OCR failed"))
    return {"text": result["text"], "blocks": result["blocks"]}

# Study progress
class StudyProgressRequest(BaseModel):
    topic: str
    duration_seconds: int
    quiz_score: Optional[float] = None

@app.post("/api/progress/track")
async def track_progress(request: StudyProgressRequest):
    track_study_session(request.topic, request.duration_seconds, request.quiz_score)
    return {"success": True}

# Get recommendations
@app.get("/api/recommendations")
async def get_recommendations():
    recommendations = get_learning_recommendations()
    return recommendations

# Pomodoro tracking
class PomodoroRequest(BaseModel):
    duration: int  # seconds
    completed: bool = True

@app.post("/api/pomodoro")
async def track_pomodoro(request: PomodoroRequest):
    session_id = record_pomodoro_session(request.duration, request.completed)
    return {"session_id": session_id}

# Stats
@app.get("/api/stats")
async def get_stats():
    stats = get_learning_recommendations()
    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
