from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class CustomModelBackend:
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Custom authentication backend that uses email as username.
        Handles all authentication cases with proper error handling and logging.
        """
        # Validate input parameters
        if not username:
            logger.warning("Authentication attempt with missing email")
            raise AuthenticationFailed("Email is required")
            
        if not password:
            logger.warning(f"Authentication attempt with missing password for email: {username}")
            raise AuthenticationFailed("Password is required")

        try:
            # Attempt to get user by email
            user = User.objects.get(email=username)
            
            # Validate password
            try:
                if not user.check_password(password):
                    logger.warning(f"Failed login attempt: Invalid password for user: {username}")
                    raise AuthenticationFailed("Invalid email or password")
            except Exception as e:
                logger.error(f"Password validation error for user {username}: {str(e)}")
                raise AuthenticationFailed("Unable to validate password. Please try again.")
                
            # Check if user is active
            if not user.is_active:
                logger.warning(f"Login attempt by inactive user: {username}")
                raise AuthenticationFailed("Your account has been deactivated. Please contact support.")
                
            # Successful authentication
            logger.info(f"Successful authentication for user: {username}")
            return user
            
        except User.DoesNotExist:
            # Log failed attempt but return generic message to user
            logger.warning(f"Failed login attempt: No user found with email: {username}")
            raise AuthenticationFailed("Invalid email or password")
            
        except AuthenticationFailed:
            # Re-raise AuthenticationFailed exceptions
            raise
            
        except Exception as e:
            # Log unexpected errors but return generic message to user
            logger.error(f"Unexpected error during authentication for {username}: {str(e)}", 
                        exc_info=True)
            raise AuthenticationFailed("An error occurred during authentication. Please try again later.")

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
            
            