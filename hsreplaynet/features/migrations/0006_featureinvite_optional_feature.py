# -*- coding: utf-8 -*-
# Generated by Django 1.10.6 on 2017-05-31 13:16
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('features', '0005_featureinvite_description'),
    ]

    operations = [
        migrations.AlterField(
            model_name='featureinvite',
            name='features',
            field=models.ManyToManyField(blank=True, related_name='invites', to='features.Feature'),
        ),
    ]
