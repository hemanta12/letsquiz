"""
Django signals for automatic cache invalidation
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Question, Category, QuizSession
from .cache_utils import (
    on_question_created_or_updated,
    on_question_deleted,
    on_category_updated,
    invalidate_session_cache
)

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Question)
def question_post_save(sender, instance, created, **kwargs):
    """Invalidate cache when question is created or updated"""
    action = "created" if created else "updated"
    logger.info(f"Question {action}: {instance.id} - invalidating cache")
    on_question_created_or_updated(instance)


@receiver(post_delete, sender=Question)
def question_post_delete(sender, instance, **kwargs):
    """Invalidate cache when question is deleted"""
    logger.info(f"Question deleted: {instance.id} - invalidating cache")
    on_question_deleted(instance)


@receiver(post_save, sender=Category)
def category_post_save(sender, instance, created, **kwargs):
    """Invalidate cache when category is created or updated"""
    action = "created" if created else "updated"
    logger.info(f"Category {action}: {instance.id} - invalidating cache")
    on_category_updated(instance)


@receiver(post_save, sender=QuizSession)
def quiz_session_post_save(sender, instance, created, **kwargs):
    """Invalidate session cache when session is updated"""
    if not created:  # Only invalidate on updates, not creation
        logger.info(f"Quiz session updated: {instance.id} - invalidating cache")
        invalidate_session_cache(instance.id)
