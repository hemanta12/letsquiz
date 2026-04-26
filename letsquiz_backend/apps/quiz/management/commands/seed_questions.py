import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from letsquiz_backend.apps.quiz.level1_config import (
    canonicalize_difficulty_label,
    get_allowed_category_names,
    normalize_question_key,
)
from letsquiz_backend.apps.quiz.models import Category, DifficultyLevel, Question


class Command(BaseCommand):
    help = 'Seed Level 1 quiz questions idempotently from JSON with optional cleanup.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--data-file',
            type=str,
            default='',
            help='Optional absolute/relative JSON seed file path.',
        )
        parser.add_argument(
            '--prune-non-level1',
            action='store_true',
            help='Delete seeded questions and empty categories outside LEVEL1_ALLOWED_CATEGORIES.',
        )
        parser.add_argument(
            '--prune-stale-seeded',
            action='store_true',
            help='Delete seeded questions in allowed categories that are not present in the current seed file.',
        )
        parser.add_argument(
            '--dedupe',
            action='store_true',
            help='Delete duplicate seeded questions by normalized text/category/difficulty key.',
        )

    def _resolve_data_path(self, explicit_path: str) -> Path:
        if explicit_path:
            return Path(explicit_path).expanduser().resolve()
        configured = Path(settings.LEVEL1_SEED_FILE).expanduser()
        if configured.is_absolute():
            return configured
        return (Path.cwd() / configured).resolve()

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting Level 1 seed sync...'))

        data_file_path = self._resolve_data_path(options.get('data_file', ''))
        if not data_file_path.exists():
            self.stdout.write(self.style.ERROR(f'Seed data file not found at: {data_file_path}'))
            return

        with data_file_path.open('r', encoding='utf-8') as f:
            raw_entries = json.load(f)

        if not isinstance(raw_entries, list):
            self.stdout.write(self.style.ERROR('Seed data must be a JSON array of question objects.'))
            return

        allowed_categories = set(get_allowed_category_names())
        if not allowed_categories:
            self.stdout.write(self.style.ERROR('LEVEL1_ALLOWED_CATEGORIES is empty. Refusing to seed.'))
            return

        category_cache = {
            cat.name: cat for cat in Category.objects.filter(name__in=allowed_categories)
        }
        difficulty_cache = {d.label: d for d in DifficultyLevel.objects.all()}

        normalized_seen_keys = set()
        kept_ids = set()
        created_count = 0
        updated_count = 0
        skipped_count = 0

        existing_seeded = (
            Question.objects
            .filter(is_seeded=True, category__name__in=allowed_categories)
            .select_related('category', 'difficulty')
        )
        existing_by_key = {}
        duplicate_ids = []
        for question in existing_seeded:
            key = (
                normalize_question_key(question.question_text),
                question.category_id,
                question.difficulty_id,
            )
            if key in existing_by_key:
                duplicate_ids.append(question.id)
                continue
            existing_by_key[key] = question

        for entry in raw_entries:
            category_name = (entry.get('category') or '').strip()
            difficulty_label = (entry.get('difficulty') or '').strip()
            question_text = (entry.get('question_text') or '').strip()
            correct_answer = (entry.get('correct_answer') or '').strip()
            metadata = entry.get('metadata', {})
            answer_options = entry.get('options', [])

            if not all([category_name, difficulty_label, question_text, correct_answer]):
                skipped_count += 1
                continue

            if category_name not in allowed_categories:
                # Intentionally skip non-Level 1 categories.
                skipped_count += 1
                continue

            canonical_difficulty = canonicalize_difficulty_label(difficulty_label)
            if not canonical_difficulty:
                skipped_count += 1
                continue

            if category_name not in category_cache:
                category_cache[category_name] = Category.objects.create(name=category_name)
                self.stdout.write(self.style.SUCCESS(f'Created category: {category_name}'))
            category = category_cache[category_name]

            if canonical_difficulty not in difficulty_cache:
                difficulty_cache[canonical_difficulty] = DifficultyLevel.objects.create(label=canonical_difficulty)
                self.stdout.write(self.style.SUCCESS(f'Created difficulty level: {canonical_difficulty}'))
            difficulty = difficulty_cache[canonical_difficulty]

            if not isinstance(answer_options, list):
                answer_options = []
            if not isinstance(metadata, dict):
                metadata = {}

            key = (normalize_question_key(question_text), category.id, difficulty.id)
            if key in normalized_seen_keys:
                continue
            normalized_seen_keys.add(key)

            existing = existing_by_key.get(key)
            if existing:
                changed = False
                if existing.correct_answer != correct_answer:
                    existing.correct_answer = correct_answer
                    changed = True
                if existing.answer_options != answer_options:
                    existing.answer_options = answer_options
                    changed = True
                if existing.metadata_json != metadata:
                    existing.metadata_json = metadata
                    changed = True
                if not existing.is_seeded:
                    existing.is_seeded = True
                    changed = True

                if changed:
                    existing.save(update_fields=['correct_answer', 'answer_options', 'metadata_json', 'is_seeded'])
                    updated_count += 1
                kept_ids.add(existing.id)
                continue

            created = Question.objects.create(
                category=category,
                difficulty=difficulty,
                question_text=question_text,
                correct_answer=correct_answer,
                answer_options=answer_options,
                metadata_json=metadata,
                is_seeded=True,
            )
            existing_by_key[key] = created
            kept_ids.add(created.id)
            created_count += 1

        if options['dedupe'] and duplicate_ids:
            deleted, _ = Question.objects.filter(id__in=duplicate_ids).delete()
            self.stdout.write(self.style.WARNING(f'Deduped seeded duplicates: {deleted} rows deleted.'))

        if options['prune_stale_seeded']:
            stale_qs = Question.objects.filter(
                is_seeded=True,
                category__name__in=allowed_categories,
            ).exclude(id__in=kept_ids)
            stale_count = stale_qs.count()
            if stale_count:
                stale_qs.delete()
            self.stdout.write(self.style.WARNING(f'Pruned stale seeded questions: {stale_count}'))

        if options['prune_non_level1']:
            deleted_questions, _ = Question.objects.filter(is_seeded=True).exclude(
                category__name__in=allowed_categories
            ).delete()
            self.stdout.write(self.style.WARNING(
                f'Pruned non-Level 1 seeded questions: {deleted_questions}'
            ))

            deleted_categories, _ = Category.objects.exclude(name__in=allowed_categories).filter(
                questions__isnull=True
            ).delete()
            self.stdout.write(self.style.WARNING(
                f'Deleted empty non-Level 1 categories: {deleted_categories}'
            ))

        self.stdout.write(
            self.style.SUCCESS(
                'Seed sync completed. '
                f'Created={created_count}, Updated={updated_count}, Skipped={skipped_count}.'
            )
        )