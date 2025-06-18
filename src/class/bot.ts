import { AxiosInstance, AxiosResponse } from "axios";
import { makeAxiosInstance } from "./axiosInstance.js";
import { APIUser, SnowflakeUtil } from "discord.js";
import { client } from "../index.js";
import config from "../config.js";
interface sendMessageResponse {
    success: boolean;
    banned: boolean;
    time?: number;
}
export class Bot {
    private _token: string;
    public axiosInstance: AxiosInstance; // Replace with actual type if available
    public user: APIUser;
    private oldAvatarHash: string = null; // Store the old avatar hash to detect changes
    private createTime: number = Date.now();
    public banned: boolean = false; // Flag to check if the bot is banned
    private _author: {
        id: string;
        username: string
    } = null
    constructor(token: string) {
        this._token = token;
        this.axiosInstance = makeAxiosInstance(token);
    }
    refreshAxiosInstance(useProxy: boolean = false) {
        this.axiosInstance = makeAxiosInstance(this._token, useProxy);
    }
    setAuthor(id: string, username: string) {
        this._author = {
            id,
            username
        }
    }
    botTag() {
        return this.user?.username ? `${this.user?.username}#${this.user?.discriminator} (${this.user?.id})` : "Unknown Bot";
    }
    async createEmoji(): Promise<void> {
        await client.createEmoji(this.user.avatar, client.rest.cdn.avatar(this.user.id, this.user.avatar, { size: 64, extension: "png", forceStatic: true }))
    }
    getEmoji(load: boolean = false): string {
        const emoji = client.getEmoji(this.user.avatar, false);
        if (emoji) return emoji.toString();
        if (load && !emoji) {
            this.loadAvatar();
        }
        return emoji || client.getEmoji("bot", false) || "🤖";
    }
    async loadAvatar(): Promise<void> {
        const oldEmoji = client.getEmoji(this.user.avatar, false);
        const newEmoji = client.getEmoji(this.user.avatar, false);
        if (this.user.avatar && this.oldAvatarHash !== this.user.avatar) {
            if (oldEmoji) await client.deleteEmoji(this.oldAvatarHash).catch(() => { /* ignore */ });
            if (!newEmoji) {
                this.createEmoji();
            }
        }
        else if (this.user.avatar && this.oldAvatarHash === this.user.avatar && !oldEmoji && !newEmoji) {
            await this.createEmoji().catch(() => { /* ignore */ });
        }
        this.oldAvatarHash = this.user.avatar; // Update the old avatar hash
    }
    async setAvatar(contentType: string, base64Image: string): Promise<AxiosResponse<any>> {
        return this.axiosInstance.patch('/users/@me', {
            avatar: `data:${contentType};base64,${base64Image}`
        });
    }
    async setName(name: string): Promise<AxiosResponse<any>> {
        return this.axiosInstance.patch('/users/@me', {
            username: name
        });
    }
    getInviteLink(): string {
        return `https://discord.com/api/oauth2/authorize?client_id=${this?.user?.id}&permissions=0&scope=bot`;
    }
    get addTime() {
        return this.createTime;
    }
    get token() {
        return this._token;
    }
    get author() {
        return this._author;
    }
    get authorString() {
        return this?._author?.username ? `${this._author.username} (${this._author.id})` : "Unknown Author";
    }

    async getUserData(): Promise<APIUser> {
        try {
            const response = await this.axiosInstance.get("/users/@me");
            if (response?.data?.id) {
                this.user = response.data;
                this.oldAvatarHash = this?.user?.avatar
                if (this.user.avatar) this.getEmoji();
            }
            return response.data;
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        }
    }
    async sendMessage(memberId: string, content: string, testMode: boolean = false): Promise<sendMessageResponse> {
        if (this.banned) return { banned: true, success: false };
        if ((config.debugMode || testMode) && !config.developers.includes(memberId)) return { banned: false, success: false, time: Date.now() };
        const channelIdReq = await this.axiosInstance.post(`https://discord.com/api/v9/users/@me/channels`, { recipients: [memberId] }).catch((err) => err?.response);
        if (!channelIdReq?.status) return { banned: false, success: false, time: Date.now() };
        if (channelIdReq?.data?.code === 20026) {
            this.banned = true;
            return { banned: true, success: false };
        }
        const id = channelIdReq?.data?.id;
        if (!id) return { banned: false, success: false, time: Date.now() };
        const body = { content: `${content} \n\n <@${memberId}>`.slice(0, 2040), tts: false };
        const messageSendReq = await this.axiosInstance.post(`https://discord.com/api/v9/channels/${id}/messages`, body).catch((err) => err?.response);

        if (messageSendReq?.status === 401) {
            this.banned = true;
            return { banned: true, success: false };
        }
        if (messageSendReq?.data?.id) {
            return { banned: false, success: true, time: SnowflakeUtil.timestampFrom(messageSendReq?.data?.id) };
        } else {
            return { banned: false, success: false, time: Date.now() };
        }
    }




    destroy() {
        this.axiosInstance = null;
        this.user = null;
        this._author = null;
        this._token = null;
        this.createTime = 0;
    }


}