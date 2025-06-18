// file: structures/EmbedBuilder.ts
import { EmbedBuilder as DiscordEmbedBuilder } from "discord.js";
import config from "../config.js"; // adjust path to your config
import { Settings } from "../class/settings.js";

export class EmbedBuilder extends DiscordEmbedBuilder {
  constructor(options?: any) {
    super(options);
    this.setColor(`#${Settings?.settings?.color || config.color}`); // assume config.color is a valid hex color or ColorResolvable
  }
}



