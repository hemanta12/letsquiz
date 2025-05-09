import logging # Moved import to top

logger = logging.getLogger(__name__) # Moved logger definition to top

from django.shortcuts import render, get_object_or_404
from django.core.mail import send_mail
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.urls import reverse
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Sum, F
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

from letsquiz_backend.apps.quiz.serializers import (
    UserSerializer,
    PasswordResetRequestSerializer,
    SetNewPasswordSerializer,
    AccountVerificationSerializer,
    QuestionSerializer,
    QuizSessionStartSerializer,
    QuizSessionSerializer,
    AnswerSubmissionSerializer,
    UserStatsSerializer,
)
from .serializers import UserProfileSerializer
from letsquiz_backend.apps.quiz.models import (
    Question,
    Category,
    DifficultyLevel,
    QuizSession,
    QuizSessionQuestion,
)

# Get the custom user model
User = get_user_model()

# Create your views here.

@api_view(['POST'])
@permission_classes([AllowAny]) # Allow unauthenticated access for signup

def signup_view(request):
    """
    API endpoint for user registration.
    """
    logger.info(f"Signup attempt with data: {request.data}")
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        logger.info("Signup serializer is valid.")
        try:
            user = serializer.save()
            user.is_active = True # Temporarily activate user for debugging
            user.save()
            logger.info(f"User created and activated: {user.username}")
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error saving user during signup: {e}", exc_info=True)
            return Response({"detail": "An error occurred during signup."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        logger.error(f"Signup serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def password_reset_request_view(request):
    """
    API endpoint for requesting a password reset email.
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        # Ensure the user exists before proceeding
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return a success response even if the user doesn't exist to prevent email enumeration
            return Response({'detail': 'If a user with that email exists, a password reset email has been sent.'}, status=status.HTTP_200_OK)

        # Generate token and UID
        token_generator = PasswordResetTokenGenerator()
        token = token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Construct the password reset URL (assuming a frontend route for password reset confirmation)
        # You might need to adjust the domain and frontend URL structure
        # For now, let's construct a backend URL that the frontend can use to build its link
        reset_url = reverse('password_reset_confirm', kwargs={'uidb64': uid, 'token': token})
        # In a real application, you would construct the full frontend URL here, e.g.:
        # frontend_reset_url = f"https://yourfrontend.com/reset-password/{uid}/{token}/"

        # Send email
        subject = 'Password Reset Request for LetsQuiz'
        message = f'Hi {user.username},\n\nPlease use the following link to reset your password: {settings.SITE_URL}{reset_url}\n\nIf you did not request a password reset, please ignore this email.'
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = [email]

        send_mail(subject, message, from_email, recipient_list)

        return Response({'detail': 'If a user with that email exists, a password reset email has been sent.'}, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def set_new_password_view(request):
    """
    API endpoint for setting a new password using a reset token.
    """
    serializer = SetNewPasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        new_password = serializer.validated_data['new_password']

        user.set_password(new_password)
        user.save()

        return Response({'detail': 'Password reset successful.'}, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def account_verification_view(request):
    """
    API endpoint for verifying user account using a token.
    """
    serializer = AccountVerificationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']

        user.is_active = True
        user.save()

        return Response({'detail': 'Account successfully activated.'}, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from rest_framework.views import APIView # Import APIView

class UserProfileView(APIView):
    """
    API endpoint for fetching user profile data by ID.
    """
    permission_classes = [IsAuthenticated] # Requires authentication

    def get(self, request, userId):
        """
        Handles GET requests to fetch user profile data.
        """
        user = get_object_or_404(User, id=userId)
        # Ensure the authenticated user is requesting their own profile or has permission
        # For now, let's allow fetching any user's profile if authenticated
        # if request.user.id != userId:
        #     return Response({'detail': 'You do not have permission to view this profile.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET']) # This view is typically accessed via a GET request from the email link
def password_reset_confirm_view(request, uidb64, token):
    """
    API endpoint to confirm the password reset token and UID.
    This view is typically hit by the link in the password reset email.
    It validates the token and UID and indicates if they are valid.
    The actual password setting happens via the set-new-password endpoint.
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    token_generator = PasswordResetTokenGenerator()
    if user is not None and token_generator.check_token(user, token):
        # Token is valid, indicate success. Frontend can then show the password reset form.
        return Response({'detail': 'Token is valid.'}, status=status.HTTP_200_OK)
    else:
        # Token is invalid
        return Response({'detail': 'Invalid token or user ID.'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated]) # Requires authentication
def fetch_seeded_questions_view(request):
    """
    API endpoint for fetching seeded questions, with optional filtering.
    Query parameters:
    - category (int): Filter by category ID.
    - difficulty (int): Filter by difficulty level ID.
    - count (int): Number of questions to return (default: 10).
    """
    queryset = Question.objects.filter(is_seeded=True)

    category_id = request.query_params.get('category')
    difficulty_id = request.query_params.get('difficulty')
    count_param = request.query_params.get('count', 10) # Default count is 10

    if category_id:
        try:
            category_id = int(category_id)
            queryset = queryset.filter(category__id=category_id)
        except ValueError:
            return Response({'detail': 'Invalid category ID.'}, status=status.HTTP_400_BAD_REQUEST)

    if difficulty_id:
        try:
            difficulty_id = int(difficulty_id)
            queryset = queryset.filter(difficulty__id=difficulty_id)
        except ValueError:
            return Response({'detail': 'Invalid difficulty ID.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        count = int(count_param)
        if count <= 0:
             return Response({'detail': 'Count must be a positive integer.'}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError:
        return Response({'detail': 'Invalid count parameter.'}, status=status.HTTP_400_BAD_REQUEST)

    # Order randomly and limit the count
    # Note: order_by('?') can be inefficient on large databases
    # For production, consider alternative random ordering strategies
    questions = queryset.order_by('?')[:count]

    serializer = QuestionSerializer(questions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # Requires authentication
def start_quiz_session_view(request):
    """
    API endpoint for starting a new quiz session (solo or group).
    """
    serializer = QuizSessionStartSerializer(data=request.data)
    if serializer.is_valid():
        category_id = serializer.validated_data.get('category_id')
        difficulty_id = serializer.validated_data.get('difficulty_id')
        count = serializer.validated_data['count']
        mode = serializer.validated_data['mode'] # 'solo' or 'group'

        # Create a new QuizSession
        quiz_session = QuizSession.objects.create(
            user=request.user, # Link the session to the authenticated user
            # You might add a 'mode' field to QuizSession model later if needed
        )

        # Select questions based on parameters
        queryset = Question.objects.filter(is_seeded=True) # Start with seeded questions

        if category_id:
            queryset = queryset.filter(category__id=category_id)

        if difficulty_id:
            queryset = queryset.filter(difficulty__id=difficulty_id)

        # Ensure there are enough questions
        if queryset.count() < count:
            return Response({'detail': 'Insufficient questions available for the selected criteria.'}, status=status.HTTP_400_BAD_REQUEST)

        # Select 'count' random questions
        selected_questions = list(queryset.order_by('?')[:count])
        # Alternatively, if order_by('?') is slow, fetch all matching IDs and select randomly:
        # question_ids = list(queryset.values_list('id', flat=True))
        # selected_ids = random.sample(question_ids, count)
        # selected_questions = Question.objects.filter(id__in=selected_ids)


        # Create QuizSessionQuestion entries for the selected questions
        quiz_session_questions = [
            QuizSessionQuestion(quiz_session=quiz_session, question=q)
            for q in selected_questions
        ]
        QuizSessionQuestion.objects.bulk_create(quiz_session_questions)

        # You might want to return a serializer for the QuizSession here
        # For now, returning a simple success message with the session ID
        return Response({'detail': 'Quiz session started successfully.', 'session_id': quiz_session.id}, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated]) # Requires authentication
def get_quiz_session_view(request, sessionId):
    """
    API endpoint for getting information about a specific quiz session.
    """
    # Retrieve the session, ensuring it belongs to the authenticated user
    quiz_session = get_object_or_404(QuizSession, id=sessionId, user=request.user)

    serializer = QuizSessionSerializer(quiz_session)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # Requires authentication
def submit_answer_view(request, sessionId):
    """
    API endpoint for submitting an answer to a question in a quiz session.
    """
    # Retrieve the session, ensuring it belongs to the authenticated user
    quiz_session = get_object_or_404(QuizSession, id=sessionId, user=request.user)

    serializer = AnswerSubmissionSerializer(data=request.data)
    if serializer.is_valid():
        question_id = serializer.validated_data['question_id']
        selected_answer = serializer.validated_data['selected_answer']

        # Find the QuizSessionQuestion for this session and question
        try:
            session_question = QuizSessionQuestion.objects.get(
                quiz_session=quiz_session,
                question__id=question_id
            )
        except QuizSessionQuestion.DoesNotExist:
            return Response({'detail': 'Question not found in this session.'}, status=status.HTTP_404_NOT_FOUND)

        # Check if the question has already been answered
        if session_question.answered_at is not None:
            return Response({'detail': 'Question has already been answered.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark as answered and save the selected answer
        session_question.selected_answer = selected_answer
        session_question.answered_at = timezone.now()

        # Check if the answer is correct (case-insensitive comparison)
        session_question.is_correct = (selected_answer.lower() == session_question.question.correct_answer.lower())

        # Update the session score if the answer is correct
        if session_question.is_correct:
            quiz_session.score += 1
            quiz_session.save()

        session_question.save()

        return Response({
            'detail': 'Answer submitted successfully.',
            'is_correct': session_question.is_correct,
            'updated_score': quiz_session.score
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated]) # Requires authentication
def get_quiz_session_results_view(request, sessionId):
    """
    API endpoint for getting final results of a specific quiz session.
    """
    # Retrieve the session, ensuring it belongs to the authenticated user
    quiz_session = get_object_or_404(QuizSession, id=sessionId, user=request.user)

    # Check if the session is completed (e.g., all questions answered)
    total_questions = quiz_session.session_questions.count()
    answered_questions_count = quiz_session.session_questions.filter(answered_at__isnull=False).count()

    if answered_questions_count < total_questions:
        return Response({'detail': 'Quiz session is not yet completed.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = QuizSessionSerializer(quiz_session)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated]) # Requires authentication
def get_user_sessions_view(request, userId):
    """
    API endpoint for getting paginated quiz history for a specific user.
    """
    # Ensure the authenticated user is requesting their own sessions
    if request.user.id != userId:
        return Response({'detail': 'You do not have permission to view these sessions.'}, status=status.HTTP_403_FORBIDDEN)

    # Retrieve quiz sessions for the user, ordered by start time
    sessions = QuizSession.objects.filter(user=request.user).order_by('-started_at')

    # Implement pagination
    paginator = QuizSessionPagination()
    paginated_sessions = paginator.paginate_queryset(sessions, request)

    # Serialize the paginated data
    serializer = QuizSessionSerializer(paginated_sessions, many=True)

    # Return the paginated response
    return paginator.get_paginated_response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated]) # Requires authentication
def get_user_stats_view(request, userId):
    """
    API endpoint for getting aggregate statistics for a specific user.
    """
    # Ensure the authenticated user is requesting their own stats
    if request.user.id != userId:
        return Response({'detail': 'You do not have permission to view these stats.'}, status=status.HTTP_403_FORBIDDEN)

    # Calculate total quizzes
    total_quizzes = QuizSession.objects.filter(user=request.user).count()

    # Calculate total questions answered and total correct answers
    # We need to aggregate on QuizSessionQuestion for the user's sessions
    answered_questions_stats = QuizSessionQuestion.objects.filter(
        quiz_session__user=request.user,
        answered_at__isnull=False # Only count answered questions
    ).aggregate(
        total_answered=Count('id'),
        total_correct=Sum('is_correct') # Sum of boolean True (counts as 1)
    )

    total_questions_answered = answered_questions_stats.get('total_answered', 0)
    total_correct_answers = answered_questions_stats.get('total_correct', 0)

    # Calculate overall accuracy
    overall_accuracy = (total_correct_answers / total_questions_answered) if total_questions_answered > 0 else 0.0

    # Prepare the stats data
    stats_data = {
        'total_quizzes': total_quizzes,
        'total_questions_answered': total_questions_answered,
        'total_correct_answers': total_correct_answers,
        'overall_accuracy': round(overall_accuracy, 2) # Round accuracy to 2 decimal places
    }

    # Serialize the stats data
    serializer = UserStatsSerializer(stats_data)

    return Response(serializer.data, status=status.HTTP_200_OK)
