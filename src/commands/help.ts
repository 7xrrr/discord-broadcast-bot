import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Message } from "discord.js";
import ms from "ms";
import { client, CustomClient } from "../index.js";
import { EmbedBuilder } from "../utils/embedBuilder.js";
import { chunk } from "../utils/tools.js";
export default {
	name: "help",
	aliases: [],
	description: "Help command for the bot.",
	permissions: ["Administrator"],
	roleRequired: "", // id here
	cooldown: ms("15s"), // in ms
	flags: {
		devOnly: true
	},
	function: async function (client: CustomClient, message: Message, args: string[]) {
		
		const commands = client.commands.filter(e => e.name && e.name !== "help" && e.description).map(e => e).sort((a, b) => a.name.localeCompare(b.name));

		let page = 0;
		const maxPage = Math.ceil(commands.length / 10);

		const msg: any = await genrateEmbed(message, commands, page, { reply: true });
		if (maxPage <= 1) return;
		const collector = msg.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: ms("1h"), });

		collector.on("collect", async (i: ButtonInteraction) => {
			if (!i.isButton()) return;
			switch (i.customId) {
				case "prev": {
					if (page > 0) {
						page--;
						await genrateEmbed(i, commands, page, { update: true });
					}
					break;
				}
				case "next": {
					if (page < maxPage) {
						page++;
						await genrateEmbed(i, commands, page, { update: true });
					}
					break;
				}
			}


		})

		collector.on("end", async () => {
			await genrateEmbed(msg, commands, page, { editMessage: true, disableAll: true });

		})








	},
} as any;


const genrateEmbed = async (message: Message | ButtonInteraction, commands: any[], page: number, config: { update?: boolean, editMessage?: boolean, reply?: boolean, disableAll?: boolean }) => {
	const { editMessage = false, reply = false, disableAll = false } = config;
	const buttons = [];
	const maxPage = Math.ceil(commands.length / 10) // -1 because page starts from 0
	const embed = new EmbedBuilder()
	embed.setFooter({ text: `Page ${page + 1}/${maxPage}`, iconURL: client.user?.displayAvatarURL() });
	let description = `## Available commands:\n\n`;
	const currentChunk = chunk(commands, 10)[page] || [];
	currentChunk.forEach((command) => {
		description += `- **\`${command.name}\`**: ${command.description}\n`;
	}
	);
	embed.setDescription(description);
	const prevPage = new ButtonBuilder()
		.setCustomId("prev")
		.setEmoji("⬅️")
		.setStyle(ButtonStyle.Primary)
		.setDisabled(disableAll || page <= 0);
	const nextButton = new ButtonBuilder()
		.setCustomId("next")
		.setEmoji("➡️")
		.setStyle(ButtonStyle.Primary)
		.setDisabled(disableAll || page >= (maxPage-1));
	
	if (maxPage > 1) {
		buttons.push(prevPage, nextButton);
	};
	if (disableAll) buttons.forEach(button => button.setDisabled(true));
	const rows = chunk(buttons, 5).map(row => new ActionRowBuilder<any>().addComponents(row)).slice(0, 3)

	if (config.reply && message instanceof Message) {
		return await message.reply({ embeds: [embed], components: rows, });
	}
	else if (config.editMessage && message instanceof Message) {
		return await message.edit({ embeds: [embed], components: rows });
	}
	else if (message instanceof ButtonInteraction) {
		return await message.update({ embeds: [embed], components: rows });
	}
}