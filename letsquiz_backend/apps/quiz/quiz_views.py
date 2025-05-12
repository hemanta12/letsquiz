import logging
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .serializers import (
    QuestionSerializer,
    QuizSessionStartSerializer,
    AnswerSubmissionSerializer,
    CategorySerializer,
)
from .models import (
    Question,
    Category,
    DifficultyLevel,
    QuizSession,
    QuizSessionQuestion,
)

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])  # Allow unauthenticated access
def fetch_seeded_questions_view(request):
    """API endpoint for fetching seeded questions, with optional filtering."""
    try:
        queryset = Question.objects.filter(is_seeded=True)

        category_id = request.query_params.get('category')
        difficulty = request.query_params.get('difficulty')
        count_param = request.query_params.get('count', 10)

        if category_id:
            try:
                category_id = int(category_id)
                queryset = queryset.filter(category__id=category_id)
            except ValueError:
                return Response({
                    'error': 'Invalid category ID.',
                    'code': 'invalid_category'
                }, status=status.HTTP_400_BAD_REQUEST)

        if difficulty:
            try:
                difficulty_obj = DifficultyLevel.objects.get(label=difficulty)
                queryset = queryset.filter(difficulty=difficulty_obj)
            except DifficultyLevel.DoesNotExist:
                return Response({
                    'error': f'Difficulty level "{difficulty}" not found.',
                    'code': 'invalid_difficulty'
                }, status=status.HTTP_400_BAD_REQUEST)

        try:
            count = int(count_param)
            if count <= 0:
                return Response({
                    'error': 'Count must be a positive integer.',
                    'code': 'invalid_count'
                }, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({
                'error': 'Invalid count parameter.',
                'code': 'invalid_count'
            }, status=status.HTTP_400_BAD_REQUEST)

        questions = queryset.order_by('?')[:count]
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching questions: {e}", exc_info=True)
        return Response({
            'error': 'Error fetching questions.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])  
def fetch_categories_view(request):
    """API endpoint for fetching quiz categories."""
    try:
        categories = Category.objects.annotate(
            question_count=Count('questions', filter=Q(questions__is_seeded=True))
        ).filter(question_count__gt=0)

        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching categories: {e}", exc_info=True)
        return Response({
            'error': 'Error fetching categories.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])  
def start_quiz_session_view(request):
    """API endpoint for starting a new quiz session (solo or group)."""
    try:
        serializer = QuizSessionStartSerializer(data=request.data)
        if not serializer.is_valid():
            error_detail = next(iter(serializer.errors.values()))[0] if serializer.errors else 'Invalid request data'
            return Response({
                'error': error_detail,
                'code': 'validation_error'
            }, status=status.HTTP_400_BAD_REQUEST)

        category_id = serializer.validated_data.get('category_id')
        difficulty_id = serializer.validated_data.get('difficulty_id')
        count = serializer.validated_data['count']
        mode = serializer.validated_data['mode']

        # Create quiz session
        quiz_session = QuizSession.objects.create(
            user=request.user if request.user.is_authenticated else None
        )

        # Select questions
        queryset = Question.objects.filter(is_seeded=True)
        if category_id:
            queryset = queryset.filter(category__id=category_id)
        if difficulty_id:
            queryset = queryset.filter(difficulty__id=difficulty_id)

        if queryset.count() < count:
            return Response({
                'error': 'Insufficient questions available for the selected criteria.',
                'code': 'insufficient_questions'
            }, status=status.HTTP_400_BAD_REQUEST)

        selected_questions = list(queryset.order_by('?')[:count])
        quiz_session_questions = [
            QuizSessionQuestion(quiz_session=quiz_session, question=q)
            for q in selected_questions
        ]
        QuizSessionQuestion.objects.bulk_create(quiz_session_questions)

        return Response({
            'message': 'Quiz session started successfully.',
            'session_id': quiz_session.id,
            'is_guest': not request.user.is_authenticated
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error starting quiz session: {e}", exc_info=True)
        return Response({
            'error': 'Error starting quiz session.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_quiz_session_view(request, sessionId):
    """API endpoint for retrieving quiz session details."""
    try:
        quiz_session = get_object_or_404(QuizSession, id=sessionId)

        # Check if user has permission to access this session
        if quiz_session.user and quiz_session.user != request.user:
            return Response({
                'error': 'Not authorized to access this session.',
                'code': 'permission_denied'
            }, status=status.HTTP_403_FORBIDDEN)

        # Get session questions with answers
        questions = []
        for sq in quiz_session.session_questions.all():
            question_data = {
                'id': sq.question.id,
                'text': sq.question.question_text,
                'options': sq.question.answer_options,
                'selected_answer': sq.selected_answer,
                'is_correct': sq.is_correct if sq.answered_at else None,
                'answered_at': sq.answered_at,
            }
            questions.append(question_data)

        response_data = {
            'session_id': quiz_session.id,
            'score': quiz_session.score,
            'started_at': quiz_session.created_at,
            'questions': questions,
            'is_completed': quiz_session.is_completed,
            'is_guest': not request.user.is_authenticated
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except QuizSession.DoesNotExist:
        return Response({
            'error': 'Quiz session not found.',
            'code': 'session_not_found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error retrieving quiz session: {e}", exc_info=True)
        return Response({
            'error': 'Error retrieving quiz session.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def submit_answer_view(request, sessionId):
    """API endpoint for submitting an answer to a question in a quiz session."""
    try:
        quiz_session = get_object_or_404(QuizSession, id=sessionId)

        # Check if user has permission to access this session
        if quiz_session.user and quiz_session.user != request.user:
            return Response({
                'error': 'Not authorized to access this session.',
                'code': 'permission_denied'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = AnswerSubmissionSerializer(data=request.data)
        if not serializer.is_valid():
            error_detail = next(iter(serializer.errors.values()))[0] if serializer.errors else 'Invalid request data'
            return Response({
                'error': error_detail,
                'code': 'validation_error'
            }, status=status.HTTP_400_BAD_REQUEST)

        question_id = serializer.validated_data['question_id']
        selected_answer = serializer.validated_data['selected_answer']

        try:
            session_question = QuizSessionQuestion.objects.get(
                quiz_session=quiz_session,
                question__id=question_id
            )
        except QuizSessionQuestion.DoesNotExist:
            return Response({
                'error': 'Question not found in this session.',
                'code': 'question_not_found'
            }, status=status.HTTP_404_NOT_FOUND)

        if session_question.answered_at is not None:
            return Response({
                'error': 'Question has already been answered.',
                'code': 'already_answered'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Process answer
        session_question.selected_answer = selected_answer
        session_question.answered_at = timezone.now()
        session_question.is_correct = (selected_answer.lower() == session_question.question.correct_answer.lower())

        if session_question.is_correct:
            quiz_session.score += 1
            quiz_session.save()

        session_question.save()

        return Response({
            'message': 'Answer submitted successfully.',
            'is_correct': session_question.is_correct,
            'updated_score': quiz_session.score
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error submitting answer: {e}", exc_info=True)
        return Response({
            'error': 'An error occurred while submitting the answer.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_quiz_session_results_view(request, sessionId):
    """API endpoint for retrieving quiz session results."""
    try:
        quiz_session = get_object_or_404(QuizSession, id=sessionId)

        # Check if user has permission to access this session
        if quiz_session.user and quiz_session.user != request.user:
            return Response({
                'error': 'Not authorized to access this session.',
                'code': 'permission_denied'
            }, status=status.HTTP_403_FORBIDDEN)

        # Get detailed results
        questions_data = []
        total_questions = 0
        correct_answers = 0

        for sq in quiz_session.session_questions.all():
            total_questions += 1
            if sq.is_correct:
                correct_answers += 1

            question_data = {
                'question_text': sq.question.question_text,
                'selected_answer': sq.selected_answer,
                'correct_answer': sq.question.correct_answer,
                'is_correct': sq.is_correct,
                'category': sq.question.category.name,
                'difficulty': sq.question.difficulty.name,
            }
            questions_data.append(question_data)

        response_data = {
            'session_id': quiz_session.id,
            'total_score': quiz_session.score,
            'total_questions': total_questions,
            'correct_answers': correct_answers,
            'accuracy': (correct_answers / total_questions * 100) if total_questions > 0 else 0,
            'started_at': quiz_session.created_at,
            'completed_at': quiz_session.updated_at,
            'questions': questions_data,
            'is_guest': not request.user.is_authenticated
        }

        return Response(response_data, status=status.HTTP_200_OK)

    except QuizSession.DoesNotExist:
        return Response({
            'error': 'Quiz session not found.',
            'code': 'session_not_found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error retrieving quiz results: {e}", exc_info=True)
        return Response({
            'error': 'Error retrieving quiz results.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)