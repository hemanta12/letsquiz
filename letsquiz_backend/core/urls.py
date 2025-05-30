from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
urlpatterns = [
    path("admin/", admin.site.urls),
    path('', include('letsquiz_backend.apps.quiz.urls')),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
