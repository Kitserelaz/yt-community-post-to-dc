import { WebhookClient } from "discord.js";
import { scrapePosts } from "./scrapeyt.ts";

const dataWebhook = new WebhookClient({ url: process.env.dataWebhook! });
const dataMessage = await dataWebhook.fetchMessage(process.env.dataMessage!);

const posts = (await scrapePosts("UCAv7n_0TS3MbP3OdisnuM7A", true)).posts;
const index = posts.findIndex((post) => post.postId === dataMessage.content);
if (index === -1) throw new Error(`${dataMessage.content} is not on the channel's first page`);

const previousPost = posts[index + 1];
if (!previousPost) throw new Error(`${dataMessage.content} has no older post to revert to`);

await dataWebhook.editMessage(process.env.dataMessage!, previousPost.postId);

console.log(`Counter reverted to ${previousPost.postId}, run \`bun run .\` to send ${dataMessage.content} again`);
