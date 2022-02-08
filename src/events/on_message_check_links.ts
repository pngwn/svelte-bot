import { build_embed } from '../utils/embed_helpers.js';
import { event } from 'jellycommands';
import urlRegex from 'url-regex';
import { LINK_ONLY_CHANNELS } from '../config.js';

export default event({
	name: 'messageCreate',

	run: async ({}, message) => {
		if (message.author.bot) return;

		if (LINK_ONLY_CHANNELS.includes(message.channel.id)) {
			const has_link = urlRegex().test(message.content);

			if (!has_link) {
				try {
					if (message.deletable) await message.delete();

					await message.author.send({
						embeds: [
							build_embed({
								description: `Your message in ${message.channel.toString()} was removed since it doesn't contain a link, if you are trying to showcase a project please post a link with your text. Otherwise all conversation should be inside a thread\n\nYour message was sent below so you don't lose it!`,
							}),
						],
					});

					await message.author.send({
						content: message.content,
					});
				} catch {
					// this will fail if message is already deleted but we don't know or if the dm can't be sent - either way we don't need to do anything
				}

				return;
			}
		}
	},
});
