from .base import *
from rest_framework.permissions import AllowAny
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

logger.info(f"DATABASES setting in development.py: {DATABASES}")

MIDDLEWARE += [
    'letsquiz_backend.core.middleware.GuestSessionMiddleware',
]

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake'
    }
}

GUEST_SESSION_TIMEOUT = 60 * 60 * 24 * 30  # 30 days in seconds

RATE_LIMIT = {
    'GUEST': {
        'rate': 30,
        'period': 3600
    },
    'USER': {
        'rate': 300,
        'period': 3600
    }
}

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/hour',
        'user': '300/hour'
    }
}

GUEST_ACCESS_ENABLED = True
GUEST_FEATURES = {
    'quiz_attempt_limit': 3,
    'question_preview': True,
    'progress_tracking': True,
    'leaderboard_view': False,
    'detailed_results': False,
}

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''
DEFAULT_FROM_EMAIL = 'noreply@letsquiz.local'

FRONTEND_URL = 'http://localhost:3000'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}