import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, Message, ModalBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder } from "discord.js";
import { client, CustomClient } from "../../index.js";
import ms from "ms";
import { EmbedBuilder } from "../../utils/embedBuilder.js";
import { Settings } from "../../class/settings.js";
import config from "../../config.js";
import { chunk, isValidSnowFlake } from "../../utils/tools.js";
import { UserSelectInteraction } from "discord.js-selfbot-v13";
export default {
    name: "settings",
    aliases: ["s"],
    description: "Settings command for the bot.",
    permissions: ["Administrator"],
    roleRequired: "", // id here
    cooldown: ms("15s"), // in ms
    flags: {
        devOnly: true,
        ownerOnly: true,
    },
    function: async function (client: CustomClient, message: Message, args: string[]) {
        if (!Settings.loaded) {
            await Settings.load();
        }
        const msg: any = await genrateMenu(message, { reply: true });
        const custom_id = Math.random().toString(36).substring(2, 15);
        const collector = msg.channel.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id && (i.message.id === msg.id || i.customId.endsWith(custom_id)), time: ms("15m"), });


        collector.on("collect", async (i: ButtonInteraction) => {
            if (!i.isButton()) return;
            switch (i.customId) {
                case "editColor": {
                    const modal = new ModalBuilder().setCustomId(Math.random().toString(36).substring(2, 15)).setTitle("Edit Color")
                    const colorInput = new TextInputBuilder()
                        .setCustomId("color")
                        .setLabel("Enter a hex color code (e.g. #FF0000)")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(6)
                        .setValue(`#${Settings?.settings?.color || config?.color}`) // Default to current color
                        .setMaxLength(7);
                    modal.addComponents(new ActionRowBuilder<any>().addComponents(colorInput));
                    await i.showModal(modal);
                    const response = await i.awaitModalSubmit({ filter: (m) => m.user.id === i.user.id, time: ms("2m") }).catch((err) => null)
                    if (!response) return;

                    const color = response.fields.getTextInputValue("color");
                    const hexColorRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
                    if (!hexColorRegex.test(color)) {
                        return response.reply({ content: "Invalid color format. Please use a hex color code (e.g. #FF0000).", ephemeral: true });
                    }
                    Settings.settings.color = color.replace("#", "");
                    response.deferUpdate();
                    await Settings.save();
                    await genrateMenu(msg, { editMessage: true });

                    break;
                }
                case "editPrefix": {
                    const modal = new ModalBuilder().setCustomId(Math.random().toString(36).substring(2, 15)).setTitle("Edit Prefix");
                    const prefixInput = new TextInputBuilder()
                        .setCustomId("prefix")
                        .setLabel("Enter a new prefix")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(1)
                        .setValue(Settings?.settings?.prefix || config?.prefix) // Default to current prefix
                        .setMaxLength(1);

                    modal.addComponents(new ActionRowBuilder<any>().addComponents(prefixInput));
                    await i.showModal(modal);
                    const response = await i.awaitModalSubmit({ filter: (m) => m.user.id === i.user.id, time: ms("2m") });
                    if (!response) return;
                    const prefix = response.fields.getTextInputValue("prefix");
                    Settings.settings.prefix = prefix;
                    response.deferUpdate();
                    await Settings.save();
                    await genrateMenu(msg, { editMessage: true });
                    break;
                }
                case "editText": {
                    const modal = new ModalBuilder().setCustomId(Math.random().toString(36).substring(2, 15)).setTitle("Edit Text");
                    const textFiled = Settings?.settings?.text[0] === null ? "" : Settings?.settings?.text[0] || config?.text[0] || "No text set.";
                    const textInput = new TextInputBuilder()
                        .setCustomId("text")
                        .setLabel("Enter the text to log")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                        .setValue(textFiled)
                        .setMaxLength(500);

                    modal.addComponents(new ActionRowBuilder<any>().addComponents(textInput));
                    await i.showModal(modal);
                    const response = await i.awaitModalSubmit({ filter: (m) => m.user.id === i.user.id, time: ms("2m") });
                    if (!response) return;
                    const text = response.fields.getTextInputValue("text");
                    Settings.settings.text[0] = text || null;
                    response.deferUpdate();
                    await Settings.save();
                    await genrateMenu(msg, { editMessage: true });
                    break;
                }
                case "editDevelopers": {
                    const usersMenu = new UserSelectMenuBuilder().setCustomId(Math.random().toString(36).substring(2, 15)).setPlaceholder("Select Developers").setMinValues(0).setMaxValues(25).addDefaultUsers(Settings?.settings?.developers || config?.developers);
                    try {
                        await i.reply({ components: [new ActionRowBuilder<any>().addComponents(usersMenu)], flags: ["Ephemeral"] })
                        const response: UserSelectInteraction = await i.channel.awaitMessageComponent({ filter: (e) => e.user.id === i.user.id && e.customId === usersMenu.data.custom_id, time: ms("2m"), componentType: ComponentType.UserSelect }).catch((err) => null);
                        if (!response) return;
                        const selectedUsers = response.values;
                        Settings.settings.developers = selectedUsers;
                        response.deferUpdate();
                        i.deleteReply();
                        await Settings.save();
                        await genrateMenu(msg, { editMessage: true });
                    } catch (error) {
                        console.error("Error in editDevelopers:", error);
                    }


                    break;
                }
                case "editGuilds": {
                    const modal = new ModalBuilder().setCustomId(Math.random().toString(36).substring(2, 15)).setTitle("Edit Text");
                    for (let index = 0; index < 5; index++) {
                        const filed = Settings?.settings?.guilds[index];
                        const guildInput = new TextInputBuilder()
                            .setCustomId(`guild-${index}`)
                            .setLabel(`Enter Guild ID ${index + 1}`)
                            .setStyle(TextInputStyle.Short)
                            .setRequired(index === 0)
                            .setValue(filed)
                            .setMaxLength(20);
                        modal.addComponents(new ActionRowBuilder<any>().addComponents(guildInput));
                    }
                    await i.showModal(modal);
                    const response = await i.awaitModalSubmit({ filter: (m) => m.user.id === i.user.id, time: ms("2m") });
                    if (!response) return;
                    const guilds = [];
                    for (let index = 0; index < 5; index++) {
                        const guildId = response.fields.getTextInputValue(`guild-${index}`);
                        if (guildId && isValidSnowFlake(guildId)) {
                            if (!guilds.includes(guildId)) {
                                guilds.push(guildId);
                            }
                        }
                    }
                    response.deferUpdate();
                    if (guilds.length === 0) return;
                    Settings.settings.guilds = guilds;
                    response.deferUpdate();
                    Settings.save();
                    await genrateMenu(msg, { editMessage: true });
                    break
                }
                case "resetData": {
                    i.deferUpdate();
                    Settings.MakeSettings();
                    await genrateMenu(msg, { editMessage: true });
                    break;
                }


            }



        })

        collector.on("end", async () => {
            await genrateMenu(msg, { editMessage: true, disableAll: true });
        })

    },
} as any;



