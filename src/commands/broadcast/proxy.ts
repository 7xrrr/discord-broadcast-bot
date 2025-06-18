import axios from "axios";
import { Message } from "discord.js";
import { CustomClient } from "../../index.js";
import { EmbedBuilder } from "../../utils/embedBuilder.js";
import readProxy, { writeProxy } from "../../utils/loadProxy.js";
import ms from "ms";
export default {
    name: "proxy",
    aliases: [],
    description: "set proxies to the bot",
    permissions: ["Administrator"],
    roleRequired: "", // id here
    cooldown: ms("15s"), // in ms
    flags: {
        devOnly: true
    },
    function: async function (client: CustomClient, message: Message, args: string[]) {
        const proxyFile = message.attachments.find(d => d.name.endsWith(".txt"));
        if (!proxyFile) {
            return message.reply({
                embeds: [new EmbedBuilder().setDescription(`Upload a proxy file with the command.`)]
            });
        }

        let proxies: string;
        try {
            const response = await axios.get(proxyFile.url);
            proxies = response.data;
        } catch (error) {
            return message.reply({
                embeds: [new EmbedBuilder().setDescription(`An error occurred while downloading the file.`)]
            });
        }

        await writeProxy(proxies);
        await readProxy();

        return message.reply({
            embeds: [new EmbedBuilder().setDescription(`Loaded ${client.proxy.size} proxies successfully.`)]
        });
    },
} as any;
