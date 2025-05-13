from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Question 



class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('email', 'is_staff', 'is_active')

    def log_deletion(self, request, obj, object_repr):
        # Skip writing any LogEntry when a user is deleted.
        # This prevents FK errors in development.
        pass

admin.site.register(User, CustomUserAdmin)
admin.site.register(Question)
