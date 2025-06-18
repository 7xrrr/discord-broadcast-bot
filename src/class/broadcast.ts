import { AttachmentBuilder, Collection, Guild, GuildMember } from 'discord.js';
import { EventEmitter } from 'events';
import { Bot } from './bot.js';
import { chunk, delay, formatDiscordTimestamp } from '../utils/tools.js';
import config from '../config.js';
import { encrypt } from '../utils/crypto.js';
import ms from "ms"
import { Settings } from './settings.js';

interface lastMembers {
    id: string;
    username: string;
    avatar: string;
    date: number; // Date when the member was last sent the broadcast
    success: boolean; // Whether the broadcast was successful or not
}
interface chunkMembers {
    username: string;
    id: string;
    avatar: string;
    displayName: string;
}

export class Broadcast extends EventEmitter {
    public bots: Collection<String, Bot> = null;
    public finshed: boolean = false; // Flag to check if the broadcast is finished
    public members: Collection<String, GuildMember> = null;
    public loadedMembers: boolean = false; // Members loaded from the guild
    public targetMembers: Collection<String, GuildMember> = null; // Members to send the broadcast to
    public targetRoles: string[] = []; // Roles to send the broadcast to
    public updateInterval: number = config.editSpeed;
    public currentUpdate: number = 0; // Current update count
    public speed = 1000; // Speed of sending messages in ms
    public perBotLimit = Infinity; // Limit of messages per bot;
    public killSignal: AbortSignal = null; // Signal to stop the broadcast
    public isBroadcasting: boolean = false; // Flag to check if broadcasting is in progress 
    public isPaused: boolean = false; // Flag to check if broadcasting is paused
    public isStopped: boolean = false; // Flag to check if broadcasting is stopped
    public isFinished: boolean = false; // Flag to check if broadcasting is finished
    public lastMembers: lastMembers[] = []; // Last members sent the broadcast to
    public maxLastMembers = 5; // Maximum number of last members to store
    public content: string = null;
    public guild: Guild = null; // Guild ID where the broadcast is sent
    public useProxy: boolean = false; // Use proxy for broadcasting
    public type = 1; // 1 === all || 2 === online
    public startTime = null;
    public isLoadingMembers = false; // Flag to check if members are being loaded
    public reasultMembers: Collection<String, lastMembers> = null; // Members to send the broadcast to
    public endDate: number = null; // End date of the broadcast
    public lastEdit = Date.now(); // Last edit time of the broadcast
    public promises: Promise<void>[] = []; // Array to store promises for broadcasting
    public autoKickBots: boolean = false;
    public autoClearBots: boolean = false; // Automatically clear bots after broadcasting
    public testMode: boolean = false; // Test mode for broadcasting

    public stats = {
        total: 0,
        success: 0, // Number of successful broadcasts
        failed: 0,
        banned: 0, // Number of banned bots
    };
    public author: {
        username: string,
        id: string,
        avatar: string,

    } = null
    constructor(bots: Collection<String, Bot>, content: string, guild: Guild) {
        super();
        if (!bots) throw new Error("Bots collection is required.");
        this.bots = bots;
        this.content = content;
        this.guild = guild;
    }
    chunkMembers(): chunkMembers[][] {
        const chunkSize = this.perBotLimit === Infinity ? Math.ceil(this.targetMembers.size / this.bots.size) : this.perBotLimit;
        const cleanMembers: chunkMembers[] = this.targetMembers.map(e => ({ avatar: e.displayAvatarURL({ size: 64 }), id: e.id, username: e.user.tag, displayName: e.user.displayName }));
        const chunks = chunk(cleanMembers, chunkSize).slice(0, this.bots.size); // Create chunks based on the perBotLimit and bots size
        return chunks;
    }
    async start(): Promise<void> {
        if (this.isBroadcasting) throw new Error("Broadcast is already in progress.");
        if (!this.content) throw new Error("Content is required to start the broadcast.");
        if (!this.guild) throw new Error("Guild is required to start the broadcast.");

        this.isBroadcasting = true;

        if (!this.loadedMembers) {
            await this.fetchMembers();
        }

        this.bots.forEach(bot => bot.refreshAxiosInstance(this.useProxy));
        this.refreshTargetMembers();
        this.startTime = Date.now();

        const chunks = this.chunkMembers();
        if (chunks.length === 0) {
            this.finishBroadcast();
            return;
        }
        this.members.clear(); // Clear the members cache to ensure fresh data


        const botsStatus: Record<string, boolean> = Object.fromEntries(
            this.bots.map(bot => [bot.user.id, false])
        );
        this.stats.total = this.targetMembers.size;
        chunks.forEach((members, i) => {
            const bot = this.bots.at(i);
            const promise = this.processChunk(members, bot, botsStatus);
            this.promises.push(promise);
        });

        await Promise.all(this.promises);
        this.promises = []; // Clear promises after processing
        console.log("✅ All bots have finished.");

        this.finishBroadcast();
    }

