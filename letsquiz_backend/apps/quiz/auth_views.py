import logging
from django.contrib.auth import get_user_model
from django.core.cache import cache
import uuid

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import AuthenticationFailed

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    UserSerializer,
    AccountVerificationSerializer,
    LoginSerializer,
  
)

logger = logging.getLogger(__name__)
User = get_user_model()
User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    """API endpoint for user registration."""
    logger.info(f"Signup attempt with data: {request.data}")
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        logger.info("Signup serializer is valid.")
        try:
            user = serializer.save()
            user.is_active = True
            user.save()
            logger.info(f"User created and activated: {user.username}")
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error saving user during signup: {e}", exc_info=True)
            return Response({
                "error": "An error occurred during signup.",
                "code": "server_error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        logger.error(f"Signup serializer errors: {serializer.errors}")
        # Convert DRF validation errors to our standard format
        if 'password' in serializer.errors:
            return Response({
                "error": serializer.errors['password'][0],
                "code": "invalid_password"
            }, status=status.HTTP_400_BAD_REQUEST)
        elif 'email' in serializer.errors:
            return Response({
                "error": serializer.errors['email'][0],
                "code": "invalid_email"
            }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({
                "error": "Invalid signup data provided.",
                "code": "validation_error"
            }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    API endpoint for user login.
    
    Validates user credentials and returns authentication tokens.
    
    Request body:
    {
        "email": "user@example.com",
        "password": "userpassword"
    }
    
    Returns:
    - tokens (refresh and access)
    - user details
    """
    logger.info(f"Login attempt with data: {request.data}")
    
    serializer = LoginSerializer(data=request.data, context={'request': request})
    logger.debug(f"Login attempt with data: {request.data}")

    try:
        if serializer.is_valid(raise_exception=False):
            user = serializer.validated_data['user']
            logger.info(f"LoginSerializer validated successfully for user: {user.email}")
            
            refresh = RefreshToken.for_user(user)
            
            # Serialize user data using UserSerializer
            user_data = UserSerializer(user).data
            logger.info(f"[Login] Serialized user data: {user_data}")
            
            response_data = {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': user_data
            }
            logger.info(f"[Login] Full response data: {response_data}")
            
            logger.info(f"User logged in successfully: {user.email}. Tokens generated.")
            return Response(response_data, status=status.HTTP_200_OK)
        else:
           
            logger.error(f"Login validation failed: {serializer.errors}")
            # Ensure the error response structure is consistent
            error_detail = serializer.errors.get('error', 'Invalid credentials')
            error_code = serializer.errors.get('code', 'authentication_failed')
            if isinstance(error_detail, list): 
                error_detail = error_detail[0]
            
            # Check for specific error details from LoginSerializer's custom validation
            if 'non_field_errors' in serializer.errors:
                 error_detail = serializer.errors['non_field_errors'][0]
                 if "Must include" in str(error_detail): 
                     error_code = 'missing_fields'
                 elif "Invalid credentials" in str(error_detail): 
                     error_code = 'invalid_credentials'
                 elif "User account is disabled" in str(error_detail):
                     error_code = 'account_disabled'


            raise AuthenticationFailed(
                detail=str(error_detail),
                code=error_code
            )
            
    except AuthenticationFailed as e:
        logger.error(f"Authentication failed during login for {request.data.get('email')}: {str(e)} - Code: {e.code if hasattr(e, 'code') else 'N/A'}")
        # Ensure the error detail is a string and included in the response body
        error_message = str(e.detail) if hasattr(e, 'detail') else 'Authentication failed.'
        error_code = e.code if hasattr(e, 'code') else 'authentication_failed'
        logger.error(f"Authentication failed during login for {request.data.get('email')}: {error_message} - Code: {error_code}")
        raise AuthenticationFailed(
            detail=error_message,
            code=error_code
        )
    except Exception as e:
        logger.error(f"Unexpected error during login for {request.data.get('email')}: {str(e)}", exc_info=True)
        return Response({
            'detail': 'An unexpected error occurred during login.',
            'code': 'server_error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def account_verification_view(request):
    """API endpoint for verifying user account."""
 

    serializer = AccountVerificationSerializer(data=request.data)
    if serializer.is_valid():
        try:
            token = serializer.validated_data['token']
            user = User.objects.get(verification_token=token)

            if not user.is_active:
                user.is_active = True
                user.verification_token = None
                user.save()

                return Response({
                    'detail': 'Account successfully verified.'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'detail': 'Account is already verified.'
                }, status=status.HTTP_400_BAD_REQUEST)

        except User.DoesNotExist:
            return Response({
                'detail': 'Invalid verification token.'
            }, status=status.HTTP_400_BAD_REQUEST)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
@permission_classes([AllowAny])
def create_guest_session(request):
    """
    Create a new guest session with a unique session ID.
    
    Returns:
    - session_id: A unique identifier for the guest session
    """
    session_id = str(uuid.uuid4())
    
    # Store session data in cache with a 30-day expiration
    session_data = {
        'progress': {},
        'completed_quizzes': [],
        'total_score': 0
    }
    cache_key = f'guest_session:{session_id}'
    cache.set(cache_key, session_data, timeout=60*60*24*30)
    
    logger.info(f"Created new guest session: {session_id}")
    
    return Response({
        'session_id': session_id
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_guest_session(request, session_id):
    """
    Retrieve guest session data by session ID.
    
    Args:
    - session_id: The unique identifier for the guest session
    
    Returns:
    - Session data or 404 if not found
    """
    cache_key = f'guest_session:{session_id}'
    session_data = cache.get(cache_key)
    
    if session_data is None:
        return Response({
            'detail': 'Guest session not found.'
        }, status=status.HTTP_404_NOT_FOUND)
    
    return Response(session_data, status=status.HTTP_200_OK)

@api_view(['POST'])
def logout_view(request):
    """
    API endpoint for user logout.

    Blacklists the refresh token provided in the request.
    """
    try:
        refresh_token = request.data["refresh_token"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)