from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User # Import your custom User model

# Register your models here.

admin.site.register(User, UserAdmin)
