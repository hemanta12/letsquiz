from django.apps import AppConfig


class QuizConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.quiz"
    
    def ready(self):
        """Import signals when app is ready"""
        import apps.quiz.signals
