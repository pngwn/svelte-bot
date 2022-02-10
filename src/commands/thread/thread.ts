import { command } from 'jellycommands';
import { HELP_CHANNELS } from '../../config.js';
import { build_embed } from '../../utils/embed_helpers.js';
import {
	check_autothread_permissions,
	rename_thread,
	solve_thread,
} from '../../utils/threads.js';

export default command({
	name: 'thread',
	description: 'Manage a thread',

	options: [
		{
			name: 'archive',
			description: 'Archive a thread',
			type: 'SUB_COMMAND',
		},
		{
			name: 'rename',
			description: 'Rename a thread',
			type: 'SUB_COMMAND',

			options: [
				{
					name: 'name',
					description: 'The new name of the thread',
					type: 'STRING',
					required: true,
				},
			],
		},
		{
			name: 'solve',
			description: 'Mark a thread as solved',
			type: 'SUB_COMMAND',

			options: [
				{
					name: 'user',
					description: 'Who helped you solve this thread?',
					type: 'USER',
				},
			],
		},
	],

	global: true,
	defer: {
		ephemeral: true,
	},

	run: async ({ interaction, client }): Promise<void> => {
		const subcommand = interaction.options.getSubcommand(true);
		const thread = await interaction.channel?.fetch();

		if (!thread?.isThread())
			return void interaction.followUp({
				content: 'This channel is not a thread',
			});

		if (thread.archived)
			return void interaction.followUp({
				content: 'This thread is archived.',
				ephemeral: true,
			});

		const member = await interaction.guild?.members.fetch(
			interaction.user.id,
		);

		if (!member)
			return void interaction.followUp({
				content: 'Unable to find you',
				ephemeral: true,
			});

		const has_permission = await check_autothread_permissions(
			thread,
			member,
		);

		if (!has_permission)
			return void interaction.followUp({
				content: "You don't have the permissions to manage this thread",
				ephemeral: true,
			});

		switch (subcommand) {
			case 'archive':
				await thread.setArchived(true);

				interaction.followUp({
					embeds: [
						build_embed({
							description: 'Thread archived',
						}),
					],
				});
				break;

			case 'rename':
				const new_name = interaction.options.getString('name', true);
				const parent_id = thread.parentId || '';

				try {
					await rename_thread(
						thread,
						new_name,
						HELP_CHANNELS.includes(parent_id),
					);

					interaction.followUp({
						embeds: [
							build_embed({
								description: 'Thread renamed',
							}),
						],
					});
				} catch (error) {
					interaction.followUp({
						content: (error as Error).message,
					});
				}
				break;

			case 'solve':
				const solver = interaction.options.getUser('user') || undefined;

				try {
					if (thread.name.startsWith('✅'))
						throw new Error('Thread already marked as solved');

					if (!HELP_CHANNELS.includes(thread.parentId || ''))
						throw new Error(
							'This command only works in a auto thread',
						);

					await solve_thread(thread, client, solver);

					interaction.channel
						?.send({
							embeds: [
								build_embed({
									description: `Thread marked as solved!${
										solver
											? ` Thank you ${solver.toString()} and everyone else who participated for your help.`
											: ''
									}`,
								}),
							],
						})
						// Have to do this outside of solve_thread.
						.finally(() => thread.setArchived(true));

					// Avoid a dangling defer
					interaction.followUp('Thread marked as solved!');
				} catch (e) {
					interaction.followUp({
						embeds: [
							build_embed({
								description: (e as Error).message,
							}),
						],
					});
				}
				break;
		}
	},
});
