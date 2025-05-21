import logging
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    QuizSession,
    QuizSessionQuestion,
)
from .serializers import QuizSessionSerializer

logger = logging.getLogger(__name__)
User = get_user_model()

def check_rate_limit(request):
    """Rate limiting disabled for guest and authenticated users"""
   
    pass

def track_guest_progress(request, quiz_session):
    """Track progress for guest users"""
    if not request.user.is_authenticated and hasattr(request, 'guest_session_id'):
        session_key = f'guest_session:{request.guest_session_id}'
        session_data = cache.get(session_key, {
            'progress': {},
            'completed_quizzes': [],
            'total_score': 0
        })

        # Update progress for current quiz
        session_data['progress'][str(quiz_session.id)] = {
            'score': quiz_session.score,
            'completed_at': timezone.now().isoformat(),
            'total_questions': quiz_session.session_questions.count()
        }

        if quiz_session.is_completed:
            session_data['completed_quizzes'].append(str(quiz_session.id))
            session_data['total_score'] += quiz_session.score

        # Update session with 30-day expiration
        cache.set(session_key, session_data, timeout=60*60*24*30)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_quiz_session(request, session_id):
    try:
        session = QuizSession.objects.get(id=session_id)
        data = QuizSessionSerializer(session).data
        # Add total_questions explicitly for consistency
        data['total_questions'] = session.session_questions.count()
        return Response(data)
    except QuizSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