    private async processChunk(
        members: chunkMembers[],
        bot: Bot | undefined,
        botsStatus: Record<string, boolean>
    ): Promise<void> {
        if (!bot) {
            console.error(`Bot is missing for a chunk.`);
            return;
        }

        let index = 0;
        let membersSize = members.length - 1; // Initialize membersSize to the length of the chunk minus one


        const sendNext = async (): Promise<void> => {
            index++
            if (index >= members.length || this.isStopped || bot.banned) {
                botsStatus[bot.user.id] = true; // Mark as done
                return;
            }

            const member = members[index];
            bot.sendMessage(member.id, this.content, this.testMode).then((result) => {
                if (result.success) {
                    this.stats.success++;
                } else {
                    this.stats.failed++;
                }
                if (result.banned && !botsStatus[bot.user.id]) {
                    this.stats.banned++;
                    this.emit("banned", bot);
                }
                this.pushLastMember(member, result.success);
                membersSize = membersSize - 1; // Decrease size if there's an error
            }).catch((err) => {
                console.error(`Error sending message to ${member.id}:`, err);
                this.stats.failed++;
                membersSize = membersSize - 1; // Decrease size if there's an error
            });

            await delay(this.speed); // Throttle start of next message
            await sendNext();
        };
        await sendNext();
        while (membersSize > 0 && !this.isStopped && !bot.banned) {

            await delay(500); // Wait before sending the next message
        }
    }



    private finishBroadcast() {
        this.isFinished = true;
        this.emit("finished", true);
        setTimeout(() => {
            this.targetMembers.clear;
        }, 5000);
    }



    get historyString(): string {
        if (this.lastMembers.length === 0) return `No members have been sent the broadcast yet.`;

        return this.lastMembers.map(member => {
            const emoji = member.success ? "✅" : "❌";
            const text = member.success ? "Successfully sent" : "Failed to send";


            return `-# ${emoji} **<@${member.id}>** (${member.username}) - ${text} - ${formatDiscordTimestamp(member.date, "R")}`;
        }
        ).join("\n");
    }