const genrateMenu = async (message: Message | ButtonInteraction, options: { reply?: boolean; update?: boolean; editMessage?: boolean; disableAll?: boolean } = {}) => {
    const { reply = false, update = false, editMessage = false, disableAll = false } = options;
    const buttons = [];
    const embed = new EmbedBuilder()
    let description = `## Bot Settings\n\n`;
    const color = `#${Settings?.settings?.color || config?.color}`;
    const guilds = Settings?.settings?.guilds || config.whiteListedGuilds;
    const developers = Settings?.settings?.developers || config.developers;
    const logText = Settings?.settings?.text[0] || config.text[0] || "No text set.";
    const buttonType = ButtonStyle.Secondary;
    description += client.textValue(`Text`, logText);
    description += client.textValue(`Whitelisted Guilds`, guilds.length.toString());
    description += client.textValue(`Developers`, developers.length.toString());
    description += client.textValue(`Prefix`, Settings?.settings?.prefix || config?.prefix);
    description += client.textValue(`Color`, color);
    embed.setDescription(description.slice(0, 4096));
    const editColor = new ButtonBuilder()
        .setCustomId("editColor")
        .setLabel("Edit Color")
        .setStyle(buttonType);
    const editPrefix = new ButtonBuilder()
        .setCustomId("editPrefix")
        .setLabel("Edit Prefix")
        .setStyle(buttonType);
    const editGuilds = new ButtonBuilder()
        .setCustomId("editGuilds")
        .setLabel("Edit Whitelisted Guilds")
        .setStyle(buttonType);
    const editDevelopers = new ButtonBuilder()
        .setCustomId("editDevelopers")
        .setLabel("Edit Developers")
        .setStyle(buttonType);
    const editText = new ButtonBuilder()
        .setCustomId("editText")
        .setLabel("Edit Text")
        .setStyle(buttonType);
    const resetData = new ButtonBuilder()
        .setCustomId("resetData")
        .setLabel("Reset Data")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔄");
    buttons.push(editColor, editPrefix, editGuilds, editDevelopers, editText, resetData);

    if (disableAll) {
        buttons.forEach(button => button.setDisabled(true));
    }



    const rows = chunk(buttons, 5).map(row => new ActionRowBuilder<any>().addComponents(row)).slice(0, 5);
    if (reply) {
        return await message.reply({ embeds: [embed], components: rows });
    } else if (editMessage && message instanceof Message) {
        return await message.edit({ embeds: [embed], components: rows });
    } else if (update && message instanceof ButtonInteraction) {
        return await message.update({ embeds: [embed], components: rows });
    }





}