import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Collection, Message } from "discord.js";
import { client, CustomClient } from "../../index.js";
import ms from "ms";
import { EmbedBuilder } from "../../utils/embedBuilder.js";
import { ProxyInterface, writeProxy } from "../../utils/loadProxy.js";
import { chunk, delay, hideSensitive } from "../../utils/tools.js";
import { customAxiosWithProxy } from "../../class/axiosInstanceCustomProxy.js";
interface checkedProxie {
    ip: string;
    status: number;
    responseTime: number;
    key: string;
}
export default {
    name: "checkproxy",
    aliases: ["cp"],
    description: "Check proxies status and remove failed ones.",
    permissions: ["Administrator"],
    roleRequired: "", // id here
    cooldown: ms("15s"), // in ms
    flags: {
        devOnly: true
    },
    function: async function (client: CustomClient, message: Message, args: string[]) {
        const proxies = client.proxy;
        if (proxies.size === 0) return message.reply({
            embeds: [new EmbedBuilder().setDescription(`No proxies loaded.`)]
        });
        const checkedProxies: Collection<String, checkedProxie> = new Collection();
        proxies.map((proxy: ProxyInterface, key: string) => checkedProxies.set(proxy.ip, { ip: proxy.ip, status: 0, responseTime: 0, key }));
        let config = { started: false, autoRemove: false }
        const msg: any = await genrateProxyEmbed(config, proxies, checkedProxies, message, { reply: true });


        const collector = msg.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: ms("1h"), });

        collector.on("collect", async (i: ButtonInteraction) => {
            if (!i.isButton()) return;
            switch (i.customId) {
                case "start_check_proxy": {
                    if (config.started) return i.reply({ content: "Proxy checking is already started.", ephemeral: true });
                    config.started = true;
                    await genrateProxyEmbed(config, proxies, checkedProxies, i, { update: true, disableAll: true });
                    for (let index = 0; index < proxies.size; index++) {
                        const proxy = proxies.at(index);
                        let axiosInstance = customAxiosWithProxy(client.token, proxy)
                        const user = await axiosInstance.get("/users/@me").then(res => res.data).catch(() => null);
        
                        if (!user?.id) {
                            checkedProxies.get(proxy.ip).status = 2; // Failed
                        } else {
                            checkedProxies.get(proxy.ip).status = 1; // Success
                        }
                        await delay(1000);
                        await genrateProxyEmbed(config, proxies, checkedProxies, msg, { editMessage: true, disableAll: true });
                        axiosInstance = null; // Clear the axios instance to free memory
                    }
                    await msg.reply({
                        embeds: [new EmbedBuilder().setDescription(`Proxy checking completed. ${checkedProxies.filter(p => p.status === 1).size} proxies are working.`)],
                        components: []
                    })
                    collector.stop("completed");
                    break
                }
                case "auto_remove": {
                    config.autoRemove = !config.autoRemove;
                    await genrateProxyEmbed(config, proxies, checkedProxies, i, { update: true });
                    break
                }
            }


        })

        collector.on("end", async () => {
            genrateProxyEmbed(config, proxies, checkedProxies, msg, { editMessage: true, disableAll: true });



            if (config.autoRemove) {
                checkedProxies.map((proxy, key) => {
                    if (proxy.status === 2) {
                        proxies.delete(proxy.key);
                        client.proxy.delete(proxy.key);
                        checkedProxies.delete(key);
                    }

                });
                
                await writeProxy(proxies.map((e, key) => `${key}`).join("\n"));
            }
            checkedProxies.clear();
        })


    },
} as any;


const genrateProxyEmbed = async (checkerConfig: any, proxies: Collection<String, ProxyInterface>, checkedProxie: Collection<String, checkedProxie>, message: Message | ButtonInteraction, config: { update?: boolean, editMessage?: boolean, reply?: boolean, disableAll?: boolean }) => {
    const { editMessage = false, reply = false, disableAll = false } = config;
    const buttons = [];
    const checked = checkedProxie.filter(proxy => proxy.status !== 0).size;
    const embed = new EmbedBuilder().setThumbnail(client.user?.displayAvatarURL());
    embed.setFooter({ text: `${checked}/${proxies.size} proxies checked.\n\n` });
    let description = "## Proxy Checker\n\n";

    description += `${client.textValue(`Auto Remove`, checkerConfig.autoRemove ? "Enabled" : "Disabled")}\n`;
    checkedProxie.forEach(proxy => {
        description += `-# - \`${hideSensitive(proxy.ip.split(":")[0], 6)} ${proxy.status === 1 ? "✅" : proxy.status === 0 ? "⌛" : "❌"}\`\n`;
    })
    embed.setDescription(description.slice(0, 4096));
    const startEmoji = client.getEmoji("start", false)
    const startButton = new ButtonBuilder()
        .setCustomId("start_check_proxy")
        .setLabel("Start")
        .setStyle(ButtonStyle.Success)
        .setDisabled(checkerConfig?.started === true ? true : false);
    if (startEmoji) startButton.setEmoji(startEmoji);
    const autoRemoveEmoji = client.getEmoji("auto_remove", false)
    const autoRemoveButton = new ButtonBuilder()
        .setCustomId("auto_remove")
        .setLabel("Auto Remove")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(false);
    if (autoRemoveEmoji) autoRemoveButton.setEmoji(autoRemoveEmoji);
    buttons.push(startButton, autoRemoveButton);
    if (disableAll || checkerConfig?.started) {
        buttons.forEach(button => button.setDisabled(true));
    }
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