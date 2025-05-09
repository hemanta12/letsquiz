from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings # Import settings to reference AUTH_USER_MODEL

# Define the User model extending Django's AbstractUser
class User(AbstractUser):
    # Inherits standard fields like username, first_name, last_name, email, password, is_active, is_staff, is_superuser, date_joined, last_login
    user_name = models.CharField(max_length=150, unique=True, blank=True, null=True) # Adding user_name as per ERD
    is_premium = models.BooleanField(default=False) # Adding is_premium as per ERD

    USERNAME_FIELD = 'email' # Use email for authentication
    REQUIRED_FIELDS = ['username'] # Keep username as a required field

    # You can add related_name to avoid clashes if you have other models with ForeignKey to User
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name="quiz_user_groups",
        related_query_name="user",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name="quiz_user_permissions",
        related_query_name="user",
    )

    def __str__(self):
        return self.username # Or self.user_name if preferred

# Define the Category model
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

# Define the DifficultyLevel model
class DifficultyLevel(models.Model):
    label = models.CharField(max_length=50, unique=True) # Using label as per ERD
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.label

# Define the Question model
class Question(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='questions')
    difficulty = models.ForeignKey(DifficultyLevel, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    correct_answer = models.CharField(max_length=255) # Assuming correct answer is a string
    metadata_json = models.JSONField(blank=True, null=True) # Using JSONField for metadata
    is_seeded = models.BooleanField(default=False) # Flag for originally seeded questions
    is_fallback = models.BooleanField(default=False) # Flag for fallback questions
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, # Reference the custom User model
        on_delete=models.SET_NULL, # Set to NULL if user is deleted
        null=True,
        blank=True,
        related_name='created_questions'
    )

    def __str__(self):
        return f"{self.question_text[:50]}..." # Display first 50 chars of question text

# Define the QuizSession model
class QuizSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_sessions')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(default=0)

    def __str__(self):
        return f"Session {self.id} for {self.user.username}"

# Define the QuizSessionQuestion model (Intermediate model for M2M relationship with extra data)
class QuizSessionQuestion(models.Model):
    quiz_session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name='session_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='session_answers')
    selected_answer = models.CharField(max_length=255, blank=True, null=True) # Store the selected answer
    is_correct = models.BooleanField(default=False) # Whether the selected answer was correct
    answered_at = models.DateTimeField(null=True, blank=True) # Timestamp when the answer was submitted

    class Meta:
        unique_together = ('quiz_session', 'question') # Ensure a question is only answered once per session

    def __str__(self):
        return f"Session {self.quiz_session.id} - Question {self.question.id}"

# Define the LLMGenerationTask model
class LLMGenerationTask(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='generation_tasks')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='generation_tasks')
    difficulty = models.ForeignKey(DifficultyLevel, on_delete=models.SET_NULL, null=True, blank=True, related_name='generation_tasks')
    triggered_at = models.DateTimeField(auto_now_add=True)
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Success', 'Success'),
        ('Failed', 'Failed'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    retry_count = models.IntegerField(default=0) # Field to record retry count
    task_result = models.JSONField(blank=True, null=True) # Store task result/error details

    def __str__(self):
        return f"LLM Task {self.id} - Status: {self.status}"
