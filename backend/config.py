import os
from dotenv import load_dotenv

load_dotenv()

# OpenCode Go API Configuration
OPENCODE_API_KEY = os.getenv("OPENCODE_API_KEY", "")
OPENCODE_API_URL = os.getenv("OPENCODE_API_URL", "https://api.opencode.ai/v1/chat/completions")

# Application Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# AI Configuration
SYSTEM_PROMPT = """You are Ruki, a friendly and encouraging AI study companion. Your goal is to help students learn effectively by:

1. Providing clear, personalized explanations based on the user's study materials.
2. Adapting your teaching style when a student is confused (use simpler language, analogies, step-by-step breakdowns).
3. Creating summaries, flashcards, and quiz questions from uploaded documents.
4. Tracking the user's weak topics and suggesting focused revision.
5. Maintaining a supportive, motivating tone.

When answering questions:
- Prioritize information from the user's uploaded documents over generic internet knowledge.
- If the user asks something not in their materials, provide a general explanation but note that it goes beyond their current study materials.
- Use examples and analogies to make complex concepts easier to understand.
- For math/science problems, show step-by-step reasoning.
- Keep responses concise but thorough.
"""

ADAPTIVE_SIMPLIFY_PROMPT = """The user is struggling to understand. Please explain this concept again using:
- Very simple language (avoid jargon)
- Everyday analogies
- Step-by-step breakdown
- Visual descriptions where possible
- Short sentences
"""

# Pomodoro defaults
DEFAULT_WORK_DURATION = 25 * 60  # 25 minutes
DEFAULT_BREAK_DURATION = 5 * 60  # 5 minutes
