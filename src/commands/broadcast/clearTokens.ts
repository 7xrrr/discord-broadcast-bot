import { Message } from "discord.js";
import { CustomClient } from "../../index.js";
import { EmbedBuilder } from "../../utils/embedBuilder.js";
export default {
	name: "cleartokens",
	aliases: ["ct"],
	description: "Clear all tokens from the bot.",
	permissions: ["Administrator"],
	roleRequired: "", // id here
	cooldown: 0, // in ms
    flags: {
        devOnly:true
    },
    function: async function (client:CustomClient,message: Message, args: string[]) {
        if(client.tokens.size === 0) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`There are no tokens to clear.`)],
        });
        client.tokens.clear();
        message.reply({
            embeds: [new EmbedBuilder().setDescription(`Successfully cleared all tokens.`)],
        });



	
	
	},
} as any;
