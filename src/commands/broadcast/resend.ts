import { AttachmentBuilder, Message } from "discord.js";
import ms from "ms";
import { CustomClient } from "../../index.js";
import { EmbedBuilder } from "../../utils/embedBuilder.js";
import { isValidSnowFlake } from "../../utils/tools.js";
export default {
    name: "resend",
    aliases: ["rs"],
    description: "Resend a message to a member via DM.",
    permissions: ["Administrator"],
    roleRequired: "", // id here
    cooldown: ms("15s"), // in ms
    flags: {
        devOnly: true
    },
    function: async function (client: CustomClient, message: Message, args: string[]) {
        if (!args[0]) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`Please provide a member ID or mention to resend the message.`)],
        })
        const msgID = message.reference.messageId;
        const msg = await message.channel.messages.fetch(msgID).catch(() => null);
        if (!msg) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`Message not found or not referenced.`)],
        });
        if (msg.author.id !== client.user?.id) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`You can only resend messages sent by the bot.`)],
        });
        const userId = args[0]?.replace(/[<@!>]/g, "");
        if(!isValidSnowFlake(userId)) return message.reply("Please provide a valid user mention or ID.");
        if (!userId) return message.reply("Please provide a valid user mention or ID.");

        const member = await message.guild?.members.fetch(userId).catch(() => null);
        if (!member) return message.reply("Member not found.");
        if (!member) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`Please mention a member or provide their ID to resend the message.`)],
        });
        const dmMessage = await member.send({ content: msg.content, embeds: msg.embeds, components: msg.components, files: msg.attachments.map(d => new AttachmentBuilder(d.url)) })//.catch((err) => null);
        if (!dmMessage) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`Failed to send the message to the member.`)],
        });
        return message.reply({
            embeds: [new EmbedBuilder().setDescription(`Message successfully sent to ${member.user.tag}.`)],
        });


    }
} as any;



