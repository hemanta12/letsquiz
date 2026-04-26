import logging
import random
import hashlib
import json
import re
from typing import Iterable, List
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.core.cache import cache

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated 

from letsquiz_backend.core.redis_utils import cache_set, cache_get, cache_delete
from .level1_config import (
    canonicalize_difficulty_label,
    get_allowed_category_names,
    normalize_label,
)

from .serializers import (
    QuestionSerializer,
    QuizSessionStartSerializer,
    AnswerSubmissionSerializer,
    AnswerValidationSerializer,
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

# Cache configuration
CACHE_TIMEOUT_QUESTIONS = 30 * 60  # 30 minutes
CACHE_TIMEOUT_CATEGORIES = 60 * 60  # 1 hour
CACHE_TIMEOUT_SESSION_RESULTS = 30 * 60  # 30 minutes for completed session results


def is_allowed_level1_category_id(category_id: int) -> bool:
    if category_id is None:
        return True
    return Category.objects.filter(id=category_id, name__in=get_allowed_category_names()).exists()


def resolve_difficulty_filter_values(raw_difficulty: str):
    canonical = canonicalize_difficulty_label(raw_difficulty)
    if not canonical:
        return None

    canonical_normalized = normalize_label(canonical)
    matching_labels = [
        difficulty.label
        for difficulty in DifficultyLevel.objects.all()
        if normalize_label(difficulty.label) == canonical_normalized
    ]
    return matching_labels or [canonical]

def generate_cache_key(prefix: str, **params) -> str:
    """Generate a consistent cache key from parameters"""
    # Sort parameters for consistent key generation
    sorted_params = sorted(params.items())
    param_string = json.dumps(sorted_params, sort_keys=True)
    param_hash = hashlib.md5(param_string.encode()).hexdigest()[:8]
    return f"{prefix}:{param_hash}"


def normalize_answer_text(value: str) -> str:
    """Normalize answer text for tolerant comparisons across casing/articles/punctuation."""
    if not value:
        return ""
    normalized = value.strip().lower()
    normalized = re.sub(r'^\s*(a|an|the)\s+', '', normalized)
    normalized = re.sub(r'[^\w\s]', '', normalized)
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized


def normalize_question_text(value: str) -> str:
    """Normalize question text so duplicate wording can be detected reliably."""
    if not value:
        return ""
    normalized = value.strip().lower()
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized


def ensure_correct_option_present(correct_answer: str, answer_options):
    """Guarantee the canonical correct answer appears in options at least once."""
    options = list(answer_options or [])
    if not correct_answer:
        return options

    if any(normalize_answer_text(option) == normalize_answer_text(correct_answer) for option in options):
        return options

    if len(options) >= 4:
        options[-1] = correct_answer
    else:
        options.append(correct_answer)
    return options


def pick_random_questions(queryset, count: int, enforce_unique_text: bool = False):
    """
    Select random questions without using DB-level random sort.

    This avoids expensive `ORDER BY RANDOM()` scans and keeps quiz start snappy.
    """
    candidate_ids: List[int] = []

    if enforce_unique_text:
        seen_question_texts = set()
        for row in queryset.values('id', 'question_text'):
            normalized_text = normalize_question_text(row['question_text'])
            if normalized_text in seen_question_texts:
                continue
            seen_question_texts.add(normalized_text)
            candidate_ids.append(row['id'])
    else:
        candidate_ids = list(queryset.values_list('id', flat=True))

    if not candidate_ids:
        return []

    if len(candidate_ids) <= count:
        selected_ids = candidate_ids
    else:
        selected_ids = random.sample(candidate_ids, count)

    selected_questions = Question.objects.filter(id__in=selected_ids).select_related('category', 'difficulty')
    questions_by_id = {q.id: q for q in selected_questions}
    return [questions_by_id[qid] for qid in selected_ids if qid in questions_by_id]


def get_session_questions_queryset(quiz_session: QuizSession) -> Iterable[QuizSessionQuestion]:
    """Load session questions with joins to avoid N+1 DB queries."""
    return quiz_session.session_questions.select_related(
        'question',
        'question__category',
        'question__difficulty',
    ).all()

def get_questions_from_cache_or_db(category_id=None, difficulty=None, count=10):
    """Get questions from cache or database with Redis caching"""
    allowed_categories = sorted(get_allowed_category_names())

    # Generate cache key
    cache_key = generate_cache_key(
        "questions", 
        category_id=category_id, 
        difficulty=difficulty, 
        count=count,
        allowed_categories=allowed_categories,
    )
    
    # Try to get from cache first
    cached_data = cache_get(cache_key)
    if cached_data:
        logger.info(f"Cache HIT for questions: {cache_key}")
        return cached_data
    
    logger.info(f"Cache MISS for questions: {cache_key}")
    
    # Cache miss - fetch from database
    queryset = Question.objects.filter(
        is_seeded=True,
        category__name__in=allowed_categories,
    )
    
    if category_id:
        if not is_allowed_level1_category_id(category_id):
            return None
        queryset = queryset.filter(category__id=category_id)
    
    if difficulty:
        difficulty_values = resolve_difficulty_filter_values(difficulty)
        if not difficulty_values:
            return None  # Invalid difficulty
        queryset = queryset.filter(difficulty__label__in=difficulty_values)
    
    questions = pick_random_questions(queryset, count=count, enforce_unique_text=True)
    serializer = QuestionSerializer(questions, many=True)
    # Convert ReturnList to regular list for JSON serialization
    data = list(serializer.data)

    # Ensure the canonical correct answer exists in options before shuffle.
    questions_by_id = {question.id: question for question in questions}
    
    # Shuffle options for each question
    for q in data:
        question = questions_by_id.get(q.get('id'))
        options = ensure_correct_option_present(
            question.correct_answer if question else None,
            q.get('answer_options')
        )
        random.shuffle(options)
        q['answer_options'] = options
    
    # Cache the result
    cache_set(cache_key, data, CACHE_TIMEOUT_QUESTIONS)
    logger.info(f"Cached questions: {cache_key}")
    
    return data

@api_view(['POST'])
@permission_classes([AllowAny])
def save_quiz_session_view(request):
    """API endpoint for saving a completed quiz session."""
    serializer = QuizSessionSaveSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        quiz_session = serializer.save()
        return Response(
            {
                'message': 'Quiz session saved successfully.',
                'id': quiz_session.id,
            },
            status=status.HTTP_201_CREATED,
        )
    logger.error(f"save_quiz_session_view: Serializer errors: {serializer.errors}") 
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def fetch_seeded_questions_view(request):
    """API endpoint for fetching seeded questions with Redis caching."""
    category_id = request.query_params.get('category')
    difficulty = request.query_params.get('difficulty')
    count_param = request.query_params.get('_limit', 10)

    # Validate category_id
    if category_id:
        try:
            category_id = int(category_id)
        except ValueError:
            return Response({
                'error': 'Invalid category ID.', 
                'code': 'invalid_category'
            }, status=status.HTTP_400_BAD_REQUEST)
        if not is_allowed_level1_category_id(category_id):
            return Response({
                'error': 'Category is outside current Level 1 scope.',
                'code': 'invalid_category'
            }, status=status.HTTP_400_BAD_REQUEST)

    # Validate count
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

    # Get questions from cache or database
    data = get_questions_from_cache_or_db(
        category_id=category_id,
        difficulty=difficulty,
        count=count
    )
    
    if data is None:
        return Response({
            'error': f'Difficulty level "{difficulty}" not found.', 
            'code': 'invalid_difficulty'
        }, status=status.HTTP_400_BAD_REQUEST)

    if len(data) < count:
        return Response({
            'error': 'Insufficient unique questions available for the selected criteria.',
            'code': 'insufficient_questions',
            'available': len(data),
            'requested': count,
        }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def validate_answer_view(request, questionId):
    """Validate a selected answer without exposing the canonical correct answer."""
    serializer = AnswerValidationSerializer(data=request.data)
    if not serializer.is_valid():
        error_detail = next(iter(serializer.errors.values()))[0] if serializer.errors else 'Invalid request data'
        return Response({'error': error_detail, 'code': 'validation_error'}, status=status.HTTP_400_BAD_REQUEST)

    question = get_object_or_404(Question, id=questionId)
    selected_answer = serializer.validated_data['selected_answer']
    is_correct = normalize_answer_text(selected_answer) == normalize_answer_text(question.correct_answer)

    return Response({'is_correct': is_correct}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def fetch_categories_view(request):
    """API endpoint for fetching quiz categories with Redis caching."""
    cache_key = "categories:with_questions"
    
    # Try cache first
    cached_data = cache_get(cache_key)
    if cached_data:
        logger.info("Cache HIT for categories")
        return Response(cached_data, status=status.HTTP_200_OK)
    
    logger.info("Cache MISS for categories")
    
    # Cache miss - fetch from database
    categories = Category.objects.annotate(
        question_count=Count('questions', filter=Q(questions__is_seeded=True))
    ).filter(
        question_count__gt=0,
        name__in=get_allowed_category_names(),
    ).order_by('id')
    
    serializer = CategorySerializer(categories, many=True)
    # Convert ReturnList to regular list for JSON serialization
    data = list(serializer.data)
    
    # Cache the result
    cache_set(cache_key, data, CACHE_TIMEOUT_CATEGORIES)
    logger.info("Cached categories data")
    
    return Response(data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def start_quiz_session_view(request):
    """API endpoint for starting a new quiz session (solo or group)."""
    serializer = QuizSessionStartSerializer(data=request.data)
    if not serializer.is_valid():
        error_detail = next(iter(serializer.errors.values()))[0] if serializer.errors else 'Invalid request data'
        return Response({'error': error_detail, 'code': 'validation_error'}, status=status.HTTP_400_BAD_REQUEST)

    category_id = serializer.validated_data.get('category_id')
    difficulty_id = serializer.validated_data.get('difficulty_id')
    difficulty_label = serializer.validated_data.get('difficulty')
    count = serializer.validated_data['count']
    mode = serializer.validated_data['mode']
    players_data = serializer.validated_data.get('players', [])

    queryset = Question.objects.filter(
        is_seeded=True,
        category__name__in=get_allowed_category_names(),
    )
    if category_id:
        if not is_allowed_level1_category_id(category_id):
            return Response({'error': 'Invalid category for Level 1.', 'code': 'invalid_category'}, status=status.HTTP_400_BAD_REQUEST)
        queryset = queryset.filter(category_id=category_id)

    difficulty_values = None
    if difficulty_label:
        difficulty_values = resolve_difficulty_filter_values(difficulty_label)
        if not difficulty_values:
            return Response({'error': 'Invalid difficulty for Level 1.', 'code': 'invalid_difficulty'}, status=status.HTTP_400_BAD_REQUEST)

    if difficulty_id is not None:
        try:
            difficulty_obj = DifficultyLevel.objects.get(id=difficulty_id)
        except DifficultyLevel.DoesNotExist:
            return Response({'error': 'Difficulty not found.', 'code': 'invalid_difficulty'}, status=status.HTTP_400_BAD_REQUEST)

        difficulty_values = resolve_difficulty_filter_values(difficulty_obj.label)
        if not difficulty_values:
            return Response({'error': 'Invalid difficulty for Level 1.', 'code': 'invalid_difficulty'}, status=status.HTTP_400_BAD_REQUEST)

    if difficulty_values:
        queryset = queryset.filter(difficulty__label__in=difficulty_values)

    available_questions = queryset.count()
    if category_id and available_questions == 0:
        return Response({'error': 'No questions available for the selected category.', 'code': 'invalid_category'}, status=status.HTTP_400_BAD_REQUEST)

    if available_questions < count:
        return Response({'error': 'Insufficient questions available for the selected criteria.', 'code': 'insufficient_questions'}, status=status.HTTP_400_BAD_REQUEST)

    quiz_session = QuizSession.objects.create(
        score=0,
        user=request.user if request.user.is_authenticated else None,
        is_group_session=(mode == 'group')
    )

    if mode == 'group' and players_data:
        GroupPlayer.objects.bulk_create([
            GroupPlayer(quiz_session=quiz_session, name=name)
            for name in players_data
        ])

    selected_questions = pick_random_questions(queryset, count=count, enforce_unique_text=True)
    QuizSessionQuestion.objects.bulk_create([
        QuizSessionQuestion(quiz_session=quiz_session, question=q)
        for q in selected_questions
    ])

    session_serializer = QuizSessionSerializer(quiz_session)
    response_data = session_serializer.data
    response_data['totalQuestions'] = count
    return Response(response_data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_quiz_session_view(request, sessionId, category=None, difficulty=None):
    """API endpoint for retrieving quiz session details."""
    quiz_session = get_object_or_404(QuizSession, id=sessionId)
    if quiz_session.user and quiz_session.user != request.user:
        return Response({'error': 'Not authorized to access this session.', 'code': 'permission_denied'}, status=status.HTTP_403_FORBIDDEN)

    questions = []
    for sq in get_session_questions_queryset(quiz_session):
        options = ensure_correct_option_present(sq.question.correct_answer, sq.question.answer_options)
        random.shuffle(options)
        question_data = {
            'id': sq.question.id,
            'text': sq.question.question_text,
            'options': options,
            'selected_answer': sq.selected_answer,
            'correct_answer': sq.question.correct_answer,
            'category': sq.question.category.name,
            'difficulty': sq.question.difficulty.label,
            'is_correct': sq.is_correct if sq.answered_at else None,
            'answered_at': sq.answered_at,
        }
        questions.append(question_data)

    if questions:
        session_category = questions[0]['category']
        session_difficulty = questions[0]['difficulty']
    else:
        session_category, session_difficulty = None, None
    if category is None:
        category = session_category
    if difficulty is None:
        difficulty = session_difficulty

    group_players_data = [
        {
            'id': player.id,
            'name': player.name,
            'score': player.score,
            'errors': player.errors,
            'answers': player.answers,
            'correct_answers': player.correct_answers
        }
        for player in quiz_session.group_players.all()
    ]

    response_data = {
        'session_id': quiz_session.id,
        'category': category,
        'difficulty': difficulty,
        'score': quiz_session.score,
        'started_at': quiz_session.started_at,
        'questions': questions,
        'is_completed': quiz_session.is_completed,
        'is_guest': not request.user.is_authenticated,
        'is_group_session': quiz_session.is_group_session,
        'group_players': group_players_data
    }
    return Response(response_data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def submit_answer_view(request, sessionId):
    """API endpoint for submitting an answer to a question in a quiz session."""
    quiz_session = get_object_or_404(QuizSession, id=sessionId)
    if quiz_session.user and quiz_session.user != request.user:
        return Response({'error': 'Not authorized to access this session.', 'code': 'permission_denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = AnswerSubmissionSerializer(data=request.data)
    if not serializer.is_valid():
        error_detail = next(iter(serializer.errors.values()))[0] if serializer.errors else 'Invalid request data'
        return Response({'error': error_detail, 'code': 'validation_error'}, status=status.HTTP_400_BAD_REQUEST)

    question_id = serializer.validated_data['question_id']
    selected_answer = serializer.validated_data['selected_answer']
    player_id = serializer.validated_data.get('player_id')

    if quiz_session.is_group_session and player_id:
        try:
            player = GroupPlayer.objects.get(id=player_id, quiz_session=quiz_session)
            all_questions = list(quiz_session.session_questions.order_by('id'))
            question_index = -1
            for idx, sq in enumerate(all_questions):
                if sq.question.id == question_id:
                    question_index = idx
                    break
            if question_index >= 0:
                if not player.answers:
                    player.answers = []
                while len(player.answers) <= question_index:
                    player.answers.append("")
                player.answers[question_index] = selected_answer
                player.save()
        except GroupPlayer.DoesNotExist:
            logger.warning(f"Player {player_id} not found in session {sessionId}")

    try:
        session_question = QuizSessionQuestion.objects.get(quiz_session=quiz_session, question__id=question_id)
    except QuizSessionQuestion.DoesNotExist:
        return Response({'error': 'Question not found in this session.', 'code': 'question_not_found'}, status=status.HTTP_404_NOT_FOUND)

    if session_question.answered_at is not None:
        return Response({'error': 'Question has already been answered.', 'code': 'already_answered'}, status=status.HTTP_400_BAD_REQUEST)

    session_question.selected_answer = selected_answer
    session_question.answered_at = timezone.now()
    session_question.is_correct = (
        normalize_answer_text(selected_answer)
        == normalize_answer_text(session_question.question.correct_answer)
    )
    if session_question.is_correct:
        quiz_session.score += 1
        quiz_session.save()
    session_question.save()

    return Response({'message': 'Answer submitted successfully.', 'is_correct': session_question.is_correct, 'updated_score': quiz_session.score}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_quiz_session_results_view(request, sessionId):
    """API endpoint for retrieving quiz session results with Redis caching."""
    quiz_session = get_object_or_404(QuizSession, id=sessionId)
    if quiz_session.user and quiz_session.user != request.user:
        return Response({'error': 'Not authorized to access this session.', 'code': 'permission_denied'}, status=status.HTTP_403_FORBIDDEN)

    # Only cache completed sessions (immutable data)
    if quiz_session.is_completed:
        cache_key = f"session_results:{sessionId}"
        
        # Try cache first
        cached_data = cache_get(cache_key)
        if cached_data:
            logger.info(f"Cache HIT for session results: {sessionId}")
            # Update is_guest field for current request context
            cached_data['is_guest'] = not request.user.is_authenticated
            return Response(cached_data, status=status.HTTP_200_OK)
        
        logger.info(f"Cache MISS for session results: {sessionId}")

    # Cache miss or incomplete session - process from database
    questions_data = []
    total_questions = 0
    correct_answers = 0
    for sq in get_session_questions_queryset(quiz_session):
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
        # Prefer persisted completion time; fall back to current time if session has no completion stamp.
        'completed_at': quiz_session.completed_at or timezone.now(),
        'questions': questions_data,
        'is_guest': not request.user.is_authenticated
    }
    
    # Cache completed sessions only (immutable data)
    if quiz_session.is_completed:
        cache_set(cache_key, response_data, CACHE_TIMEOUT_SESSION_RESULTS)
        logger.info(f"Cached session results: {sessionId}")
    
    return Response(response_data, status=status.HTTP_200_OK)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_quiz_session_view(request, sessionId):
    """API endpoint for deleting a quiz session."""
    quiz_session = get_object_or_404(QuizSession, id=sessionId)
    if quiz_session.user != request.user:
        return Response({'error': 'Not authorized to delete this session.', 'code': 'permission_denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Invalidate caches before deletion
    from .cache_utils import invalidate_session_cache, invalidate_all_user_cache
    invalidate_session_cache(sessionId)  # Remove session details cache
    
    # Invalidate session results cache
    results_cache_key = f"session_results:{sessionId}"
    cache_delete(results_cache_key)
    
    # Invalidate user caches
    invalidate_all_user_cache(request.user.id)
    
    # Delete the session
    QuizSessionQuestion.objects.filter(quiz_session=quiz_session).delete()
    if quiz_session.is_group_session:
        GroupPlayer.objects.filter(quiz_session=quiz_session).delete()
    quiz_session.delete()
    
    logger.info(f"delete_quiz_session_view: Quiz session {sessionId} deleted by user {request.user.id}")
    return Response({'message': 'Quiz session deleted successfully.'}, status=status.HTTP_200_OK)