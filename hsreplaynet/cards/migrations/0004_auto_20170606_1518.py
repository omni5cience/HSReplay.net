# -*- coding: utf-8 -*-
# Generated by Django 1.10.7 on 2017-06-06 15:18
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cards', '0003_auto_20170201_0253'),
    ]

    operations = [
        migrations.RenameField(
            model_name='card',
            old_name='id',
            new_name='card_id',
        ),
    ]