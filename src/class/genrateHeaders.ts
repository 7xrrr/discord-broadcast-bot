interface HeaderOptions {
    authToken: string;
    accept?: string;
    acceptLanguage?: string;
    superProperties?: string;
}

export const DefaultUserAgent =
	`DiscordBot (https://discord.js.org, [VI]{{inject}}[/VI])` as `DiscordBot (https://discord.js.org, ${string})`;
function generateHeaders(token:string,options?: HeaderOptions): { [key: string]: string } {
    const headers: { [key: string]: string } = {
        'accept': options?.accept || '*/*',
        'accept-language': options?.acceptLanguage || 'en,en-US;q=0.9,ar;q=0.8',
        "authorization": `Bot ${token}`,
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'User-Agent': DefaultUserAgent,
        "content-type": "application/json"

    };

    if (options?.superProperties) {
        headers['x-super-properties'] = options?.superProperties;
    }

    return headers;
}


export { generateHeaders };
