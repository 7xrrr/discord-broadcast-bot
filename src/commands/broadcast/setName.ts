// import { client } from "../index.js";

import { ActionRowBuilder, AnySelectMenuInteraction, ButtonBuilder, ButtonInteraction, ButtonStyle, Interaction, Message } from "discord.js";
import { client, CustomClient } from "../../index.js";
import ms from "ms";
import { EmbedBuilder } from "../../utils/embedBuilder.js";
import { pageMenu } from "../../class/pageMenu.js";
import { chunk, getGuildIcon } from "../../utils/tools.js";
import { Bot } from "../../class/bot.js";


export default {
    name: "setname",
    aliases: ["setn"],
    description: "Set the bot's username to a specific name.",
    permissions: ["Administrator"],
    roleRequired: "", // id here
    cooldown: ms("15s"), // in ms
    flags: {
        devOnly: true
    },
    function: async function (client: CustomClient, message: Message, args: string[]) {
        if (client.tokens.size === 0) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`There are no tokens to change name.`)],
        });
        let name = args.join(" ").trim();
        if (!args[0] || name?.length === 0) return message.reply({ embeds: [new EmbedBuilder().setDescription(`Please provide a new name for the bots.`)] });
        const tokens = client.tokens.filter(e => e?.user?.username);
        const allEmoji = client.getEmoji("all", false) || "🌐";

        const menu = new pageMenu([...tokens.random(24).map((token, index) => {
            return {
                label: `${token.botTag()}`.slice(0, 100),
                description: `Author: ${token.authorString}`.slice(0, 100),
                emoji: token.getEmoji(true),
                value: token.user.id
            }
        }), { emoji: `${allEmoji}`, label: "All Bots", value: "all", description: "Change the name of all bots", }])
        menu.setPerPageLimit(25); menu.setMaxValues(99); menu.setMinValues(1); menu.setCustomId("bc_menu"); menu.setPlaceholder("Select Bots to Change Name");


        const msg: any = await genrateMenu(message, menu, { sendMessage: true, edit: false, reply: false });
        const collector = msg.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: ms("5m"), });
        let status = {};


        collector.on("collect", async (i: ButtonInteraction | AnySelectMenuInteraction) => {
            if (i.customId === "bc_menu" && i.isStringSelectMenu()) {
                menu.setSelected(i.values);
                await genrateMenu(i, menu, { update: true });

            }
            if (!i.isButton()) return;
            switch (i.customId) {
                case "confirm": {
                    let bots: any = menu.selected.includes("all") ? client.tokens : client.tokens.filter(e => menu.selected.includes(e.user.id));
                    if (bots.size === 0) return i.reply({ embeds: [new EmbedBuilder().setDescription(`No bots selected.`)] });
                    bots.map(e => status[e.user.id] = null);
                    bots = bots.map(e => e)
                    await changeNameStatus(i, bots, status, { update: true });
                    collector?.stop();
                    for (const bot of bots) {
                        try {
                            const response = await bot.setName(name)
                         
                            if (response?.data?.id && response?.data?.username) {
                                status[bot.user.id] = true;
                                bot.user.username = response.data.username;
                                bot.user.discriminator = response.data.discriminator;
                            } else {
                                status[bot.user.id] = false;
                            }
                        } catch (error) {
                            console.error(`Error changing name for ${bot.user.username}:`, error);
                            status[bot.user.id] = false;
                        }
                        await changeNameStatus(msg, bots, status, { editMessage: true, });
                    }
                    msg.reply({ embeds: [new EmbedBuilder().setDescription(`Name changed successfully for **${bots.length}** bots.`)] });
                    break;
                };


            }


        });





    },
} as any;

const changeNameStatus = async (i: Interaction | Message, bots: Bot[], status: any, config: { editMessage?: boolean, sendMessage?: boolean, update?: boolean, edit?: boolean, reply?: boolean }) => {

    const loadEmoji = client.getEmoji("loading_circle", false) || "⏳";
    const errorEmoji = client.getEmoji("error", false) || "❌";
    const successEmoji = client.getEmoji("success", false) || "✅";
    const embed = new EmbedBuilder()

        .setFooter({
            text: `Changing Name for **${bots.length}** bots:`,
            iconURL: getGuildIcon(i.guild)
        })
    let description = `Changing Name for **${bots.length}** bots:\n\n`;
    for (const bot of bots) {
        const botEmoji = status[bot.user.id] === true ? successEmoji : status[bot.user.id] === false ? errorEmoji : loadEmoji;

        description += client.textValue(`<@${bot.user.id}> \`${bot.botTag()}\``, `${botEmoji}`, true);
    }
    embed.setDescription(description.slice(0, 4080));


    if (i instanceof Message && config.sendMessage) {
        return await i.reply({ embeds: [embed], components: [] });
    } else if ('update' in i && typeof i.update === 'function' && config.update) {

        return await i.update({ embeds: [embed], components: [] });
    } else if ('edit' in i && typeof i.edit === 'function' && config.editMessage) {
        return await i.edit({ embeds: [embed], components: [] });
    }
}






const genrateMenu = async (i: Interaction | Message, menu: pageMenu, config: { sendMessage?: boolean, update?: boolean, edit?: boolean, reply?: boolean }) => {
    const buttons = [];
    const confirmEmoji = client.getEmoji("confirm", false) || "✅";
    const nextButton = new ButtonBuilder()
        .setCustomId("confirm")
        .setEmoji(confirmEmoji)
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(menu?.selected?.length === 0);
    buttons.push(nextButton);


    const rows = chunk(buttons, 5).map(row => new ActionRowBuilder<any>().addComponents(row)).slice(0, 3)
    if (i instanceof Message && config.sendMessage) {
        return await i.reply({ components: [...menu.build(), ...rows] });
    } else if ('update' in i && typeof i.update === 'function' && config.update) {

        return await i.update({ components: [...menu.build(), ...rows] });
    }


}



// Example usage