# -*- coding: utf-8 -*-
# Generated by Django 1.9.6 on 2016-06-06 16:10
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('api', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='AccountClaim',
            fields=[
                ('id', models.CharField(max_length=40, primary_key=True, serialize=False)),
                ('created', models.DateTimeField(auto_now_add=True, verbose_name='Created')),
                ('token', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='api.AuthToken')),
            ],
        ),
    ]
