# -*- coding: utf-8 -*-
# Generated by Django 1.10.2 on 2016-10-15 05:05
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0013_replayalias'),
    ]

    operations = [
        migrations.AddField(
            model_name='gamereplay',
            name='hslog_version',
            field=models.CharField(help_text='The python-hearthstone library version at processing', max_length=24, null=True, verbose_name='hslog library version'),
        ),
        migrations.AlterField(
            model_name='gamereplay',
            name='hsreplay_version',
            field=models.CharField(help_text='The HSReplay library version used to generate the replay', max_length=16, verbose_name='HSReplay library version'),
        ),
    ]