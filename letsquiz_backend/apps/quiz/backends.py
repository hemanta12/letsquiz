from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.conf import settings # Import settings

User = get_user_model()

class CustomModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Use the configured USERNAME_FIELD for lookup
            user = User.objects.get(**{User.USERNAME_FIELD: username})
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
            else:
                pass # Authentication failed
        except User.DoesNotExist:
            # Authentication failed
            pass
        except Exception as e:
            # Handle other potential exceptions during authentication
            pass

        return None

    def user_can_authenticate(self, user):
        # Check if the user is active. This is the default behavior of ModelBackend.
        return user.is_active