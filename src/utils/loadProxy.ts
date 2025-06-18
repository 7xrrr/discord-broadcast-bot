import fs from "fs";
import { client } from "../index.js";

import { findProjectRoot } from "./tools.js";
import path from "path";

export interface ProxyInterface {
    ip: string;
    authentication: string;
}

async function readProxy(): Promise<void> {
    try {
        const proxyPath = path.join(findProjectRoot(), 'proxy.txt');
        if (!fs.existsSync(proxyPath)) return console.error("Proxy file not found at:", proxyPath);
        const data = await fs.readFileSync('proxy.txt', 'utf8');
        const lines = data.split('\n');

        client.proxy.clear(); // Clear existing proxies before loading new ones
        for (const line of lines) {
            const splited = line.trim().split(":");
            if (splited.length !== 4) {
                console.log("Bad Proxy line: " + line);
                continue;
            }

            client.proxy.set(line, {
                ip: `${splited[0]}:${splited[1]}`,
                authentication: `${splited[2]}:${splited[3]}`,
            });
        }
        console.log(`Loaded ${client.proxy.size} proxies successfully.`);
    } catch (error) {
        console.error("Error reading proxy file:", error);
    }
}
export const writeProxy = async (proxies: string): Promise<void> => {
    try {
        const proxyPath = path.join(findProjectRoot(), 'proxy.txt');
        await fs.writeFileSync(proxyPath, proxies, 'utf8');
        console.log('Proxies have been written to', proxyPath);
    } catch (error) {
        console.error('Error writing to proxy file:', error);
    }


}
export default readProxy;