import { Client, Events, GatewayIntentBits, NewsChannel, PermissionFlagsBits, TextChannel } from "discord.js";
import { createInterface } from "node:readline/promises";

const readline = createInterface({ input: process.stdin, output: process.stdout });
const channelId = (await readline.question("Channel ID: ")).trim();
readline.close();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (readyClient) => {
  try {
    console.log(`Logged in as ${readyClient.user.tag}!`);

    const channel = await readyClient.channels.fetch(channelId);
    if (!(channel instanceof TextChannel || channel instanceof NewsChannel)) {
      throw new Error(`${channelId} is not a text or announcement channel`);
    }

    if (!channel.permissionsFor(readyClient.user)?.has(PermissionFlagsBits.ManageWebhooks)) {
      throw new Error(`Missing Manage Webhooks in #${channel.name}`);
    }

    const webhook = await channel.createWebhook({ name: channel.name });
    console.log(`Webhook created in #${channel.name}: ${webhook.url}`);
  } finally {
    await client.destroy();
  }
});

client.login(process.env.token);
