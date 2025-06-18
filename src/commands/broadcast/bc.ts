import { ActionRowBuilder, AnySelectMenuInteraction, ButtonBuilder, ButtonInteraction, ButtonStyle, Interaction, Message, ModalBuilder, RoleSelectMenuBuilder, RoleSelectMenuInteraction, TextInputBuilder, TextInputStyle } from "discord.js";
import { EmbedBuilder } from "../../utils/embedBuilder.js";
import ms from "ms";
import { pageMenu } from "../../class/pageMenu.js";
import { client, CustomClient } from "../../index.js";
import { chunk, duration, formatDiscordTimestamp, getGuildIcon } from "../../utils/tools.js";
import { Broadcast } from "../../class/broadcast.js";
import { Bot } from "../../class/bot.js";
import config from "../../config.js";
import { encrypt } from "../../utils/crypto.js";
export default {
    name: "bc",
    aliases: ["obc"],
    description: "Broadcast a message to all or selected members.",
    permissions: ["Administrator"],
    roleRequired: "", // id here
    cooldown: ms("15s"), // in ms
    flags: {
        devOnly: true
    },
    function: async function (client: CustomClient, message: Message, args: string[]) {
        if (client.activeBroadcasts) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`There is already an active broadcast.`)],
        });

        const content = args.join(" ").trim();
        if (content.length === 0) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`Please type the message u want to broadcast.`)],
        });
        if (client.tokens.size === 0) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`There are no tokens to broadcast with.`)],
        });
        const tokens = client.tokens.filter(e => e?.user?.username);
        const allEmoji = client.getEmoji("all", false) || "🌐";
        let broadcast: Broadcast = null;
        const menu = new pageMenu([...tokens.random(24).map((token, index) => {
            return {
                label: `${token.botTag()}`.slice(0, 100),
                description: `Author: ${token.authorString}`.slice(0, 100),
                emoji: token.getEmoji(true),
                value: token.user.id
            }
        }), { emoji: `${allEmoji}`, label: "All Tokens", value: "all", description: "send with all tokens", }])
        menu.setPerPageLimit(25); menu.setMaxValues(99); menu.setMinValues(1); menu.setCustomId("bc_menu"); menu.setPlaceholder("Select tokens to broadcast with");
        let msg = await genrateMenu(message, menu, { sendMessage: true, edit: false, reply: false }) as Message
        if (!msg) return;
        let statusMsg = null;

        const collector = msg.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: ms("1h"), });

        collector.on("collect", async (i: ButtonInteraction | AnySelectMenuInteraction) => {
            if (i.customId === "bc_menu" && i.isStringSelectMenu()) {
                menu.setSelected(i.values);
                await genrateMenu(i, menu, { update: true });

            }
            if (!i.isButton()) return;
            switch (i.customId) {
                case "confirm": {
                    const bots = menu.selected.includes("all") ? client.tokens : client.tokens.filter(e => menu.selected.includes(e.user.id));
                    broadcast = new Broadcast(bots, content, message.guild);
                    broadcast.author = {
                        avatar: message.author.displayAvatarURL({ size: 128 }),
                        id: message.author.id,
                        username: `${message.author.displayName} (${message.author.username})`,
                    }
                    genrateSettingsEmbed(i, broadcast, { update: true });
                    break;
                };
                case "load_members": {
                    broadcast.isLoadingMembers = true;
                    genrateSettingsEmbed(i, broadcast, { update: true }).catch(() => { /* ignore */ });
                    broadcast.isLoadingMembers = false
                    broadcast.fetchMembers().then(() => {
                        genrateSettingsEmbed(msg, broadcast, { editMessage: true }).catch(() => { /* ignore */ });
                    })
                    break;
                };
                case "select_roles": {
                    const rolesMenu = new RoleSelectMenuBuilder().setCustomId(client.genrateUniqueId()).setPlaceholder("Select roles to broadcast to").setMaxValues(25).setMinValues(0);
                    // @ts-ignore
                    if (broadcast.targetRoles?.size > 0) rolesMenu.setDefaultRoles(broadcast.targetRoles.map(e => e));
                    const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(rolesMenu);
                    await i.reply({ components: [row], ephemeral: true });
                    const response: RoleSelectMenuInteraction = await i.channel.awaitMessageComponent({ filter: (interaction) => interaction.user.id === i.user.id && interaction.isRoleSelectMenu() && interaction.customId === rolesMenu.data.custom_id, time: ms("5m"), }).catch(() => null);
                    i.deleteReply();
                    if (!response) return
                    const roles = response.values;
                    broadcast.setRoles(roles);
                    await genrateSettingsEmbed(msg, broadcast, { editMessage: true });
                    break;
                }
                case "proxy": {
                    if (client?.proxy?.size === 0) return i.reply({ embeds: [new EmbedBuilder().setDescription("There are no proxies to use for broadcasting.")], ephemeral: true });
                    broadcast.useProxy = !broadcast.useProxy;
                    genrateSettingsEmbed(i, broadcast, { update: true });
                    break;
                }
                case "speed": {
                    const speedModal = new ModalBuilder().setCustomId(client.genrateUniqueId()).setTitle("Set Speed").addComponents([
                        new ActionRowBuilder<any>().addComponents(new TextInputBuilder().setCustomId("speed").setMaxLength(4).setMinLength(2).setPlaceholder(`Enter speed in ms (default: 1000)`).setLabel("Speed").setStyle(TextInputStyle.Short).setRequired(true).setValue(broadcast.speed.toString())),
                    ])
                    await i.showModal(speedModal);
                    const response = await i.awaitModalSubmit({ filter: (interaction) => interaction.user.id === i.user.id && interaction.customId === speedModal.data.custom_id, time: ms("2m"), }).catch(() => null);
                    if (!response) return;
                    const speed = parseInt(response.fields.getTextInputValue("speed"));
                    if (isNaN(speed) || speed <= 0) return response.reply({ embeds: [new EmbedBuilder().setDescription("You didn't provide a valid speed.")], ephemeral: true });
                    if (speed < 50) return response.reply({ embeds: [new EmbedBuilder().setDescription("The speed must be greater than 50ms.")], ephemeral: true });
                    if (speed > 10000) return response.reply({ embeds: [new EmbedBuilder().setDescription("The speed must be less than 10 seconds.")], ephemeral: true });
                    response.deferUpdate();
                    broadcast.speed = speed;
                    await genrateSettingsEmbed(msg, broadcast, { editMessage: true });
                    break;
                }
                case "per_bot_limit": {
                    const perBotLimitModal = new ModalBuilder().setCustomId(client.genrateUniqueId()).setTitle("Set Per Bot Limit").addComponents([
                        new ActionRowBuilder<any>().addComponents(new TextInputBuilder().setCustomId("per_bot_limit").setMaxLength(4).setMinLength(1).setPlaceholder(`Enter limit (default: ${broadcast.perBotLimit === Infinity ? "Auto" : broadcast.perBotLimit})`).setLabel("Per Bot Limit").setStyle(TextInputStyle.Short).setRequired(true).setValue(broadcast.perBotLimit === Infinity ? "auto" : broadcast.perBotLimit.toString())), //== SHORT
                    ]);
                    await i.showModal(perBotLimitModal);
                    const response = await i.awaitModalSubmit({ filter: (interaction) => interaction.user.id === i.user.id && interaction.customId === perBotLimitModal.data.custom_id, time: ms("2m"), }).catch(() => null);
                    if (!response) return;
                    const perBotLimit = response.fields.getTextInputValue("per_bot_limit");
                    if (perBotLimit.toLowerCase() === "auto" || parseInt(perBotLimit) === 0) {
                        broadcast.perBotLimit = Infinity;
                    } else {
                        const limit = parseInt(perBotLimit);
                        if (isNaN(limit) || limit <= 0) return response.reply({ embeds: [new EmbedBuilder().setDescription("You didn't provide a valid limit.")], ephemeral: true });
                        response.deferUpdate();
                        broadcast.perBotLimit = limit;
                    }
                    response.deferUpdate();
                    await genrateSettingsEmbed(msg, broadcast, { editMessage: true });
                    break
                }
                case "type": {
                    broadcast.type = broadcast.type === 1 ? 2 : 1;
                    broadcast.refreshTargetMembers();
                    genrateSettingsEmbed(i, broadcast, { update: true });
                    break;
                }
                case "auto_clear": {
                    broadcast.autoClearBots = !broadcast.autoClearBots;
                    genrateSettingsEmbed(i, broadcast, { update: true });
                };
                case "auto_kick": {
                    broadcast.autoKickBots = !broadcast.autoKickBots;
                    genrateSettingsEmbed(i, broadcast, { update: true });
                    break;
                }
                case "test_mode": {
                    broadcast.testMode = !broadcast.testMode;
                    genrateSettingsEmbed(i, broadcast, { update: true });
                    break;
                }
                case "start_broadcast": {
                    if (client.activeBroadcasts) return i.reply({ embeds: [new EmbedBuilder().setDescription("There is already an active broadcast.")], ephemeral: true });
                    if (broadcast.isBroadcasting) return i.reply({ embeds: [new EmbedBuilder().setDescription("Broadcast is already in progress.")], ephemeral: true });
                    if (!broadcast.loadedMembers || broadcast.targetMembers.size === 0) return i.reply({ embeds: [new EmbedBuilder().setDescription("You need to load members before starting the broadcast.")], ephemeral: true });

                    const checkBots = await message.guild.members.fetch({ user: broadcast.bots.map(e => e.user.id) }).catch(() => null);
                    const missingBots = broadcast.bots.filter(e => !checkBots?.has(e.user.id));
                    if (missingBots.size > 0) {
                        const buttons = [];
                        const components = [];
                        missingBots.forEach(bot => {
                            buttons.push(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(`${bot.botTag()}`).setURL(bot.getInviteLink()))
                        })
                        const rows = chunk(buttons, 5).map(row => new ActionRowBuilder<any>().addComponents(row)).slice(0, 5);
                        components.push(...rows);
                        return i.reply({ embeds: [new EmbedBuilder().setDescription(`Some bots are not in the server: \`${missingBots.size}\``)], components, ephemeral: true });
                    }

                    broadcast.start();
                    client.activeBroadcasts = true;
                    genrateSettingsEmbed(i, broadcast, { update: true });


                    statusMsg = await resaultEmbed(msg, broadcast, { sendMessage: true });

                    if (!statusMsg) return;
                    broadcast.once("finished", async () => {
                        broadcast.endDate = Date.now();
                        broadcast.emit("update");
                        broadcast.bots.forEach(e => e.refreshAxiosInstance(false))
                        collector?.stop();
                        await finishBroadCast(statusMsg, broadcast);
                        client.activeBroadcasts = false;
                        const bots = broadcast.bots.filter(e => e);
                        if (bots.size > 0 && broadcast.autoKickBots) {
                            const botMembers = await message.guild.members.fetch({ user: bots.map(e => e.user.id) }).catch(() => null);
                            if (botMembers) {
                                botMembers.forEach(bot => {
                                    bot.kick(`Broadcast finished: ${broadcast.type === 1 ? "All Members" : "Online Members"}`).catch(() => { /* ignore */ })
                                });
                            }
                        }
                        if (bots.size > 0 && broadcast.autoClearBots) {
                            bots.forEach(e => client.tokens.delete(e?.user?.id))
                        }


                    })
                    broadcast.on("update", () => resaultEmbed(statusMsg, broadcast, { editMessage: true }));
                    broadcast.on("banned", async (bot: Bot) => {
                        broadcast.emit("update")
                        const embed = new EmbedBuilder()
                            .setDescription(`Bot ${bot.botTag()} has been banned from Discord or token changed.`).setColor("Red")
                        statusMsg?.reply({ embeds: [embed] }).catch(() => { /* ignore */ });
                    })
                    break;
                }
                case "stop_broadcast": {
                    if (broadcast.isStopped) return i.reply({ embeds: [new EmbedBuilder().setDescription("Broadcast is already stopped.")], ephemeral: true });
                    broadcast.stop();
                    genrateSettingsEmbed(i, broadcast, { update: true });
                    break;
                }






            }

        });

        collector.on("end", () => {
            genrateSettingsEmbed(msg, broadcast, { editMessage: true, endMessage: true });
            if (broadcast.isBroadcasting) return;
            setTimeout(() => {
                broadcast = null;
                msg = null;
                statusMsg = null;
            }, 10000);
        })






    }
} as any;
const finishBroadCast = async (statusMessage: Message, broadcast: Broadcast) => {
    const buttons = [];
    const embed = new EmbedBuilder()
        .setThumbnail(getGuildIcon(statusMessage.guild))
        .setAuthor({ name: statusMessage.guild.name, iconURL: getGuildIcon(statusMessage.guild), })
    let description = `## Broadcast Finished\n`;
    description += client.textValue("Start Time", formatDiscordTimestamp(broadcast.startTime, "Date"), true);
    description += client.textValue("End Time", formatDiscordTimestamp(broadcast.endDate, "Date"), true);
    description += client.textValue("Duration", duration(broadcast.endDate - broadcast.startTime, "en"));
    description += client.textValue(`Staff`, `${broadcast.author?.username || "Unknown"}`, false);



    description += `## Broadcast Results\n`;
    const total = broadcast.stats.success + broadcast.stats.failed;
    description += `${client.textValue("Total", total.toString())}`;
    description += `${client.textValue("Success", broadcast.stats.success.toString())}`;
    description += `${client.textValue("Failed", broadcast.stats.failed.toString())}`;


    description += `${client.textValue("Banned", broadcast.stats.banned.toString())}`;
    description += `## Bot status:\n`;
    broadcast.bots.forEach(bot => {
        description += client.textValue(`<@${bot.user.id}>`, bot.banned ? "Banned" : "Active");
    });
    embed.setDescription(description.trim().slice(0, 4080));
    const file = broadcast.getHtmlAttachment();
    const WebhookMessage = await config.WebhookUrl.send({ files: [file] }).catch((err) => null)
    const fileId = WebhookMessage?.id
    const urlButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("View Results")
    if (fileId && WebhookMessage) {
        urlButton.setURL(`${config.host}/${encrypt(fileId)}`);
        buttons.push(urlButton)
    }
    const rows = chunk(buttons, 5).map(row => new ActionRowBuilder<any>().addComponents(row)).slice(0, 3)
    await statusMessage.reply({ embeds: [embed], components: rows }).catch((err) => null)
    setTimeout(() => {
        broadcast.destroy();
        broadcast = null;
    }, 5000);


}

