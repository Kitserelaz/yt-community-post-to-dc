import { WebhookClient } from "discord.js";
import { createInterface } from "node:readline/promises";
import { scrapePosts } from "./scrapeyt.ts";

const posts = (await scrapePosts("UCAv7n_0TS3MbP3OdisnuM7A", true)).posts;

for (const [index, post] of posts.entries()) {
  console.log(`${index + 1}. ${post.postId}  ${post.content?.[0]?.text?.slice(0, 60) ?? ""}`);
}

const readline = createInterface({ input: process.stdin, output: process.stdout });
const choice = Number(await readline.question("Post: "));
readline.close();

const post = posts[choice - 1];
if (!post) throw new Error(`Invalid choice: ${choice}`);

const dataWebhook = new WebhookClient({ url: process.env.dataWebhook! });
const message = await dataWebhook.send(post.postId);

console.log(`Data message created: ${message.id}`);
