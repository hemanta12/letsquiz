"""
Cache management utilities for quiz data
"""
import logging
from typing import Optional, List
from django.core.cache import cache
from core.redis_utils import cache_delete, get_redis_client

logger = logging.getLogger(__name__)


def invalidate_questions_cache(category_id: Optional[int] = None):
    """
    Invalidate question cache entries.
    If category_id is provided, only invalidate caches for that category.
    Otherwise, invalidate all question caches.
    """
    redis_client = get_redis_client()
    
    if redis_client:
        try:
            # Use Redis pattern matching to find relevant keys
            if category_id:
                pattern = f"letsquiz_dev:questions:*category_id*{category_id}*"
            else:
                pattern = "letsquiz_dev:questions:*"
            
            keys = redis_client.keys(pattern)
            if keys:
                redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} question cache entries for category {category_id}")
            else:
                logger.info(f"No question cache entries found to invalidate for category {category_id}")
                
        except Exception as e:
            logger.error(f"Error invalidating questions cache: {e}")
    else:
        # Fallback to Django cache - less efficient but works
        logger.warning("Redis not available, using Django cache fallback for invalidation")
        # Note: Django cache doesn't support pattern matching, so we clear all
        cache.clear()


def invalidate_categories_cache():
    """Invalidate categories cache"""
    cache_key = "categories:with_questions"
    success = cache_delete(cache_key)
    if success:
        logger.info("Invalidated categories cache")
    else:
        logger.warning("Failed to invalidate categories cache")


def invalidate_session_cache(session_id: int):
    """Invalidate specific session cache"""
    cache_key = f"session_details:{session_id}"
    success = cache_delete(cache_key)
    if success:
        logger.info(f"Invalidated session cache for session {session_id}")
    else:
        logger.warning(f"Failed to invalidate session cache for session {session_id}")


def invalidate_user_sessions_cache(user_id: int):
    """Invalidate session caches for a specific user - simplified approach"""
    # Note: This is a simplified approach. In practice, specific session IDs 
    # should be invalidated based on user ownership rather than all sessions.
    redis_client = get_redis_client()
    
    if redis_client:
        try:
            pattern = "letsquiz_dev:session_details:*"
            keys = redis_client.keys(pattern)
            
            if keys:
                redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} session caches (triggered by user {user_id})")
            else:
                logger.info(f"No session caches to invalidate for user {user_id}")
                
        except Exception as e:
            logger.error(f"Error invalidating user session cache: {e}")
            # Fallback to clearing all cache
            cache.clear()
    else:
        # Fallback when Redis unavailable
        cache.clear()
        logger.info("Cleared all cache as fallback for user sessions invalidation")


def invalidate_all_quiz_cache():
    """Invalidate all quiz-related cache entries"""
    redis_client = get_redis_client()
    
    if redis_client:
        try:
            patterns = [
                "letsquiz_dev:questions:*",
                "letsquiz_dev:categories:*",
                "letsquiz_dev:user_stats:*",
                "letsquiz_dev:session_details:*"
            ]
            
            total_deleted = 0
            for pattern in patterns:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
                    total_deleted += len(keys)
            
            logger.info(f"Invalidated {total_deleted} cache entries")
            
        except Exception as e:
            logger.error(f"Error invalidating all quiz cache: {e}")
    else:
        # Fallback
        cache.clear()
        logger.info("Cleared all Django cache as fallback")


def warm_questions_cache(category_ids: Optional[List[int]] = None, difficulties: Optional[List[str]] = None):
    """Pre-warm the questions cache with popular combinations"""
    from apps.quiz.quiz_views import get_questions_from_cache_or_db
    from apps.quiz.models import Category, DifficultyLevel
    
    # Get actual category IDs from database if not provided
    if not category_ids:
        category_ids = list(Category.objects.values_list('id', flat=True))
    
    # Get actual difficulty labels from database if not provided
    if not difficulties:
        difficulties = list(DifficultyLevel.objects.values_list('label', flat=True))
    
    counts = [5, 10, 15, 20]  # Popular question counts
    
    warmed_count = 0
    for category_id in category_ids:
        for difficulty in difficulties:
            for count in counts:
                try:
                    get_questions_from_cache_or_db(
                        category_id=category_id,
                        difficulty=difficulty,
                        count=count
                    )
                    warmed_count += 1
                except Exception as e:
                    logger.error(f"Error warming cache for cat:{category_id}, diff:{difficulty}, count:{count}: {e}")
    
    
    logger.info(f"Warmed {warmed_count} cache entries")


# Utility functions to be called from Django signals or admin actions
def on_question_created_or_updated(question_instance):
    """Called when a question is created or updated"""
    invalidate_questions_cache(question_instance.category.id)
    invalidate_categories_cache()


def on_question_deleted(question_instance):
    """Called when a question is deleted"""
    invalidate_questions_cache(question_instance.category.id)
    invalidate_categories_cache()


def on_category_updated(category_instance):
    """Called when a category is updated"""
    invalidate_categories_cache()
    invalidate_questions_cache(category_instance.id)


# User data cache invalidation functions

def invalidate_user_profile_cache(user_id: int):
    """Invalidate user profile cache"""
    cache_key = f"user_profile:{user_id}"
    success = cache_delete(cache_key)
    if success:
        logger.info(f"Invalidated user profile cache for user {user_id}")
    else:
        logger.warning(f"Failed to invalidate user profile cache for user {user_id}")


def invalidate_user_stats_cache(user_id: int):
    """Invalidate user statistics cache"""
    cache_key = f"user_stats:{user_id}"
    success = cache_delete(cache_key)
    if success:
        logger.info(f"Invalidated user stats cache for user {user_id}")
    else:
        logger.warning(f"Failed to invalidate user stats cache for user {user_id}")


def invalidate_user_sessions_list_cache(user_id: int):
    """Invalidate user sessions list cache"""
    cache_key = f"user_sessions:{user_id}"
    success = cache_delete(cache_key)
    if success:
        logger.info(f"Invalidated user sessions cache for user {user_id}")
    else:
        logger.warning(f"Failed to invalidate user sessions cache for user {user_id}")


def invalidate_all_user_cache(user_id: int):
    """Invalidate all cache entries for a specific user"""
    invalidate_user_profile_cache(user_id)
    invalidate_user_stats_cache(user_id)
    invalidate_user_sessions_list_cache(user_id)
    logger.info(f"Invalidated all cache entries for user {user_id}")


def on_quiz_session_completed(session_instance):
    """Called when a quiz session is completed - invalidates user caches"""
    if session_instance.user:
        user_id = session_instance.user.id
        invalidate_all_user_cache(user_id)
        logger.info(f"Invalidated user caches after quiz completion for user {user_id}")
    
    # Also invalidate the specific session cache
    invalidate_session_cache(session_instance.id)


def on_user_profile_updated(user_instance):
    """Called when a user profile is updated"""
    invalidate_user_profile_cache(user_instance.id)
    logger.info(f"Invalidated user profile cache after profile update for user {user_instance.id}")