const resaultEmbed = async (i: Interaction | Message, broadcast: Broadcast, config: { sendMessage?: boolean, editMessage?: boolean, update?: boolean, edit?: boolean, reply?: boolean }) => {
    const embed = new EmbedBuilder()
        .setThumbnail(getGuildIcon(i.guild))
        .setAuthor({ name: i.guild.name, iconURL: getGuildIcon(i.guild), })
    let description = `## Broadcast Results\n${client.textValue("Success", broadcast.stats.success.toString())}`;
    description += `${client.textValue("Failed", broadcast.stats.failed.toString())}`;
    const total = broadcast.stats.success + broadcast.stats.failed;
    description += `${client.textValue("Total", total.toString())}`;
    description += `${client.textValue("Banned", broadcast.stats.banned.toString())}`;
    description += `## Sending History:\n${broadcast.historyString}`;
    embed.setDescription(description.trim().slice(0, 4080));




    if (i instanceof Message && config.sendMessage) {
        return await i.reply({ embeds: [embed], components: [], });
    } else if ('update' in i && typeof i.update === 'function' && config.update) {

        return await i.update({ embeds: [embed], components: [] });
    } else if ('edit' in i && typeof i.edit === 'function' && config.editMessage) {
        return await i.edit({ embeds: [embed], components: [] });
    }







}





