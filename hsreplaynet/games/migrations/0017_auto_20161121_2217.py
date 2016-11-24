# -*- coding: utf-8 -*-
# Generated by Django 1.10.2 on 2016-11-21 22:17
from __future__ import unicode_literals

from django.db import migrations, models


DROP_IDX_GLOBALGAME_C10F7796 = """
DROP INDEX games_globalgame_c10f7796;
"""


DROP_IDX_GLOBALGAME_DIGEST_BE7A49FB = """
DROP INDEX games_globalgame_digest_be7a49fb_like;
"""


class Migration(migrations.Migration):

	dependencies = [
		('games', '0016_auto_20161121_2051'),
	]

	operations = [
		migrations.AlterField(
			model_name='globalgame',
			name='digest',
			field=models.CharField(help_text='SHA1 of str(game_handle), str(server_address), str(lo1), str(lo2)', max_length=40, null=True, unique=True),
		),
		migrations.RunSQL(
			DROP_IDX_GLOBALGAME_C10F7796,
			None
		),
		migrations.RunSQL(
			DROP_IDX_GLOBALGAME_DIGEST_BE7A49FB,
			None
		),
	]