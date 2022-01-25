import { ApplicationCommandOptionTypes } from 'discord.js/typings/enums';
import { command } from 'jellycommands';
import { trgm_search } from 'js-trgm';
import fetch from 'node-fetch';
import { DEV_MODE, SVELTE_ORANGE } from '../../config.js';
import { listOfLinks } from '../../utils/embedBuilder.js';
import { Repos, RepositoryDetails } from '../../utils/repositories.js';

export default command({
	name: 'docs',
	description: 'Search svelte or sveltekit docs',
	global: true,
	dev: DEV_MODE,
	options: [
		{
			name: 'project',
			type: ApplicationCommandOptionTypes.INTEGER,
			description: 'Which project to search the docs of',
			choices: [
				{
					name: 'Svelte',
					value: Repos.SVELTE,
				},
				{
					name: 'SvelteKit',
					value: Repos.SVELTE_KIT,
				},
			],
			required: true,
		},
		{
			name: 'topic',
			type: ApplicationCommandOptionTypes.STRING,
			description: 'The topic to search for in the docs.',
		},
	],

	run: async ({ interaction }) => {
		const repo: Repos.SVELTE | Repos.SVELTE_KIT =
			interaction.options.getInteger('project', true);
		const thisRepoDetails = RepositoryDetails[repo];
		const topic = interaction.options.getString('topic');

		try {
			if (!topic)
				return await interaction.reply({
					embeds: [
						{
							description: `[${thisRepoDetails.NAME} Docs](${thisRepoDetails.DOCS_URL})`,
							color: SVELTE_ORANGE,
						},
					],
				});

			if (!thisRepoDetails.DOCS_CACHE) await buildDocsCache(repo);

			const docsCache = thisRepoDetails.DOCS_CACHE!;

			const results = trgm_search(topic, Object.keys(docsCache), {
				limit: 5,
			});

			if (results.length === 0)
				return await interaction.reply({
					content:
						'No matching result found. Try again with a different search term.',
					ephemeral: true,
				});

			await interaction.reply({
				embeds: [
					listOfLinks(
						results.map(
							(result) =>
								`[${result.target}](${
									thisRepoDetails.DOCS_URL
								}#${docsCache[result.target]})`,
						),
					),
				],
			});
		} catch {
			// Do something with the errors
		}
	},
});

async function buildDocsCache(project: Repos) {
	const res = await fetch(RepositoryDetails[project].DOCS_API_URL!);

	if (res.ok) {
		const data = (await res.json()) as DocsSection[];

		let flattened: Record<string, string> = {};

		for (let section of data) {
			flattened = { ...flattened, ...flattenSection(section) };
		}

		RepositoryDetails[project].DOCS_CACHE = flattened;
	}
}

function flattenSection(section: DocsSection) {
	let subsections: Record<string, string> = {};

	subsections[section.title] = section.slug;

	for (let subsection of section.sections) {
		subsections = { ...subsections, ...flattenSection(subsection) };
	}

	return subsections;
}

type DocsSection = {
	slug: string;
	title: string;
	sections: Array<DocsSection>;
};
