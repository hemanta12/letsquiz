from .base import *

# Override settings for development
DEBUG = True

# Add development-specific settings here
# For example, allow connections from localhost
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Optional: Development database settings if different from base
import logging # Import logging

logger = logging.getLogger(__name__) # Get logger

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

logger.info(f"DATABASES setting in development.py: {DATABASES}") # Log the DATABASES setting