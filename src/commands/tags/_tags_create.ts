import { SupabaseClient } from '@supabase/supabase-js';
import { CommandInteraction, GuildMember, Message } from 'discord.js';
import { TAG_CREATE_PERMITTED_ROLES } from '../../config.js';
import { tagsEmbedBuilder } from '../../utils/embedBuilder.js';
import { hasAnyRole } from '../../utils/hasAnyRole.js';
import { Tag } from './_common.js';

const validatorRegex = /^[a-z0-9\-\+\_\.\ ]*$/;

export async function tagCreateCommandHandler({
	tag,
	interaction,
	tagName,
	supabase,
}: {
	tag: Tag | undefined;
	interaction: CommandInteraction;
	tagName: string;
	supabase: SupabaseClient;
}) {
	if (
		!hasAnyRole(
			interaction.member as GuildMember,
			TAG_CREATE_PERMITTED_ROLES,
		)
	) {
		return await interaction.reply({
			content: "You don't have the permissions to create a tag.",
			ephemeral: true,
		});
	}

	if (tag) {
		return await interaction.reply({
			content:
				'A tag with that name exists already. Did you mean to do `/tags update` instead?',
			ephemeral: true,
		});
	}

	if (!validatorRegex.test(tagName)) {
		return await interaction.reply({
			content:
				"The name provided isn't valid. It must match `/^[a-z0-9\\-\\+\\_\\.\\ ]*$/`",
			ephemeral: true,
		});
	}

	await interaction.reply({
		content:
			'Send the contents for the tag in this channel within the next 60 seconds.',
		ephemeral: true,
	});

	let messageColl = await interaction.channel?.awaitMessages({
		time: 60000,
		filter: (message: Message) => message.author === interaction.user,
		max: 1,
	});

	const message = messageColl?.first();
	if (!message) {
		return await interaction.editReply({
			content: 'No content received for the tag. Aborting.',
		});
	}

	// All messages from the bot are ephemeral so feels kinda weird to have the message stick around
	await message.delete();

	const { error } = await supabase.from<Tag>('tags').insert({
		tag_name: tagName,
		tag_content: message.content,
		author_id: interaction.user.id,
	});

	if (error) {
		return await interaction.editReply({
			content: `There was an error in creating the tag "${tagName}". Tag names are case insensitive and should be unique.`,
		});
	}

	await interaction.editReply({
		content: `Added tag "${tagName}".`,
		embeds: [
			tagsEmbedBuilder({
				tagName,
				tagContent: message.content,
				author: interaction.user,
			}),
		],
	});
}
