from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0013_groupplayer_correct_answers'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='question',
            index=models.Index(
                fields=['is_seeded', 'category', 'difficulty'],
                name='question_seed_cat_diff_idx',
            ),
        ),
    ]
