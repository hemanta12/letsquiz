from letsquiz.letsquiz_backend.core.settings import *

# Override settings for production
DEBUG = False

# Set allowed hosts for production
ALLOWED_HOSTS = ['your_production_domain.com', '.fly.dev'] # Replace with your actual domain and Fly.io domain

# Production database settings (using django-environ to read from DATABASE_URL)
DATABASES = {
    'default': env.db('DATABASE_URL'),
}

# Security settings for production
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000 # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# CORS settings for production (more restrictive)
# CORS_ALLOWED_ORIGINS = [
#     "https://your_frontend_domain.com", # Replace with your actual frontend domain
# ]
# Or use CORS_ALLOW_ALL_ORIGINS = False and configure CORS_ALLOWED_ORIGIN_REGEXES or CORS_ALLOWED_ORIGINS

# Static files settings for production (using WhiteNoise or similar)
# STATIC_ROOT = BASE_DIR / 'staticfiles'
# STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Logging and error reporting (Sentry)
# import sentry_sdk
# from sentry_sdk.integrations.django import DjangoIntegration
#
# sentry_sdk.init(
#     dsn=env('SENTRY_DSN'),
#     integrations=[
#         DjangoIntegration(),
#     ],
#     # Set traces_sample_rate to 1.0 to capture 100%
#     # of transactions for performance monitoring.
#     traces_sample_rate=1.0,
#     # If you wish to associate users to errors (assuming you are using
#     # django.contrib.auth) you may enable sending PII to Sentry.
#     send_default_pii=True
# )