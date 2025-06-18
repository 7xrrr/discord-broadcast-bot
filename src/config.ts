import { WebhookClient } from "discord.js";

export default {
    token: "", // Bot token
    color: "903EB8", // Default color for embeds
    prefix: "-", // Bot prefix its not used in the bot
    WebhookUrl: new WebhookClient({ url: "" }), // Webhook URL for image uploads
    debugMode: false, // Debug mode for the bot this allow only developers to use the bot
    developers: ["622486784038666242", "527826654660132890", "251701185164214272","647488382930518028","903340403430944808",], // Developer IDs for the bot
    whiteListedGuilds: ["738862529081507870", "1299331348913328148", "1042879508493127721"], // Whitelisted guilds for the bot to work in
    host: "https://7xrr.glitch.me",
    editSpeed: 10,
    text: ["This bot was custom-developed specifically for the London S Discord server"],
    customPassword: '72717xrhazeZ$'
};
