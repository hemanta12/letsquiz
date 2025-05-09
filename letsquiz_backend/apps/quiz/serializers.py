from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.password_validation import validate_password

from letsquiz_backend.apps.quiz.models import Question, Category, DifficultyLevel, QuizSession, QuizSessionQuestion
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer # Import the base serializer


User = get_user_model()

from django.contrib.auth import authenticate # Import authenticate
from rest_framework import serializers
from rest_framework.exceptions import ValidationError, AuthenticationFailed # Import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.password_validation import validate_password

from letsquiz_backend.apps.quiz.models import Question, Category, DifficultyLevel, QuizSession, QuizSessionQuestion
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer # Import the base serializer


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'is_premium', 'password')
        read_only_fields = ('id', 'is_premium') # is_premium will be set internally

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''), # Email might be optional depending on requirements
            password=validated_data['password'],
        )
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'is_premium') # Include fields for user profile
        read_only_fields = ('id', 'username', 'email', 'is_premium') # All fields should be read-only for a profile view

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
        fields = ('id', 'category', 'difficulty', 'question_text', 'correct_answer', 'metadata_json')
        # Note: 'correct_answer' is included here for simplicity in seeding/fetching seeded questions.
        # For actual quiz sessions, you would likely use a different serializer that excludes the correct answer.

class QuizSessionStartSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(required=False, allow_null=True)
    difficulty_id = serializers.IntegerField(required=False, allow_null=True)
    count = serializers.IntegerField(min_value=1)
    mode = serializers.ChoiceField(choices=['solo', 'group']) # Define possible modes

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

    # Add validation for 'count' and 'mode' if needed beyond min_value and choices

class QuizSessionQuestionSerializer(serializers.ModelSerializer):
    # Use the existing QuestionSerializer to represent the question details
    question = QuestionSerializer(read_only=True)

    class Meta:
        model = QuizSessionQuestion
        fields = ('id', 'question', 'selected_answer', 'is_correct', 'answered_at')

class QuizSessionSerializer(serializers.ModelSerializer):
    # Use the existing UserSerializer to represent the user details
    user = UserSerializer(read_only=True)
    # Use the QuizSessionQuestionSerializer to represent questions in the session
    session_questions = QuizSessionQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = QuizSession
        fields = ('id', 'user', 'started_at', 'completed_at', 'score', 'session_questions')

class AnswerSubmissionSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_answer = serializers.CharField(max_length=255) # Assuming answer is a string

    def validate_question_id(self, value):
        try:
            Question.objects.get(id=value)
        except Question.DoesNotExist:
            raise ValidationError("Invalid question ID.")
        return value

class UserStatsSerializer(serializers.Serializer):
    total_quizzes = serializers.IntegerField()
    total_questions_answered = serializers.IntegerField()
    total_correct_answers = serializers.IntegerField()
    overall_accuracy = serializers.FloatField() # Represent accuracy as a float

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        if email and password:
            user = authenticate(request=self.context.get('request'), username=email, password=password)
            if user:
                if not user.is_active:
                    raise AuthenticationFailed('Account disabled.')
                data['user'] = user
            else:
                raise AuthenticationFailed('Invalid credentials.')
        else:
            raise AuthenticationFailed('Must include "email" and "password".')

        return data