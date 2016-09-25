# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-09-25 05:48
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0009_auto_20160925_0045'),
    ]

    operations = [
        migrations.AlterField(
            model_name='globalgame',
            name='digest',
            field=models.CharField(db_index=True, help_text='SHA1 of str(game_handle), str(server_address), str(lo1), str(lo2)', max_length=40, null=True, unique=True),
        ),
    ]
