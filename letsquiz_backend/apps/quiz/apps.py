from django.apps import AppConfig


class QuizConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "letsquiz_backend.apps.quiz"
    
    def ready(self):
        """Import signals when app is ready"""
        import letsquiz_backend.apps.quiz.signals