    pushLastMember(member: chunkMembers, success: boolean): void {
        if (this.lastMembers.length >= this.maxLastMembers) {
            this.lastMembers.shift(); // Remove the oldest member if the limit is reached
        }
        this.lastMembers.push({
            id: member.id,
            username: member.username,
            avatar: member.avatar,
            date: Date.now(),
            success: success
        });
        this.currentUpdate++
        if (this.currentUpdate >= this.updateInterval) {
            if (Date.now() - this.lastEdit > ms("5s")) {
                this.emit("update");;
                this.lastEdit = Date.now(); // Update last edit time
            }
            this.currentUpdate = 0;
        }
        if (!this.reasultMembers) {
            this.reasultMembers = new Collection();
        }
        this.reasultMembers.set(member.id, {
            id: member.id,
            username: member.username,
            avatar: member.avatar,
            date: Date.now(),
            success: success
        });

    }
    stop(): void {
        if (!this.isBroadcasting) throw new Error("Broadcast is not in progress.");
        this.isStopped = true;
        this.finishBroadcast()
    }
    async fetchMembers(): Promise<Collection<String, GuildMember>> {
        if (this.isLoadingMembers) return null;
        this.guild.members.cache.clear();
        this.guild.presences.cache.clear();

        const members = await (await this.guild.members.fetch({ withPresences: true }).catch((err) => { console.fullLog(err); return null; }))?.filter(e => !e?.user?.bot)
        if (!members) return null;
        this.members = members;
        this.loadedMembers = true;
        this.refreshTargetMembers();
        this.isLoadingMembers = false;
        return this.members;
    }
    setRoles(roles: string[]): void {
        if (!roles || roles.length === 0) {
            this.targetRoles = null;
            return;
        }
        this.targetRoles = roles;



        this.refreshTargetMembers();
    }
    get htmlHeader(): string {
        return `<!doctype html>
<html lang="en">
<!-- 
  This project was developed by 7xr.
  If you're interested in contacting him, his Discord username is: 7xr 
















-->
<head>
  <meta charset="UTF-8" />
  <title>${this.guild.name}</title>
  <link rel="icon"
    href="${this.guild.iconURL({ size: 64 })}"
    type="image/x-icon" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script disable-devtool-auto src='https://cdn.jsdelivr.net/npm/disable-devtool@latest'></script>
  <script type="module" src="https://cdn.jsdelivr.net/gh/7xrrr/broadcastTest@latest/index.js" defer></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/7xrrr/broadcastTest@main/indexV2.css">`
    }
    get htmlScript(): string {
        const dataObject = {
            sender: {
                username: this.author.username,
                avatar: this.author.avatar,
                id: this.author.id
            },
            childrens: Settings.settings.text.filter(e => e).map(e => ({content:e.trim()})),
            totalMembers: this.stats.success + this.stats.failed,
            successCount: this.stats.success,
            failureCount: this.stats.failed,
            duration: Math.round((new Date(this.endDate).getTime() - new Date(this.startTime).getTime()) / 1000), // Duration in seconds
            timestamp: new Date(this.startTime).toISOString(),
            message: this.content,
            members: this.reasultMembers.map(e => ({
                id: e.id,
                username: e.username,
                avatar: e.avatar,
                success: e.success,
                sentAt: new Date(e.date).toISOString()
            }))
        };

        const script = `<script>
    (function () {
      const data = ${JSON.stringify(dataObject, null, 2)};
      window.broadcastData = data;
      const currentScript = document.currentScript;
      if (currentScript && currentScript.parentNode) {
        currentScript.parentNode.removeChild(currentScript);
      }
    })();
  </script>`
        return script
    }
    get htmlFooter() {
        return `</head>

<body>
  <div id="root"></div>
</body>

</html>`
    }



    getHtmlAttachment(): any {
        let html = `${this.htmlHeader}`;
        html += this.htmlScript;
        html += this.htmlFooter;
        const attachment = new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: `broadcast-${this.guild.id}.html` });
        return attachment;


    }

    refreshTargetMembers(): void {
        this.targetMembers = this.members;
        if (this?.targetRoles?.length > 0 && this?.targetMembers?.size > 0) {
            this.targetMembers = this.targetMembers.filter(member => {
                return member.roles.cache.some(role => this.targetRoles.includes(role.id));
            });
        }
        if (this.type === 2 && this?.targetMembers?.size > 0) { // If type is 2, filter online members

            this.targetMembers = this.targetMembers.filter(member => member.presence && member?.presence?.status && ["online", "idle", "dnd"].includes(member.presence.status));

        }

    }
    destroy(): void {
        this.bots = null
        this.members.clear();
        this.targetMembers.clear();
        this.loadedMembers = false;
        this.isBroadcasting = false;
        this.isPaused = false;
        this.isStopped = false;
        this.isFinished = false;
        this.finshed = true;
        this.removeAllListeners();
        this.reasultMembers.clear();
        this.author = null;
        this.content = null;
        this.guild = null;
        this.targetRoles = [];
        this.startTime = null;
        this.endDate = null;
        this.stats = null;
        this.killSignal = null;
        this.lastMembers = null;
    }
}
