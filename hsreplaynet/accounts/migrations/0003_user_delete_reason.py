# -*- coding: utf-8 -*-
# Generated by Django 1.10 on 2016-08-12 14:08
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_auto_20160810_0736'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='delete_reason',
            field=models.TextField(blank=True),
        ),
    ]
