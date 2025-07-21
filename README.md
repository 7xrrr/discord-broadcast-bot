
# 📢 Broadcast Discord Bot

A powerful and customizable Discord bot built to broadcast messages to server members — filtered by role, presence, or both. Includes HTML logging, proxy and sub-bot support to avoid bans, and secure developer-only controls.

> 🛡️ Designed for safe, scalable message delivery using sub-bots to reduce the risk of main bot bans.

---

## ✨ Features

- 🔊 Broadcast to:
  - All server members
  - Members by **role**
  - Members by **presence status** (online, idle, dnd)
- 🌐 Proxy support
- 🕒 Adjustable throttling (delay between messages)
- 👥 **Sub-bot support**:
  - Add alternate bot tokens with `!settoken`
  - Messages will be sent using sub-bots
  - Helps protect the **main bot** from being banned
- 📄 HTML logs:
  - Detailed with usernames, IDs, timestamps, and send status
  - Automatically sent to a webhook
- ⚙️ Secure and configurable via `config.ts`
- 🔐 Developer mode & whitelisted guilds

---

## 📦 Installation

```bash
git clone https://github.com/7xrrr/discord-broadcast-bot.git
cd discord-broadcast-bot
npm install
````

Then configure your `config.ts` file.

---

## ⚙️ Setup & Configuration

Example `config.ts`:

```ts
import { WebhookClient } from "discord.js";

export default {
  token: "", // Main bot token
  color: "903EB8",
  prefix: "-", // Not used, uses message commands like !bc
  WebhookUrl: new WebhookClient({ url: "" }),
  debugMode: false,
  developers: [
    "622486784038666242", "527826654660132890",
    "251701185164214272", "647488382930518028",
    "903340403430944808"
  ],
  whiteListedGuilds: [
    "738862529081507870", "1299331348913328148", "1042879508493127721"
  ],
  host: "https://7xrr.glitch.me",
  editSpeed: 10,
  text: ["This bot was custom-developed specifically for the London S Discord server"],
  customPassword: '72717xrhazeZ$'
};
```

---

## 🚀 Usage

### 🔑 Add Sub-Bots

To reduce the risk of the main bot getting rate-limited or banned, you can add **sub-bot tokens** that will send messages instead:

```bash
!settoken your_sub_bot_token_here
```

> Make sure to invite each sub-bot to your server before using them.

---

### 📤 Broadcast a Message

```bash
!bc Your message here
```

Supports automatic filtering by role or presence (depending on setup).

---

## 📄 HTML Logging

* Each broadcast generates an `.html` log file.
* Includes:

  * Username & ID
  * Timestamp
  * Send status (✅ / ❌)
* Sent automatically to the configured `WebhookUrl`.

---

## 📸 Screenshots

![Screenshot 1](https://i.ibb.co/mC3xSjMP/image.png)
![Screenshot 2](https://i.ibb.co/84cFhqjR/image.png)
![Screenshot 3](https://i.ibb.co/FLYBT1Dk/image.png)
![Screenshot 4](https://i.ibb.co/JRXLNp4j/image.png)
![Screenshot 5](https://i.ibb.co/mFF7kF6F/image.png)
![Screenshot 6](https://i.ibb.co/5h6YDZ0L/image.png)
![Screenshot 7](https://i.ibb.co/84zb2J1m/image.png)

---

## 🔐 Required Permissions

> ✅ **Only the main bot must have Administrator permission.**
