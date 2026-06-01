from typing import List, Dict, Any, Optional
from backend.database import (
    update_study_progress,
    get_weak_topics,
    add_flashcard,
    get_flashcards,
    update_flashcard_review,
    add_schedule,
    complete_schedule,
    get_study_stats,
    add_weak_topic,
    get_unresolved_weak_topics,
)


def track_study_session(topic: str, duration_seconds: int, quiz_score: Optional[float] = None):
    """Track a study session and update progress."""
    update_study_progress(topic, duration_seconds, quiz_score)

    # If score is low, flag as weak topic
    if quiz_score is not None and quiz_score < 70:
        add_weak_topic(
            topic=topic,
            reason=f"Low quiz score: {quiz_score}%",
            suggested_revision=f"Review {topic} fundamentals and practice more questions."
        )


def get_learning_recommendations() -> Dict[str, Any]:
    """Get personalized learning recommendations based on weak topics and progress."""
    weak = get_weak_topics()
    unresolved = get_unresolved_weak_topics()
    stats = get_study_stats()

    recommendations = []
    for topic in unresolved[:3]:
        recommendations.append({
            "topic": topic['topic'],
            "action": topic['suggested_revision'],
            "priority": "high",
        })

    for topic in weak[:2]:
        recommendations.append({
            "topic": topic['topic'],
            "action": f"Continue practicing {topic['topic']} to improve your score of {topic['quiz_score']}%.",
            "priority": "medium",
        })

    return {
        "recommendations": recommendations,
        "stats": stats,
        "total_weak_topics": len(weak) + len(unresolved),
    }


def record_pomodoro_session(duration: int, completed: bool = True) -> int:
    """Record a completed pomodoro session."""
    session_id = add_schedule('focus', duration, completed)
    if completed:
        complete_schedule(session_id)
    return session_id


def review_flashcard(flashcard_id: int, correct: bool):
    """Record a flashcard review."""
    update_flashcard_review(flashcard_id, correct)