const genrateSettingsEmbed = async (i: Interaction | Message, broadcast: Broadcast, config: { sendMessage?: boolean, update?: boolean, endMessage?: boolean, edit?: boolean, editMessage?: boolean, reply?: boolean }) => {
    const buttons = [];
    const endMessage = config?.endMessage === true
    const embed = new EmbedBuilder()
        .setThumbnail(getGuildIcon(i.guild))
        .setAuthor({ name: i.guild.name, iconURL: getGuildIcon(i.guild), })
    const memberCount = broadcast.isBroadcasting ? broadcast.stats.total : broadcast.loadedMembers ? broadcast.targetMembers.size.toString() : "No Members Loaded";
    let description = `## Broadcast Settings\n${client.textValue("Bots", broadcast.bots.size.toString())}`;
    description += `${client.textValue("Type", broadcast.type === 1 ? "All Members" : "Online Members")}`;
    description += `${client.textValue("Roles", broadcast.targetRoles?.length > 0 ? broadcast.targetRoles.length.toString() : "No roles selected")}`;
    description += `${client.textValue("Members", memberCount.toString())}`;
    description += `${client.textValue("Proxy", `${broadcast.useProxy ? "Enabled" : "Disabled"}`)}`;
    description += `${client.textValue("Speed", ms(broadcast.speed, { long: true }))}`;
    description += `${client.textValue(`Per Bot Limit`, broadcast.perBotLimit === Infinity ? "Auto" : broadcast.perBotLimit.toString(), false)}`;
    description += `${client.textValue("Auto Kick Bots", `${broadcast.autoKickBots ? "Enabled" : "Disabled"}`)}`;
    description += `${client.textValue("Auto Clear Bots", `${broadcast.autoClearBots ? "Enabled" : "Disabled"}`)}`;
    description += `${client.textValue("Test Mode", `${broadcast.testMode ? "Enabled" : "Disabled"}`)}`;
    description += `## Content:\n\n\`\`\`${broadcast.content}\`\`\`\n`
    embed.setDescription(description.trim().slice(0, 4080));
    const buttonStyle = ButtonStyle.Secondary;
    const startEmoji = client.getEmoji("start", false)
    const startButton = new ButtonBuilder()
        .setCustomId("start_broadcast")
        .setLabel("Start")
        .setStyle(ButtonStyle.Success)
        .setDisabled(endMessage || !broadcast.loadedMembers || broadcast.targetMembers.size === 0 || broadcast.isBroadcasting);
    if (startEmoji) startButton.setEmoji(startEmoji);
    const loadEmoji = client.getEmoji("import", false)
    const loadMembersButton = new ButtonBuilder()
        .setCustomId("load_members")
        .setStyle(buttonStyle)
        .setDisabled(endMessage || broadcast.isBroadcasting);
    if (loadEmoji) loadMembersButton.setEmoji(loadEmoji);
    if (broadcast.isLoadingMembers) {
        const loadingEmoji = client.getEmoji("loading_circle", false) || "🔄";
        if (loadingEmoji) {
            loadMembersButton.setEmoji(loadingEmoji);
        }
        loadMembersButton.setDisabled(true);
    }
    else {
        loadMembersButton.setLabel("Load Members")
    };
    const selectEmoji = client.getEmoji("list", false) || "🔍";

    const selectRolesButtons = new ButtonBuilder()
        .setCustomId("select_roles")
        .setLabel("Select Roles")
        .setStyle(buttonStyle)
        .setDisabled(endMessage || broadcast.isBroadcasting || !broadcast.loadedMembers);
    if (selectEmoji) selectRolesButtons.setEmoji(selectEmoji);
    const proxyEmoji = client.getEmoji("proxy", false) || "🌐";
    const proxyButton = new ButtonBuilder()
        .setCustomId("proxy")
        .setLabel("Use Proxy")
        .setStyle(buttonStyle)
        .setDisabled(endMessage || broadcast.isBroadcasting);
    if (proxyEmoji) proxyButton.setEmoji(proxyEmoji);
    const speedEmoji = client.getEmoji("speed", false) || "⚡";
    const speedButton = new ButtonBuilder()
        .setCustomId("speed")
        .setLabel("Speed")
        .setStyle(buttonStyle)
        .setDisabled(endMessage || broadcast.isBroadcasting);
    if (speedEmoji) speedButton.setEmoji(speedEmoji);
    const perBotEmoji = client.getEmoji("limit", false);
    const perBotLimit = new ButtonBuilder()
        .setCustomId("per_bot_limit")
        .setLabel("Per Bot Limit")
        .setStyle(buttonStyle)
        .setDisabled(endMessage || broadcast.isBroadcasting);
    if (perBotEmoji) perBotLimit.setEmoji(perBotEmoji);


    const type = new ButtonBuilder()
        .setCustomId("type")
        .setLabel("Type")
        .setStyle(buttonStyle)
        .setDisabled(endMessage || broadcast.isBroadcasting);
    if (broadcast.type === 1) {
        const allEmoji = client.getEmoji("all", false) || "🌐";
        type.setEmoji(allEmoji);

    }
    else {
        const onlineEmoji = client.getEmoji("online", false) || "🟢"
        type.setEmoji(onlineEmoji);
    }
    if (broadcast.isBroadcasting) {
        const stopEmoji = client.getEmoji("stop", false);
        const stopButton = new ButtonBuilder()
            .setCustomId("stop_broadcast")
            .setLabel("Stop")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(endMessage || broadcast.isStopped || broadcast.isFinished);
        if (stopEmoji) stopButton.setEmoji(stopEmoji);
        buttons.push(stopButton);
    } else {
        buttons.push(startButton);
    }
    const autoEmoji = client.getEmoji("auto_kick", false) || "🤖";
    const autoKickButton = new ButtonBuilder()
        .setCustomId("auto_kick")
        .setLabel("Auto Kick Bots")
        .setStyle(buttonStyle)
        .setDisabled(endMessage || broadcast.isBroadcasting);
    if (autoEmoji) autoKickButton.setEmoji(autoEmoji);
    const autoClearEmoji = client.getEmoji("auto_clear", false) || "🗑️";
    const autoClearButton = new ButtonBuilder()
        .setCustomId("auto_clear")
        .setLabel("Auto Clear Bots")
        .setStyle(buttonStyle)
        .setDisabled(endMessage || broadcast.isBroadcasting);
    if (autoClearEmoji) autoClearButton.setEmoji(autoClearEmoji);
    const testModeEmoji = client.getEmoji("test_mode", false) || "🧪";
    const testModeButton = new ButtonBuilder()
        .setCustomId("test_mode")
        .setLabel("Test Mode")
        .setStyle(buttonStyle)
        .setDisabled(endMessage || broadcast.isBroadcasting);
    if (testModeEmoji) testModeButton.setEmoji(testModeEmoji);


    buttons.push(type, loadMembersButton, selectRolesButtons, proxyButton, speedButton, perBotLimit, autoKickButton, autoClearButton, testModeButton);
    const rows = chunk(buttons, 5).map(row => new ActionRowBuilder<any>().addComponents(row)).slice(0, 3)

    if (i instanceof Message && config.sendMessage) {
        return await i.reply({ embeds: [embed], components: rows, });
    } else if ('update' in i && typeof i.update === 'function' && config.update) {

        return await i.update({ embeds: [embed], components: rows });
    } else if ('edit' in i && typeof i.edit === 'function' && config.editMessage) {
        return await i.edit({ embeds: [embed], components: rows });
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
