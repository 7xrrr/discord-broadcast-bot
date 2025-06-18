import fs from 'fs';
import path from 'path';
import { findProjectRoot } from '../utils/tools.js';
import config from '../config.js';
interface settings {
    guilds: string[],
    developers: string[],
    text: string[],
    color: string,
    prefix?: string,

}






export class Settings {
    public static loaded = false;
    public static settings: settings;
    static async load() {
        const filePath = path.join(findProjectRoot(), 'settings.json');
        if (!fs.existsSync(filePath)) {
            console.error('Settings file not found:', filePath);
            this.MakeSettings();
            this.loaded = true;
            return;
        }
        try {
            const data = fs.readFileSync(filePath, 'utf-8');
            this.settings = JSON.parse(data) as settings;
            this.loaded = true;
            console.log('Settings loaded successfully.');
        } catch (error) {
            console.error('Error loading settings:', error);
            this.MakeSettings();
        }
    }
    static async save() {
        const filePath = path.join(findProjectRoot(), 'settings.json');
        try {
            fs.writeFileSync(filePath, JSON.stringify(this.settings, null, 4), 'utf-8');
            console.log('Settings saved successfully.');
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    static MakeSettings() {
        this.settings = {
            guilds: config.whiteListedGuilds,
            developers: config.developers,
            text: config.text,
            color: config.color,
            prefix: config.prefix,
        }
        this.save();
    }
}
