
import fs from "fs";

import path from "path";
import { findProjectRoot } from "./tools.js";
import { CustomClient } from "../index.js";
import axios from 'axios';




export async function loadEmojis(client: CustomClient) {


  const emojiPath = path.join(findProjectRoot(), "emojis");
  const readDir = await fs.readdirSync(emojiPath);
  const emojis = await client.application.emojis.fetch().catch((err) => null);

  const unavailableEmojis = readDir.filter((emoji) => !emojis.find((e) => e.name === emoji.split(".")[0]));
  unavailableEmojis.forEach(async (emoji) => {


    client.application.emojis.create({
      attachment: path.join("./emojis", emoji),
      name: emoji.split(".")[0],



    }).then((emoji) => {
      console.log(`Emoji ${emoji.name} created`);
    }).catch((err) => {
      console.log(`Error creating emoji ${emoji}: ${err.message}`);
    })


  })

}






export async function createEmojiFromUrl(
  client: CustomClient,
  emojiUrl: string,
  emojiName: string
): Promise<string | null> {
  try {
    let uniqueEmojiName = emojiName.trim().toLowerCase();
    let emojiCache = client.getEmoji(uniqueEmojiName,false);

    // If emoji already exists, append timestamp
    if (emojiCache) {
      uniqueEmojiName = `${emojiName}_${Date.now()}`;
    }

    const response = await axios.get(emojiUrl, { responseType: "arraybuffer" });

    const createdEmoji = await client.application.emojis.create({
      attachment: response.data,
      name: uniqueEmojiName,
    });

    return createdEmoji.toString();
  } catch (error) {
    console.error(`Error creating emoji "${emojiName}": ${error.message}`);
    return null;
  }
}



