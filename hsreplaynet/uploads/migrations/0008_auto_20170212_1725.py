# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-02-12 17:25
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('uploads', '0007_auto_20170127_2003'),
    ]

    operations = [
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='analyze_ended_at',
            new_name='analyzing_ended_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='analyze_started_at',
            new_name='analyzing_started_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='track_cleanup_end_at',
            new_name='cleaning_up_ended_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='track_cleanup_start_at',
            new_name='cleaning_up_started_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='deduplication_ended_at',
            new_name='deduplicating_ended_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='deduplication_started_at',
            new_name='deduplicating_started_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='insert_ended_at',
            new_name='inserting_ended_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='insert_started_at',
            new_name='inserting_started_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='refreshing_view_end_at',
            new_name='refreshing_materialized_views_ended_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='refreshing_view_start_at',
            new_name='refreshing_materialized_views_started_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='vacuum_ended_at',
            new_name='vacuuming_ended_at',
        ),
        migrations.RenameField(
            model_name='redshiftstagingtracktable',
            old_name='vacuum_started_at',
            new_name='vacuuming_started_at',
        ),
    ]