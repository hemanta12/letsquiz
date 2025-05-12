from letsquiz.letsquiz_backend.core.settings import *

DEBUG = False

ALLOWED_HOSTS = ['your_production_domain.com', '.fly.dev']

DATABASES = {
    'default': env.db('DATABASE_URL'),
}

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000 # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'


