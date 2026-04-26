"""
Management command to test Redis connectivity
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache
from letsquiz_backend.core.redis_utils import get_redis_client, is_redis_available


class Command(BaseCommand):
    help = 'Test Redis connectivity and cache functionality'

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO('Testing Redis connectivity...'))
        self.stdout.write(self.style.HTTP_INFO('(Expecting Redis on localhost:6379 - Docker or local installation)'))
        
        # Test Redis direct connection
        redis_client = get_redis_client()
        if redis_client:
            try:
                # Test basic operations
                redis_client.set('test_key', 'test_value', ex=10)
                value = redis_client.get('test_key')
                redis_client.delete('test_key')
                
                if value == 'test_value':
                    self.stdout.write(
                        self.style.SUCCESS('✓ Redis direct connection: SUCCESS')
                    )
                    
                    # Show Redis info
                    try:
                        info = redis_client.info()
                        version = info.get('redis_version', 'Unknown')
                        mode = info.get('redis_mode', 'Unknown')
                        self.stdout.write(
                            self.style.HTTP_INFO(f'  Redis version: {version} (mode: {mode})')
                        )
                    except Exception:
                        pass
                        
                else:
                    self.stdout.write(
                        self.style.ERROR('✗ Redis direct connection: FAILED (value mismatch)')
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ Redis direct connection: ERROR - {e}')
                )
                self.stdout.write(
                    self.style.WARNING('  💡 Tip: Make sure Redis is running in Docker:')
                )
                self.stdout.write(
                    self.style.WARNING('     docker run -d --name letsquiz-redis -p 6379:6379 redis:7-alpine')
                )
        else:
            self.stdout.write(
                self.style.WARNING('⚠ Redis direct connection: NOT AVAILABLE')
            )
            self.stdout.write(
                self.style.WARNING('  💡 Tip: Start Redis with Docker:')
            )
            self.stdout.write(
                self.style.WARNING('     docker-compose -f docker-compose.dev.yml up -d redis')
            )
        
        # Test Django cache
        try:
            cache.set('test_cache_key', 'test_cache_value', 10)
            cache_value = cache.get('test_cache_key')
            cache.delete('test_cache_key')
            
            if cache_value == 'test_cache_value':
                backend = cache._cache.__class__.__name__
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Django cache: SUCCESS (using {backend})')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('✗ Django cache: FAILED (value mismatch)')
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Django cache: ERROR - {e}')
            )
        
        # Test Redis availability utility
        if is_redis_available():
            self.stdout.write(
                self.style.SUCCESS('✓ Redis availability check: PASSED')
            )
        else:
            self.stdout.write(
                self.style.WARNING('⚠ Redis availability check: Redis not available, using fallback')
            )
        
        self.stdout.write(self.style.HTTP_INFO('\nRedis test completed!'))
        
        if redis_client:
            self.stdout.write(
                self.style.SUCCESS('\n🎉 Redis is ready for use!')
            )
        else:
            self.stdout.write(
                self.style.WARNING('\n⚠️  Redis not available - application will use Django cache fallback')
            )
