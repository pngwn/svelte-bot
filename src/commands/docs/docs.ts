import { command } from 'jellycommands';
import { build_embed, list_embed_builder } from '../../utils/embed_helpers.js';
import { no_op } from '../../utils/promise.js';
import { Repos, RepositoryDetails } from '../../utils/repositories.js';
import { search_docs } from './_docs_cache.js';

const sc_map = {
	svelte: Repos.SVELTE,
	sveltekit: Repos.SVELTE_KIT,
};

export default command({
	name: 'docs',
	description: 'Search svelte or sveltekit docs',
	global: true,

	options: [
		{
			name: 'svelte',
			type: 'SUB_COMMAND',
			description: 'Search svelte docs',
			options: [
				{
					name: 'query',
					type: 'STRING',
					description: 'The string to search for in the docs.',
				},
			],
		},
		{
			name: 'sveltekit',
			type: 'SUB_COMMAND',
			description: 'Search sveltekit docs',
			options: [
				{
					name: 'query',
					type: 'STRING',
					description: 'The string to search for in the docs.',
				},
			],
		},
	],

	run: async ({ interaction }) => {
		const repo =
			sc_map[
				interaction.options.getSubcommand(true) as
					| 'svelte'
					| 'sveltekit'
			];

		const repo_details = RepositoryDetails[repo];
		const query = interaction.options.getString('query');

		try {
			if (!query)
				return interaction.reply({
					embeds: [
						build_embed({
							description: `[${repo_details.NAME} Docs](${repo_details.HOMEPAGE}/docs)`,
						}),
					],
				});

			const results = await search_docs(query, repo);

			if (!results.length)
				return interaction.reply({
					content:
						'No matching result found. Try again with a different search term.',
					ephemeral: true,
				});

			await interaction.reply({
				embeds: [
					list_embed_builder(results, `${repo_details.NAME} Docs`),
				],
			});
		} catch {
			interaction
				.reply({
					content: 'An error occurred while searching the docs.',
					ephemeral: true,
				})
				.catch(no_op);
		}
	},
});
