import re
from typing import List, Optional, Set

from django.conf import settings

DEFAULT_LEVEL1_CATEGORIES = ["Science", "History", "Geography"]
DEFAULT_LEVEL1_DIFFICULTIES = ["Easy", "Medium", "Quiz Genius"]


def normalize_label(value: str) -> str:
    if not value:
        return ""
    normalized = value.strip().lower()
    normalized = re.sub(r"[_\-]+", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def get_allowed_category_names() -> List[str]:
    categories = getattr(settings, "LEVEL1_ALLOWED_CATEGORIES", DEFAULT_LEVEL1_CATEGORIES)
    return [name.strip() for name in categories if name and name.strip()]


def get_allowed_difficulty_labels() -> List[str]:
    difficulties = getattr(settings, "LEVEL1_ALLOWED_DIFFICULTIES", DEFAULT_LEVEL1_DIFFICULTIES)
    return [label.strip() for label in difficulties if label and label.strip()]


def canonicalize_difficulty_label(input_label: str) -> Optional[str]:
    normalized_input = normalize_label(input_label)
    if not normalized_input:
        return None

    for allowed in get_allowed_difficulty_labels():
        if normalize_label(allowed) == normalized_input:
            return allowed
    return None


def difficulty_aliases(label: str) -> Set[str]:
    canonical = normalize_label(label)
    if not canonical:
        return set()

    aliases = {
        label,
        canonical,
        canonical.replace(" ", "_"),
        canonical.replace(" ", "-"),
        canonical.replace(" ", ""),
    }
    return {alias for alias in aliases if alias}


def normalize_question_key(question_text: str) -> str:
    if not question_text:
        return ""
    normalized = question_text.strip().lower()
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized
