# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-02-26 15:39
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0003_globalgame_loaded_into_redshift'),
    ]

    operations = [
        migrations.AddField(
            model_name='globalgame',
            name='tainted_decks',
            field=models.NullBooleanField(),
        ),
    ]