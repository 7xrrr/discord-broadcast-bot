// import { client } from "../index.js";

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } from "discord.js";
import { chunk, isValidSnowFlake, isValidToken } from "../../utils/tools.js";
import { CustomClient } from "../../index.js";
import { Bot } from "../../class/bot.js";
import { EmbedBuilder } from "../../utils/embedBuilder.js";


export default {
	name: "settoken",
	aliases: ["token"],
	description: "add new tokens to the bot",
	permissions: ["Administrator"],
	roleRequired: "", // id here
	cooldown: 0, // in ms
	flags: {
		devOnly: true
	},
	function: async function (client: CustomClient, message: Message, args: string[]) {
		message.delete().catch((err) => null	);
		let possibleTokens = args[0] ? args[0].split("\n").map(d => d.trim()) : [];
		const tokens = [...new Set(possibleTokens.map((a) => a.trim()).filter((a) => isValidToken(a)))];
		const buttons = [];
		const components = [];

		if (tokens.length === 0) return message.reply({
			embeds: [new EmbedBuilder().setColor("Red").setDescription("Please provide a valid token. Tokens are usually more than 50 characters long.")],
		});
		
		let validTokens: string[] = [];
		let invalidTokens: string[] = [];
		for (let index = 0; index < tokens.length; index++) {
			const token = tokens[index];
			const bot = new Bot(token);
			bot.setAuthor(message.author.id, message.author.tag);
			const user = await bot.getUserData().catch(() => null);
			const id = user?.id;
			if (id && isValidSnowFlake(id)) {
				validTokens.push(token);
				client.tokens.set(id, bot)
			} else {
				invalidTokens.push(token);
			}
		};

		let text = "";
		if (validTokens.length > 0) {
			text += `Successfully added ${validTokens.length} tokens`; // repeat to avoid embed limit
		} else {
			text += "No valid tokens were provided.";
		}
		text += `\n${client.textValue(`Valid tokens`, validTokens.length.toString())}${client.textValue(`Invalid tokens`, invalidTokens.length.toString())}`;
		if (invalidTokens.length > 0) {
			text += `- **Bad Tokens:**\n${invalidTokens.map((t) => `\`${t}\``).join("\n").slice(0, 2000)}\n`
		}
		if (validTokens.length > 0) {
			text += `- **Valid Bots:**\n${validTokens.map((t) => {
				const bot = client.tokens.find((b) => b.token === t);
				if (!bot) return `\`${t}\``;
				buttons.push(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(`${bot.botTag().slice(0, 100)}`).setURL(bot.getInviteLink()))
				return `-# \`${bot.user.username}#${bot.user.discriminator}\` (${bot.user.id}) - Added by: ${bot.authorString} <t:${Math.floor(bot.addTime / 1000)}:R>`;
			}).join("\n").slice(0, 1500)}`
		}

		const embed = new EmbedBuilder().setDescription(text);
		const rows = chunk(buttons, 5).map(row => new ActionRowBuilder<any>().addComponents(row)).slice(0, 5);
		components.push(...rows);
		message.reply({
			embeds: [embed],
			components: rows
		});





	},
} as any;
