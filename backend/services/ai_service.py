import requests
from typing import List, Dict, Any, Optional
from ..config import OPENCODE_API_KEY, OPENCODE_API_URL, SYSTEM_PROMPT, ADAPTIVE_SIMPLIFY_PROMPT
from ..database import get_conversations

# Simulated AI for offline/no-API-key mode
MOCK_RESPONSES = [
    "That's a great question! When you connect your OpenCode Go API key, I'll be able to give you detailed, personalized answers based on your study materials.",
    "I'd love to help you with that! Right now I'm in offline mode. Set up your API key in the `.env` file and I'll be able to access all my tutoring capabilities.",
    "Interesting! In the meantime, try uploading a PDF — I can extract text from it even without the AI. Just drop it in the chat panel!",
]


def chat_with_ai(message: str, session_id: Optional[str] = None, document_context: Optional[str] = None, is_adaptive: bool = False) -> str:
    """Send a message to the OpenCode Go API and return the response."""

    # Fallback if no API key configured
    if not OPENCODE_API_KEY or OPENCODE_API_KEY == "your_api_key_here":
        import random
        return random.choice(MOCK_RESPONSES)

    messages = []

    # System prompt
    system_content = SYSTEM_PROMPT
    if document_context:
        system_content += f"\n\nCurrent document context:\n{document_context}"
    if is_adaptive:
        system_content += f"\n\n{ADAPTIVE_SIMPLIFY_PROMPT}"

    messages.append({"role": "system", "content": system_content})

    # Add recent conversation history
    if session_id:
        history = get_conversations(session_id=session_id, limit=10)
        for msg in reversed(history):
            role = "user" if msg['role'] == 'user' else "assistant"
            messages.append({"role": role, "content": msg['content']})

    # Add current user message
    messages.append({"role": "user", "content": message})

    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENCODE_API_KEY}",
        }

        payload = {
            "model": "deepseek-v4-pro",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2048,
        }

        response = requests.post(OPENCODE_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()

        try:
            data = response.json()
        except Exception:
            return "I received a response I couldn't understand. The API endpoint may not be returning JSON. Please check your API URL."

        ai_response = data.get("choices", [{}])[0].get("message", {}).get("content", "")

        if not ai_response:
            return "I'm sorry, I couldn't generate a response. Could you rephrase your question?"

        return ai_response

    except requests.exceptions.ConnectionError:
        return "I'm having trouble connecting to my AI brain. Please check your internet connection or API URL."
    except requests.exceptions.Timeout:
        return "The request timed out. The AI service might be busy. Please try again in a moment."
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if hasattr(e, 'response') and e.response else 'unknown'
        return f"API Error ({status}). Please check your API key and endpoint configuration."
    except Exception as e:
        return f"Something went wrong when calling the AI. Please check your API configuration. ({type(e).__name__})"


def generate_summary(text: str) -> str:
    """Generate a summary of the provided text."""
    prompt = f"Please provide a concise summary of the following text, highlighting key concepts and important details:\n\n{text[:4000]}"
    return chat_with_ai(prompt, session_id=None)


def generate_flashcards(text: str, num_cards: int = 5) -> List[Dict[str, str]]:
    """Generate flashcards from text."""
    prompt = f"Create {num_cards} flashcards from the following text. Format each as 'Q: [question] A: [answer]' separated by newlines:\n\n{text[:4000]}"
    response = chat_with_ai(prompt, session_id=None)

    flashcards = []
    lines = response.split('\n')
    current_q = None
    current_a = None

    for line in lines:
        line = line.strip()
        if line.startswith('Q:') or line.startswith('Question:'):
            current_q = line.split(':', 1)[1].strip()
        elif line.startswith('A:') or line.startswith('Answer:'):
            current_a = line.split(':', 1)[1].strip()
            if current_q and current_a:
                flashcards.append({"question": current_q, "answer": current_a})
                current_q = None
                current_a = None

    return flashcards


def generate_quiz(text: str, num_questions: int = 5) -> List[Dict[str, Any]]:
    """Generate a quiz from text."""
    prompt = f"Create a {num_questions}-question multiple-choice quiz from the following text. Format each as:\nQ: [question]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nCorrect: [A/B/C/D]\n\n{text[:4000]}"
    response = chat_with_ai(prompt, session_id=None)

    # Basic parsing - in production, use structured output (JSON mode)
    questions = []
    blocks = response.split('\nQ:')
    for block in blocks[1:]:
        lines = block.strip().split('\n')
        if len(lines) >= 5:
            question_text = lines[0].strip()
            options = [line.strip() for line in lines[1:5]]
            correct_line = lines[5] if len(lines) > 5 else ""
            correct = correct_line.replace("Correct:", "").strip() if "Correct:" in correct_line else "A"
            questions.append({
                "question": question_text,
                "options": options,
                "correct": correct,
            })

    return questions


def find_relevant_chunks(query: str, chunks: List[str], top_k: int = 3) -> str:
    """Simple keyword-based relevance scoring to find top chunks."""
    query_words = set(query.lower().split())
    scored_chunks = []

    for chunk in chunks:
        chunk_words = set(chunk.lower().split())
        score = len(query_words.intersection(chunk_words))
        scored_chunks.append((score, chunk))

    scored_chunks.sort(reverse=True, key=lambda x: x[0])
    top_chunks = [chunk for _, chunk in scored_chunks[:top_k]]

    return "\n\n---\n\n".join(top_chunks)
