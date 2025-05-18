from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings 

# Define the User model extending Django's AbstractUser
class User(AbstractUser):
   
    email = models.EmailField(unique=True) 
    is_premium = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'  
    REQUIRED_FIELDS = [] 

    
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
        return self.username

# Define the Category model
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

# Define the DifficultyLevel model
class DifficultyLevel(models.Model):
    label = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.label

# Define the Question model
class Question(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    difficulty = models.ForeignKey(DifficultyLevel, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    question_text = models.TextField()
    correct_answer = models.CharField(max_length=255)
    answer_options = models.JSONField(default=list) 
    metadata_json = models.JSONField(blank=True, null=True) 
    is_seeded = models.BooleanField(default=False) 
    is_fallback = models.BooleanField(default=False) 
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_questions'
    )

    def __str__(self):
        return f"{self.question_text[:50]}..." 

# Define the QuizSession model
class QuizSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_sessions', null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(default=0)
    is_group_session = models.BooleanField(default=False) 

    def __str__(self):
        return f"Session {self.id} for {self.user.username if self.user else 'Guest'}"

    @property
    def is_completed(self):
        """Check if all questions in the session have been answered."""
        return self.session_questions.filter(answered_at__isnull=True).count() == 0

# Define the GroupPlayer model for group sessions
class GroupPlayer(models.Model):
    quiz_session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name='group_players')
    name = models.CharField(max_length=100)
    score = models.IntegerField(default=0)
    errors = models.JSONField(default=list, blank=True, null=True) 

    def __str__(self):
        return f"{self.name} in Session {self.quiz_session.id}"

# Define the QuizSessionQuestion model (Intermediate model for M2M relationship with extra data)
class QuizSessionQuestion(models.Model):
    quiz_session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name='session_questions', null=True)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='session_answers', null=True, blank=True)
    def __init__(self, *args, **kwargs):
        session = kwargs.pop('session', None)
        super().__init__(*args, **kwargs)
        if session:
            self.quiz_session = session
    selected_answer = models.CharField(max_length=255, blank=True, null=True) 
    is_correct = models.BooleanField(default=False) 
    answered_at = models.DateTimeField(null=True, blank=True) 

    class Meta:
        unique_together = ('quiz_session', 'question') 

    def __str__(self):
        return f"Session {self.quiz_session.id} - Question {self.question.id}"

# Define the LLMGenerationTask model
class LLMGenerationTask(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='generation_tasks')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True, related_name='generation_tasks')
    difficulty = models.ForeignKey(DifficultyLevel, on_delete=models.CASCADE, null=True, blank=True, related_name='generation_tasks')
    triggered_at = models.DateTimeField(auto_now_add=True)
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Success', 'Success'),
        ('Failed', 'Failed'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    retry_count = models.IntegerField(default=0) 
    task_result = models.JSONField(blank=True, null=True) 

    def __str__(self):
        return f"LLM Task {self.id} - Status: {self.status}"
