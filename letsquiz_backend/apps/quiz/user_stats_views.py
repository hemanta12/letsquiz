import logging
from django.db.models import Sum, Avg, Count
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView

from django.contrib.auth import get_user_model

from .models import (
    QuizSession,
    DifficultyLevel,
    GroupPlayer
)
from .serializers import UserStatsSerializer

logger = logging.getLogger(__name__)
User = get_user_model()

class UserProfileView(APIView):
    """API endpoint for user profile operations."""
    permission_classes = [IsAuthenticated]

    def get(self, request, userId):
        """Get user profile data."""
        try:
            # Only allow users to access their own profile
            if request.user.id != userId:
                return Response({
                    'error': 'Not authorized to access this profile.',
                    'code': 'permission_denied'
                }, status=status.HTTP_403_FORBIDDEN)

            user = request.user

            # Get solo sessions owned by the user
            solo_sessions = QuizSession.objects.filter(user=user, is_group_session=False)

            # Get GroupPlayer instances for the user (assuming name matches user.email)
            user_group_players = GroupPlayer.objects.filter(name=user.email)

            # Get QuizSession objects associated with these group players
            group_sessions_as_player = QuizSession.objects.filter(group_players__in=user_group_players).distinct()

            # Calculate total quizzes
            total_quizzes = solo_sessions.count() + group_sessions_as_player.count()

            # Calculate total score
            solo_score_sum = solo_sessions.aggregate(Sum('score'))['score__sum'] or 0
            group_score_sum = user_group_players.aggregate(Sum('score'))['score__sum'] or 0
            total_score = solo_score_sum + group_score_sum

            # Get category stats (only from solo sessions for now)
            category_stats = {}
            for session in solo_sessions:
                questions = session.session_questions.all()
                for question in questions:
                    # Ensure question and category exist before accessing name
                    if question.question and question.question.category:
                        category = question.question.category
                        if category.name not in category_stats:
                            category_stats[category.name] = {
                                'total_questions': 0,
                                'correct_answers': 0
                            }
                        category_stats[category.name]['total_questions'] += 1
                        if question.is_correct:
                            category_stats[category.name]['correct_answers'] += 1

            profile_data = {
                'user_id': user.id,
                'email': user.email,
                'total_score': total_score,
                'total_quizzes': total_quizzes,
                'category_stats': category_stats,
                'is_premium': user.is_premium,
                'joined_date': user.date_joined
            }

            return Response(profile_data, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({
                'error': 'User not found.',
                'code': 'user_not_found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}", exc_info=True)
            return Response({
                'error': 'Error fetching user profile.',
                'code': 'server_error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_sessions_view(request, userId):
    """API endpoint for retrieving paginated quiz history."""
    try:
        # Only allow users to access their own sessions
        if request.user.id != userId:
            return Response({
                'error': 'Not authorized to access this data.',
                'code': 'permission_denied'
            }, status=status.HTTP_403_FORBIDDEN)

        # Get quiz sessions with pagination
        try:
            quiz_sessions = QuizSession.objects.filter(user_id=userId).annotate(
                total_questions=Count('session_questions')
            ).order_by('-started_at')
            logger.info(f"Quiz sessions count: {quiz_sessions.count()}")

            sessions_data = []
            for session in quiz_sessions:
                first_question = session.session_questions.first()
                
                # Include group players data for group sessions
                group_players_data = []
                if session.is_group_session:
                    group_players_data = [
                        {
                            'id': player.id,
                            'name': player.name,
                            'score': player.score,
                            'errors': player.errors,
                            'answers': player.answers,
                            'correct_answers': player.correct_answers
                        }
                        for player in session.group_players.all()
                    ]
                
                session_data = {
                    'id': session.id,
                    'score': session.score,
                    'total_questions': session.total_questions,
                    'started_at': session.started_at,
                    'completed_at': session.completed_at,
                    'category': first_question.question.category.name if first_question else None,
                    'difficulty': first_question.question.difficulty.label if first_question else None,
                    'is_group_session': session.is_group_session,
                    'group_players': group_players_data if session.is_group_session else None
                }
                sessions_data.append(session_data)

            return Response(sessions_data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error retrieving user sessions: {e}", exc_info=True)
            return Response({
                'error': 'Error retrieving user sessions.',
                'code': 'server_error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"Error retrieving user sessions: {e}", exc_info=True)
        return Response({
            'error': 'Error retrieving user sessions.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_stats_view(request, userId):
    """API endpoint for retrieving aggregate statistics."""
    try:
        # Only allow users to access their own stats
        if request.user.id != userId:
            return Response({
                'error': 'Not authorized to access this data.',
                'code': 'permission_denied'
            }, status=status.HTTP_403_FORBIDDEN)

        quiz_sessions = QuizSession.objects.filter(user_id=userId)

        # Calculate overall stats
        total_quizzes = quiz_sessions.count()
        total_score = quiz_sessions.aggregate(Sum('score'))['score__sum'] or 0
        total_questions = 0
        correct_answers = 0

        # Calculate category and difficulty stats
        category_stats = {}
        difficulty_stats = {}

        for session in quiz_sessions:
            session_questions = session.session_questions.all()
            total_questions += session_questions.count()

            for question in session_questions:
                if question.is_correct:
                    correct_answers += 1

                # Update category stats
                category = question.question.category.name
                if category not in category_stats:
                    category_stats[category] = {
                        'total_questions': 0,
                        'correct_answers': 0
                    }
                category_stats[category]['total_questions'] += 1
                if question.is_correct:
                    category_stats[category]['correct_answers'] += 1

                # Update difficulty stats
                difficulty = question.question.difficulty.label
                if difficulty not in difficulty_stats:
                    difficulty_stats[difficulty] = {
                        'total_questions': 0,
                        'correct_answers': 0
                    }
                difficulty_stats[difficulty]['total_questions'] += 1
                if question.is_correct:
                    difficulty_stats[difficulty]['correct_answers'] += 1

        response_data = {
            'overall_stats': {
                'total_quizzes': total_quizzes,
                'total_score': total_score,
                'total_questions': total_questions,
                'correct_answers': correct_answers,
                'accuracy': round((correct_answers / total_questions * 100), 1) if total_questions > 0 else 0
            },
            'category_stats': {
                category: {
                    'correct': stats['correct_answers'],
                    'total': stats['total_questions'],
                    'accuracy': round((stats['correct_answers'] / stats['total_questions'] * 100), 1) if stats['total_questions'] > 0 else 0
                } for category, stats in category_stats.items()
            },
            'difficulty_stats': {
                difficulty: {
                    'correct': stats['correct_answers'],
                    'total': stats['total_questions'],
                    'accuracy': round((stats['correct_answers'] / stats['total_questions'] * 100), 1) if stats['total_questions'] > 0 else 0
                } for difficulty, stats in difficulty_stats.items()
            }
        }

        serializer = UserStatsSerializer(data=response_data)
        serializer.is_valid(raise_exception=True)

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error retrieving user stats: {e}", exc_info=True)
        return Response({
            'error': 'Error retrieving user statistics.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)