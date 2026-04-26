"""
Management command to test and manage quiz caching
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache
from apps.quiz.cache_utils import (
    invalidate_all_quiz_cache,
    warm_questions_cache,
    invalidate_questions_cache,
    invalidate_categories_cache
)
from core.redis_utils import get_redis_client, is_redis_available


class Command(BaseCommand):
    help = 'Test and manage quiz cache functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--action',
            type=str,
            choices=['test', 'invalidate', 'warm', 'stats'],
            default='test',
            help='Action to perform'
        )
        parser.add_argument(
            '--category',
            type=int,
            help='Category ID for specific operations'
        )

    def handle(self, *args, **options):
        action = options['action']
        category_id = options.get('category')

        self.stdout.write(self.style.HTTP_INFO(f'Quiz Cache Management - Action: {action}'))
        
        if not is_redis_available():
            self.stdout.write(
                self.style.WARNING('⚠️  Redis not available - operations will use Django cache fallback')
            )

        if action == 'test':
            self.test_caching()
        elif action == 'invalidate':
            self.invalidate_cache(category_id)
        elif action == 'warm':
            self.warm_cache(category_id)
        elif action == 'stats':
            self.show_cache_stats()

    def test_caching(self):
        """Test cache operations"""
        self.stdout.write(self.style.HTTP_INFO('Testing cache operations...'))
        
        # Test 1: Basic cache operations
        test_key = "test:quiz_cache"
        test_value = {"test": "data", "timestamp": "2025-01-01"}
        
        # Set cache
        cache.set(test_key, test_value, 60)
        
        # Get cache
        cached_value = cache.get(test_key)
        
        if cached_value == test_value:
            self.stdout.write(self.style.SUCCESS('✓ Basic cache operations: SUCCESS'))
        else:
            self.stdout.write(self.style.ERROR('✗ Basic cache operations: FAILED'))
        
        # Cleanup
        cache.delete(test_key)
        
        # Test 2: Cache key generation
        from apps.quiz.quiz_views import generate_cache_key
        
        key1 = generate_cache_key("test", category=1, difficulty="Easy")
        key2 = generate_cache_key("test", difficulty="Easy", category=1)
        
        if key1 == key2:
            self.stdout.write(self.style.SUCCESS('✓ Cache key generation: SUCCESS'))
        else:
            self.stdout.write(self.style.ERROR('✗ Cache key generation: FAILED'))
        
        # Test 3: Questions cache function
        try:
            from apps.quiz.quiz_views import get_questions_from_cache_or_db
            
            # This should work even if no questions exist
            result = get_questions_from_cache_or_db(count=1)
            
            self.stdout.write(self.style.SUCCESS('✓ Questions cache function: SUCCESS'))
            
            if result:
                self.stdout.write(f"  Found {len(result)} questions")
            else:
                self.stdout.write("  No questions found (expected if database is empty)")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Questions cache function: ERROR - {e}'))

    def invalidate_cache(self, category_id=None):
        """Invalidate cache entries"""
        if category_id:
            self.stdout.write(f'Invalidating cache for category {category_id}...')
            invalidate_questions_cache(category_id)
            self.stdout.write(self.style.SUCCESS(f'✓ Cache invalidated for category {category_id}'))
        else:
            self.stdout.write('Invalidating all quiz cache...')
            invalidate_all_quiz_cache()
            self.stdout.write(self.style.SUCCESS('✓ All quiz cache invalidated'))

    def warm_cache(self, category_id=None):
        """Warm cache with popular combinations"""
        if category_id:
            self.stdout.write(f'Warming cache for category {category_id}...')
            warm_questions_cache([category_id])
        else:
            self.stdout.write('Warming cache for all categories...')
            warm_questions_cache()
        
        self.stdout.write(self.style.SUCCESS('✓ Cache warming completed'))

    def show_cache_stats(self):
        """Show cache statistics"""
        self.stdout.write(self.style.HTTP_INFO('Cache Statistics:'))
        
        redis_client = get_redis_client()
        if redis_client:
            try:
                # Count cache entries by pattern
                patterns = {
                    "Questions": "letsquiz_dev:questions:*",
                    "Categories": "letsquiz_dev:categories:*",
                    "User Stats": "letsquiz_dev:user_stats:*",
                    "Sessions": "letsquiz_dev:session_details:*"
                }
                
                total_keys = 0
                for name, pattern in patterns.items():
                    keys = redis_client.keys(pattern)
                    count = len(keys)
                    total_keys += count
                    self.stdout.write(f"  {name}: {count} cached entries")
                
                self.stdout.write(f"  Total: {total_keys} cached entries")
                
                # Memory usage
                info = redis_client.info('memory')
                used_memory = info.get('used_memory_human', 'Unknown')
                self.stdout.write(f"  Redis Memory Usage: {used_memory}")
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error getting Redis stats: {e}"))
        else:
            self.stdout.write(self.style.WARNING("Redis not available - cannot show detailed stats"))
        
        self.stdout.write(self.style.SUCCESS('✓ Cache statistics displayed'))
