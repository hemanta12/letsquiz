"""
URL configuration for letsquiz_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from letsquiz_backend.apps.quiz import views # Import views from the quiz app

urlpatterns = [
    path("admin/", admin.site.urls),
    path('', include('letsquiz_backend.apps.quiz.urls')),
    # URL for obtaining JWT tokens (login)
    # URL for refreshing JWT tokens
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # URL for getting paginated quiz history for a user
    path('api/users/<int:userId>/sessions/', views.get_user_sessions_view, name='get_user_sessions'),
    # URL for getting aggregate user statistics
    path('api/users/<int:userId>/stats/', views.get_user_stats_view, name='get_user_stats'),
]
