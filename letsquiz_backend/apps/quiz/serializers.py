from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.auth.password_validation import validate_password
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str

import logging
from rest_framework import serializers
from rest_framework.exceptions import ValidationError, AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from letsquiz_backend.apps.quiz.models import (
    Question,
    Category,
    DifficultyLevel,
    QuizSession,
    QuizSessionQuestion
)

User = get_user_model()


User = get_user_model()
logger = logging.getLogger(__name__)

class UserSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ('id', 'email', 'is_premium', 'password')
        read_only_fields = ('id', 'is_premium')

    def validate_password(self, value):
        if len(value) < 4:
            raise serializers.ValidationError("Password must be at least 4 characters long.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def to_representation(self, instance):
        """
        """
        logger.info(f"[UserSerializer] Serializing user instance: {instance.id}, {instance.email}")
        data = super().to_representation(instance)
        logger.info(f"[UserSerializer] Serialized data: {data}")
        return data

    def create(self, validated_data):
        email = validated_data.get('email')
        username = email.split('@')[0]
        password = validated_data.get('password')
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'is_premium')
        read_only_fields = ('id', 'username', 'email', 'is_premium')

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email does not exist.")
        return value

class SetNewPasswordSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField()

    def validate(self, data):
        try:
            uid = force_str(urlsafe_base64_decode(data['uidb64']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise ValidationError('Invalid token or user ID.')

        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, data['token']):
            raise ValidationError('Invalid token or user ID.')

        # Validate the new password using Django's validators
        try:
            validate_password(data['new_password'], user)
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': list(e.messages)})

        data['user'] = user # Add the user object to validated data
        return data

class AccountVerificationSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()

    def validate(self, data):
        try:
            uid = force_str(urlsafe_base64_decode(data['uidb64']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise ValidationError('Invalid token or user ID.')

        token_generator = PasswordResetTokenGenerator() # Can reuse the same token generator
        if not token_generator.check_token(user, data['token']):
            raise ValidationError('Invalid token or user ID.')

        if user.is_active:
             raise ValidationError('Account is already active.')

        data['user'] = user # Add the user object to validated data
        return data

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name')

class DifficultyLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = DifficultyLevel
        fields = ('id', 'label')

class QuestionSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    difficulty = DifficultyLevelSerializer(read_only=True)

    class Meta:
        model = Question
        fields = ('id', 'category', 'difficulty', 'question_text', 'correct_answer', 'answer_options', 'metadata_json')

class QuizSessionStartSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(required=False, allow_null=True)
    difficulty_id = serializers.IntegerField(required=False, allow_null=True)
    count = serializers.IntegerField(min_value=1)
    mode = serializers.ChoiceField(choices=['solo', 'group'])

    def validate_category_id(self, value):
        if value is not None:
            try:
                Category.objects.get(id=value)
            except Category.DoesNotExist:
                raise ValidationError("Invalid category ID.")
            return value

    def validate_difficulty_id(self, value):
        if value is not None:
            try:
                DifficultyLevel.objects.get(id=value)
            except DifficultyLevel.DoesNotExist:
                raise ValidationError("Invalid difficulty ID.")
            return value

class QuizSessionQuestionSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)

    class Meta:
        model = QuizSessionQuestion
        fields = ('id', 'question', 'selected_answer', 'is_correct', 'answered_at')

class QuizSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    session_questions = QuizSessionQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = QuizSession
        fields = ('id', 'user', 'started_at', 'completed_at', 'score', 'session_questions')

class AnswerSubmissionSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_answer = serializers.CharField(max_length=255)

    def validate_question_id(self, value):
        try:
            Question.objects.get(id=value)
        except Question.DoesNotExist:
            raise ValidationError("Invalid question ID.")
        return value

class UserStatsSerializer(serializers.Serializer):
    overall_stats = serializers.DictField()
    category_stats = serializers.DictField()
    difficulty_stats = serializers.DictField(required=False)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            raise ValidationError({
                'error': 'Must include "email" and "password".',
                'code': 'missing_fields'
            })

        user = None
        try:
            user = authenticate(request=self.context.get('request'), username=email, password=password)

            if user:
                if not user.is_active:
                    raise AuthenticationFailed('User account is disabled.', code='account_disabled')

                data['user'] = user
                return data
            else:
                raise AuthenticationFailed('Invalid credentials.', code='invalid_credentials')

        except AuthenticationFailed as e:
            raise AuthenticationFailed(e.detail, code=e.code if hasattr(e, 'code') else 'authentication_failed')

        except Exception as e:
            raise AuthenticationFailed('An unexpected error occurred during authentication.', code='server_error')

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data
        
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        return token