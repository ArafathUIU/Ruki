import sqlite3
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
import os
from .config import DATA_DIR

DB_PATH = os.path.join(DATA_DIR, "ruki.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    conn = get_connection()
    cursor = conn.cursor()

    # Conversations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            document_id INTEGER,
            session_id TEXT,
            is_adaptive INTEGER DEFAULT 0
        )
    """)

    # Documents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            file_path TEXT,
            extracted_text TEXT,
            chunks TEXT,  -- JSON array of text chunks
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            total_pages INTEGER
        )
    """)

    # Study progress table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS study_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            time_spent INTEGER DEFAULT 0,  -- in seconds
            quiz_score REAL,
            weak_flag INTEGER DEFAULT 0,
            last_studied DATETIME DEFAULT CURRENT_TIMESTAMP,
            streak INTEGER DEFAULT 0
        )
    """)

    # Flashcards table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS flashcards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            difficulty TEXT DEFAULT 'medium',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_reviewed DATETIME,
            times_correct INTEGER DEFAULT 0,
            times_incorrect INTEGER DEFAULT 0
        )
    """)

    # Schedules / Pomodoro sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_type TEXT NOT NULL,  -- 'focus', 'break'
            duration INTEGER NOT NULL,  -- in seconds
            completed INTEGER DEFAULT 0,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            ended_at DATETIME
        )
    """)

    # Weak topics tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS weak_topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            reason TEXT,
            suggested_revision TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved INTEGER DEFAULT 0
        )
    """)

    conn.commit()
    conn.close()


# Conversation operations

def add_conversation(role: str, content: str, document_id: Optional[int] = None, session_id: Optional[str] = None, is_adaptive: bool = False) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO conversations (role, content, document_id, session_id, is_adaptive) VALUES (?, ?, ?, ?, ?)",
        (role, content, document_id, session_id, 1 if is_adaptive else 0)
    )
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id


def get_conversations(session_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if session_id:
        cursor.execute(
            "SELECT * FROM conversations WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?",
            (session_id, limit)
        )
    else:
        cursor.execute(
            "SELECT * FROM conversations ORDER BY timestamp DESC LIMIT ?",
            (limit,)
        )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# Document operations

def add_document(title: str, file_path: str, extracted_text: str, chunks: List[str], total_pages: int = 0) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO documents (title, file_path, extracted_text, chunks, total_pages) VALUES (?, ?, ?, ?, ?)",
        (title, file_path, extracted_text, json.dumps(chunks), total_pages)
    )
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id


def get_documents() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY uploaded_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_document_chunks(doc_id: int) -> List[str]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT chunks FROM documents WHERE id = ?", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    if row and row['chunks']:
        return json.loads(row['chunks'])
    return []


# Study progress operations

def update_study_progress(topic: str, time_spent: int = 0, quiz_score: Optional[float] = None):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM study_progress WHERE topic = ?", (topic,))
    existing = cursor.fetchone()

    if existing:
        new_time = existing['time_spent'] + time_spent
        new_score = quiz_score if quiz_score is not None else existing['quiz_score']
        cursor.execute(
            "UPDATE study_progress SET time_spent = ?, quiz_score = ?, last_studied = CURRENT_TIMESTAMP WHERE topic = ?",
            (new_time, new_score, topic)
        )
    else:
        cursor.execute(
            "INSERT INTO study_progress (topic, time_spent, quiz_score) VALUES (?, ?, ?)",
            (topic, time_spent, quiz_score)
        )

    conn.commit()
    conn.close()


def get_weak_topics() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM study_progress WHERE weak_flag = 1 OR (quiz_score IS NOT NULL AND quiz_score < 70) ORDER BY last_studied DESC"
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# Flashcard operations

def add_flashcard(document_id: Optional[int], question: str, answer: str, difficulty: str = 'medium') -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO flashcards (document_id, question, answer, difficulty) VALUES (?, ?, ?, ?)",
        (document_id, question, answer, difficulty)
    )
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id


def get_flashcards(document_id: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if document_id:
        cursor.execute("SELECT * FROM flashcards WHERE document_id = ? ORDER BY created_at DESC", (document_id,))
    else:
        cursor.execute("SELECT * FROM flashcards ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def update_flashcard_review(flashcard_id: int, correct: bool):
    conn = get_connection()
    cursor = conn.cursor()
    if correct:
        cursor.execute(
            "UPDATE flashcards SET times_correct = times_correct + 1, last_reviewed = CURRENT_TIMESTAMP WHERE id = ?",
            (flashcard_id,)
        )
    else:
        cursor.execute(
            "UPDATE flashcards SET times_incorrect = times_incorrect + 1, last_reviewed = CURRENT_TIMESTAMP WHERE id = ?",
            (flashcard_id,)
        )
    conn.commit()
    conn.close()


# Schedule / Pomodoro operations

def add_schedule(session_type: str, duration: int, completed: bool = False) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO schedules (session_type, duration, completed) VALUES (?, ?, ?)",
        (session_type, duration, 1 if completed else 0)
    )
    conn.commit()
    last_id = cursor.lastrowid
    conn.close()
    return last_id


def complete_schedule(session_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE schedules SET completed = 1, ended_at = CURRENT_TIMESTAMP WHERE id = ?",
        (session_id,)
    )
    conn.commit()
    conn.close()


def get_study_stats() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    # Total focus time today
    cursor.execute(
        "SELECT COALESCE(SUM(duration), 0) as total FROM schedules WHERE session_type = 'focus' AND date(started_at) = date('now')"
    )
    total_focus_today = cursor.fetchone()['total']

    # Total sessions completed
    cursor.execute(
        "SELECT COUNT(*) as count FROM schedules WHERE completed = 1"
    )
    total_sessions = cursor.fetchone()['count']

    # Average quiz score
    cursor.execute(
        "SELECT AVG(quiz_score) as avg FROM study_progress WHERE quiz_score IS NOT NULL"
    )
    avg_score = cursor.fetchone()['avg'] or 0

    conn.close()

    return {
        "total_focus_time_today": total_focus_today,
        "total_sessions_completed": total_sessions,
        "average_quiz_score": round(avg_score, 1),
    }


# Weak topics

def add_weak_topic(topic: str, reason: str, suggested_revision: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO weak_topics (topic, reason, suggested_revision) VALUES (?, ?, ?)",
        (topic, reason, suggested_revision)
    )
    conn.commit()
    conn.close()


def get_unresolved_weak_topics() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM weak_topics WHERE resolved = 0 ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
