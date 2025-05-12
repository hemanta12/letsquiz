from django.core.management.base import BaseCommand
from django.db import transaction

class Command(BaseCommand):
    help = 'Seeds the database with initial question data.'

    
    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting database seeding...'))

        import json
        import os
        from django.conf import settings
        from letsquiz_backend.apps.quiz.models import Question, Category, DifficultyLevel

        
        data_file_path = os.path.join(os.getcwd(), 'data', 'questions.json')

        if not os.path.exists(data_file_path):
            self.stdout.write(self.style.ERROR(f'Seed data file not found at: {data_file_path}'))
            return

        with open(data_file_path, 'r') as f:
            questions_data = json.load(f)

        for entry in questions_data:
            category_name = entry.get('category')
            difficulty_label = entry.get('difficulty')
            question_text = entry.get('question_text')
            correct_answer = entry.get('correct_answer')
            metadata = entry.get('metadata', {})
            answer_options = entry.get('options', [])

            if not all([category_name, difficulty_label, question_text, correct_answer]):
                self.stdout.write(self.style.WARNING(f'Skipping invalid entry: {entry}'))
                continue

            # Get or create Category
            category, created = Category.objects.get_or_create(name=category_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {category_name}'))

            # Get or create DifficultyLevel
            difficulty, created = DifficultyLevel.objects.get_or_create(label=difficulty_label)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created difficulty level: {difficulty_label}'))

            # Create Question
            Question.objects.create(
                category=category,
                difficulty=difficulty,
                question_text=question_text,
                correct_answer=correct_answer,
                answer_options=answer_options,
                metadata_json=metadata,
                is_seeded=True # Mark as seeded data
            )
       

        self.stdout.write(self.style.SUCCESS('Database seeding completed.'))