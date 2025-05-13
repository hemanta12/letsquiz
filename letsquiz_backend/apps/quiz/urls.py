from django.urls import path
from . import auth_views
from . import quiz_views
from . import user_stats_views
from .auth_views import (
    create_guest_session,
    get_guest_session,
    convert_guest_to_user
)

urlpatterns = [
    # Authentication URLs
    path('auth/signup/', auth_views.signup_view, name='signup'),
    path('auth/login/', auth_views.login_view, name='user_login'),
    path('auth/logout/', auth_views.logout_view, name='user_logout'),
    
    # Guest session URLs
    path('guest/session/', create_guest_session, name='create_guest_session'),
    path('guest/session/<str:session_id>/', get_guest_session, name='get_guest_session'),
    path('guest/convert/<str:session_id>/', convert_guest_to_user, name='convert_guest_to_user'),
    
    # Password reset URLs
    path('auth/password-reset/', auth_views.password_reset_request_view, name='password_reset_request'),
    path('set-new-password/', auth_views.set_new_password_view, name='set_new_password'),
    path('password-reset-confirm/<uidb64>/<token>/', auth_views.password_reset_confirm_view, name='password_reset_confirm'),
    
    # Account verification
    path('auth/verify-account/', auth_views.account_verification_view, name='account_verification'),
    
    # User profile
    path('users/<int:userId>/', user_stats_views.UserProfileView.as_view(), name='user_profile'),
    
    # Quiz related URLs
    path('questions/', quiz_views.fetch_seeded_questions_view, name='fetch_seeded_questions'),
    path('categories/', quiz_views.fetch_categories_view, name='fetch_categories'),
    path('sessions/', quiz_views.start_quiz_session_view, name='start_quiz_session'),
    path('sessions/<int:sessionId>/', quiz_views.get_quiz_session_view, name='get_quiz_session'),
    path('sessions/<int:sessionId>/answer/', quiz_views.submit_answer_view, name='submit_answer'),
    path('sessions/<int:sessionId>/results/', quiz_views.get_quiz_session_results_view, name='get_quiz_session_results'),
    path('quiz-sessions/', quiz_views.save_quiz_session_view, name='save_quiz_session'), # New endpoint for saving quiz sessions
    # User profile and stats URLs
    path('users/<int:userId>/sessions/', user_stats_views.get_user_sessions_view, name='get_user_sessions'),
    path('users/<int:userId>/stats/', user_stats_views.get_user_stats_view, name='get_user_stats'),
]