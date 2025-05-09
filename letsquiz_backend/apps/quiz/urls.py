from django.urls import path
from . import views # Import views from the current app
from .auth_views import LoginView # Import the new LoginView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

urlpatterns = [
    # URL for user registration
    path('signup/', views.signup_view, name='signup'),
    # URL for custom login
    path('auth/login/', LoginView.as_view(), name='custom_login'),
    # URLs for obtaining and refreshing JWT tokens
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # URL for requesting password reset
    path('password-reset/', views.password_reset_request_view, name='password_reset_request'),
    # URL for setting a new password via token
    path('set-new-password/', views.set_new_password_view, name='set_new_password'),
    # URL for password reset confirmation (used in email link)
    path('password-reset-confirm/<uidb64>/<token>/', views.password_reset_confirm_view, name='password_reset_confirm'),
    # URL for account verification
    path('verify-account/', views.account_verification_view, name='account_verification'),
    # URL for fetching user profile by ID
    path('users/<int:userId>/', views.UserProfileView.as_view(), name='user_profile'),
    # URL for fetching seeded questions
    path('questions/', views.fetch_seeded_questions_view, name='fetch_seeded_questions'),
    # URL for starting a new quiz session
    path('sessions/', views.start_quiz_session_view, name='start_quiz_session'),
    # URL for getting specific quiz session info
    path('sessions/<int:sessionId>/', views.get_quiz_session_view, name='get_quiz_session'),
    # URL for submitting an answer to a question in a session
    path('sessions/<int:sessionId>/answer/', views.submit_answer_view, name='submit_answer'),
    # URL for getting final quiz session results
    path('sessions/<int:sessionId>/results/', views.get_quiz_session_results_view, name='get_quiz_session_results'),
]