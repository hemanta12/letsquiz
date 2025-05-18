import logging
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated 

from .serializers import (
    QuestionSerializer,
    QuizSessionStartSerializer,
    AnswerSubmissionSerializer,
    CategorySerializer,
    QuizSessionSaveSerializer,
    QuizSessionSerializer,
)
from .models import (
    Question,
    Category,
    DifficultyLevel,
    QuizSession,
    QuizSessionQuestion,
    GroupPlayer, 
)

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_quiz_session_view(request):
    """API endpoint for saving a completed quiz session."""
    try:
        serializer = QuizSessionSaveSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            quiz_session_instance = serializer.save()
            logger.info(f"save_quiz_session_view: Quiz session saved. ID: {quiz_session_instance.id}, is_group_session: {quiz_session_instance.is_group_session}") 
            return Response({'message': 'Quiz session saved successfully.'}, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"save_quiz_session_view: Serializer errors: {serializer.errors}") 
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error saving quiz session: {e}", exc_info=True)
        return Response({
            'error': 'Error saving quiz session.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])  # Allow unauthenticated access
def fetch_seeded_questions_view(request):
    """API endpoint for fetching seeded questions, with optional filtering."""
    try:
        queryset = Question.objects.filter(is_seeded=True)

        category_id = request.query_params.get('category')
        difficulty = request.query_params.get('difficulty')
        count_param = request.query_params.get('_limit', 10)

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
        players_data = serializer.validated_data.get('players', []) # Get player names from validated data

        # Create quiz session
        quiz_session = QuizSession(score=0) 
        if request.user.is_authenticated:
            quiz_session.user = request.user
        # Set is_group_session to True if mode is 'group'
        if mode == 'group':
            quiz_session.is_group_session = True
        quiz_session.save()
        
        # Create GroupPlayer instances for group mode
        if mode == 'group' and players_data:
            group_players = [GroupPlayer(quiz_session=quiz_session, name=name) for name in players_data]
            GroupPlayer.objects.bulk_create(group_players)

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

        # Fetch category and difficulty objects to include names/labels in response
        category_name = Category.objects.get(id=category_id).name if category_id else 'Mixed'
        difficulty_label = DifficultyLevel.objects.get(id=difficulty_id).label if difficulty_id else 'Unknown'

        # Serialize the created quiz session including group players
        session_serializer = QuizSessionSerializer(quiz_session)

        # Combine serialized session data with category name and difficulty label
        response_data = session_serializer.data
        response_data['category'] = category_name
        response_data['difficulty'] = difficulty_label
        response_data['totalQuestions'] = count 

        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error starting quiz session: {e}", exc_info=True)
        return Response({
            'error': 'Error starting quiz session.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_quiz_session_view(request, sessionId, category=None, difficulty=None):
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
                'correct_answer': sq.question.correct_answer,
                'category': sq.question.category.name,
                'difficulty': sq.question.difficulty.label,
                'is_correct': sq.is_correct if sq.answered_at else None,
                'answered_at': sq.answered_at,
            }
            questions.append(question_data)

        if questions:
            session_category   = questions[0]['category']
            session_difficulty = questions[0]['difficulty']
        else:
            session_category, session_difficulty = None, None
        
        if category is None:
            category = session_category
        if difficulty is None:
            difficulty = session_difficulty

        response_data = {
            'session_id':  quiz_session.id,
            'category':    category,
            'difficulty':  difficulty,
            'score':       quiz_session.score,
            'started_at':  quiz_session.started_at,
            'questions':   questions,
            'is_completed':quiz_session.is_completed,
            'is_guest':     not request.user.is_authenticated,
            'is_group_session': quiz_session.is_group_session,
            'group_players': QuizSessionSerializer(quiz_session).data.get('group_players', []) 
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
                'difficulty': sq.question.difficulty.label,
            }
            questions_data.append(question_data)

        response_data = {
            'session_id': quiz_session.id,
            'total_score': quiz_session.score,
            'total_questions': total_questions,
            'correct_answers': correct_answers,
            'accuracy': (correct_answers / total_questions * 100) if total_questions > 0 else 0,
            'started_at': quiz_session.started_at,
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