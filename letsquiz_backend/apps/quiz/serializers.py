from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.utils import timezone

from rest_framework import serializers
from rest_framework.exceptions import ValidationError, AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from letsquiz_backend.apps.quiz.models import (
    Question,
    Category,
    DifficultyLevel,
    QuizSession,
    QuizSessionQuestion,
    GroupPlayer 
)

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(required=True)
    username = serializers.CharField(read_only=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'is_premium', 'password')
        read_only_fields = ('id', 'username', 'is_premium')

    def validate_password(self, value):
        if len(value) < 4:
            raise serializers.ValidationError("Password must be at least 4 characters long.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        try:
            username = User.generate_unique_username(validated_data['email'])
            user = User.objects.create_user(
                username=username,
                email=validated_data['email'],
                password=validated_data['password']
            )
            return user
        except Exception as e:
            raise serializers.ValidationError("Error creating user account")

class AccountVerificationSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()

    def validate(self, data):
        try:
            uid = force_str(urlsafe_base64_decode(data['uidb64']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise ValidationError('Invalid token or user ID.')

        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, data['token']):
            raise ValidationError('Invalid token or user ID.')

        if user.is_active:
            raise ValidationError('Account is already active.')

        data['user'] = user
        return data

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

        if user.is_active:
            raise ValidationError('Account is already active.')

        data['user'] = user 
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
    players = serializers.ListField(child=serializers.CharField(max_length=100), required=False)

    def validate(self, data):
        category_id = data.get('category_id')
        if category_id and not Question.objects.filter(category_id=category_id).exists():
            raise ValidationError({"category_id": ["No questions available for this category."]})

        mode = data.get('mode')
        players = data.get('players', [])
        if mode == 'group':
            if not players or len(players) < 2:
                raise ValidationError({"players": ["At least two players are required for group mode."]})
            if len(set(name.strip().lower() for name in players)) != len(players):
                raise ValidationError({"players": ["All player names must be unique."]})

        return data

class GroupPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPlayer
        fields = ('id', 'name', 'score', 'errors', 'answers', 'correct_answers')

class QuizSessionQuestionSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)

    class Meta:
        model = QuizSessionQuestion
        fields = ('id', 'question', 'selected_answer', 'is_correct', 'answered_at')

class QuizSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    session_questions = QuizSessionQuestionSerializer(many=True, read_only=True)
    group_players = GroupPlayerSerializer(many=True, read_only=True)
    total_questions = serializers.SerializerMethodField()

    def get_total_questions(self, obj):
        return obj.session_questions.count()

    class Meta:
        model = QuizSession
        fields = ('id', 'user', 'started_at', 'completed_at', 'score', 
                 'is_group_session', 'session_questions', 'group_players',
                 'total_questions')

class QuizSessionQuestionSaveSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    selected_answer = serializers.CharField(max_length=255)

class QuizSessionSaveSerializer(serializers.Serializer):
    questions = QuizSessionQuestionSaveSerializer(many=True)
    score = serializers.IntegerField()
    category_id = serializers.IntegerField(required=False, allow_null=True)
    difficulty = serializers.CharField(max_length=50)
    is_group_session = serializers.BooleanField(default=False)
    players = serializers.ListField(child=serializers.DictField(), required=False)

    def validate(self, data):
        players_data = data.get('players', [])
        for player in players_data:
            if 'correct_answers' in player:
                if not isinstance(player['correct_answers'], dict):
                    raise ValidationError({"players": ["correct_answers must be a dictionary for each player."]})
                for question_id, player_id in player['correct_answers'].items():
                    if not isinstance(question_id, str) or not question_id.isdigit():
                        raise ValidationError({
                            "players": [f"Invalid question ID format in correct_answers: {question_id}"]
                        })
                    if not isinstance(player_id, int):
                        raise ValidationError({
                            "players": [f"Invalid player ID format in correct_answers: {player_id}"]
                        })
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        questions_data = validated_data.pop('questions')
        score = validated_data.pop('score')
        is_group_session = validated_data.pop('is_group_session', False)
        players_data = validated_data.pop('players', [])
        is_group_session = is_group_session or bool(players_data)

        quiz_session = QuizSession.objects.create(
            user=user,
            score=score,
            completed_at=timezone.now(),
            is_group_session=is_group_session
        )

        questions_in_order = []
        for question_data in questions_data:
            try:
                question = Question.objects.get(id=question_data['id'])
                questions_in_order.append(question)
                is_correct = question.correct_answer == question_data['selected_answer']
                QuizSessionQuestion.objects.create(
                    quiz_session=quiz_session,
                    question=question,
                    selected_answer=question_data['selected_answer'],
                    is_correct=is_correct,
                    answered_at=timezone.now()
                )
            except Question.DoesNotExist:
                pass

        if is_group_session and players_data:
            # Delete any existing group players to avoid duplicates and ensure clean state
            existing_players = GroupPlayer.objects.filter(quiz_session=quiz_session)
            if existing_players.exists():
                existing_players.delete()
            # Create fresh GroupPlayer objects with the correct data from frontend
            group_players_to_create = []
            for player_data in players_data:
                # Build correct_answers dict if not provided
                correct_answers_dict = player_data.get('correct_answers', {})
                if not correct_answers_dict and 'answers' in player_data:
                    player_answers = player_data['answers']
                    correct_answers_dict = {}
                    for idx, question in enumerate(questions_in_order):
                        if idx >= len(player_answers):
                            break
                        answer = player_answers[idx]
                        is_correct = (answer.lower() == question.correct_answer.lower())
                        correct_answers_dict[str(question.id)] = is_correct
                group_player = GroupPlayer(
                    quiz_session=quiz_session,
                    name=player_data['name'],
                    score=player_data.get('score', 0),
                    errors=player_data.get('errors', []),
                    answers=player_data.get('answers', []),
                    correct_answers=correct_answers_dict
                )
                group_players_to_create.append(group_player)
            GroupPlayer.objects.bulk_create(group_players_to_create)

        return quiz_session

class AnswerSubmissionSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_answer = serializers.CharField(max_length=255)
    player_id = serializers.IntegerField(required=False)

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
                'code': 'missing_fields',
            })

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
        except Exception:
            raise AuthenticationFailed('An unexpected error occurred during authentication.', code='server_error')

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data

    @classmethod
    def get_token(cls, user):
        return super().get_token(user)