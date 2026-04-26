"""
Redis utility functions for LetsQuiz backend
"""
import logging
import json
from django.conf import settings
from django.core.cache import cache
from typing import Optional, Any

try:
    import redis
except Exception:  # pragma: no cover - optional dependency in Level 1
    redis = None

logger = logging.getLogger(__name__)


class RedisConnection:
    """
    Redis connection utility with fallback handling
    """
    _instance = None
    _redis_client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisConnection, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._redis_client is None:
            self._redis_client = self._create_connection()

    def _create_connection(self) -> Optional[redis.Redis]:
        """Create Redis connection with error handling"""
        if not getattr(settings, 'LEVEL1_USE_REDIS', False):
            logger.info("LEVEL1_USE_REDIS is disabled; using Django cache backend only")
            return None

        if redis is None:
            logger.warning("redis package not available; using Django cache backend only")
            return None

        try:
            redis_url = getattr(settings, 'REDIS_URL', 'redis://127.0.0.1:6379/0')
            client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            client.ping()
            logger.info("Redis connection established successfully")
            return client
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Falling back to Django cache.")
            return None

    def get_client(self) -> Optional[redis.Redis]:
        """Get Redis client instance"""
        return self._redis_client

    def is_available(self) -> bool:
        """Check if Redis is available"""
        return self._redis_client is not None

    def set_with_fallback(self, key: str, value: Any, timeout: int = 300) -> bool:
        """Set value with Redis fallback to Django cache"""
        try:
            if self._redis_client:
                # Serialize complex data structures to JSON for Redis
                if isinstance(value, (dict, list)):
                    serialized_value = json.dumps(value)
                elif hasattr(value, '__iter__') and not isinstance(value, (str, bytes)):
                    # Handle Django REST Framework ReturnList and similar iterables
                    try:
                        serialized_value = json.dumps(list(value))
                    except (TypeError, ValueError) as e:
                        logger.warning(f"Failed to serialize iterable for key {key}: {e}")
                        # Try converting to string as fallback
                        serialized_value = str(value)
                else:
                    serialized_value = str(value) if value is not None else ""
                
                self._redis_client.setex(key, timeout, serialized_value)
                return True
        except Exception as e:
            logger.warning(f"Redis set failed for key {key}: {e}")
        
        # Fallback to Django cache
        try:
            cache.set(key, value, timeout)
            return True
        except Exception as e:
            logger.error(f"Cache set failed for key {key}: {e}")
            return False

    def get_with_fallback(self, key: str, default: Any = None) -> Any:
        """Get value with Redis fallback to Django cache"""
        try:
            if self._redis_client:
                value = self._redis_client.get(key)
                if value is not None:
                    # Try to deserialize JSON data
                    try:
                        return json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        # Return as-is if not JSON
                        return value
        except Exception as e:
            logger.warning(f"Redis get failed for key {key}: {e}")
        
        # Fallback to Django cache
        try:
            return cache.get(key, default)
        except Exception as e:
            logger.error(f"Cache get failed for key {key}: {e}")
            return default

    def delete_with_fallback(self, key: str) -> bool:
        """Delete value with Redis fallback to Django cache"""
        try:
            if self._redis_client:
                self._redis_client.delete(key)
                return True
        except Exception as e:
            logger.warning(f"Redis delete failed for key {key}: {e}")
        
        # Fallback to Django cache
        try:
            cache.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete failed for key {key}: {e}")
            return False


# Global instance
redis_conn = RedisConnection()


def get_redis_client() -> Optional[redis.Redis]:
    """Get Redis client instance"""
    return redis_conn.get_client()


def cache_set(key: str, value: Any, timeout: int = 300) -> bool:
    """Set cache value with fallback"""
    return redis_conn.set_with_fallback(key, value, timeout)


def cache_get(key: str, default: Any = None) -> Any:
    """Get cache value with fallback"""
    return redis_conn.get_with_fallback(key, default)


def cache_delete(key: str) -> bool:
    """Delete cache value with fallback"""
    return redis_conn.delete_with_fallback(key)


def is_redis_available() -> bool:
    """Check if Redis is available"""
    return redis_conn.is_available()
