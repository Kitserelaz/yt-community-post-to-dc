import { WebhookClient, ComponentType, ButtonStyle, MessageFlags, type Webhook, Client, Events, GatewayIntentBits, TextChannel } from 'discord.js';
import { writeFile } from "node:fs/promises";
import { scrapePosts, type Post } from "./scrapeyt.ts";
import { formatNews } from "./formatNews.ts";
import { splitMessage } from "./splitMessage.ts";
import { renderEmbed } from "./renderEmbed.ts";

const dataWebhook = new WebhookClient({ url: process.env.dataWebhook! });
const fetchDataMessage = async () => await dataWebhook.fetchMessage(process.env.dataMessage!);
const webhookClient = new WebhookClient({ url: process.env.webhook! });
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.on(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.login(process.env.token);



// — example usage —
const raw = `
DLTVNEWS 2025.07.24

1 ECONOMY : Canada's inflation rate cooled slightly in June, hitting 3.1%.

2 SPORTS : The Vancouver Vipers clinched their first playoff berth in franchise history.
`;

console.log(formatNews(raw));

export interface PostContent {
  text: string;
  url?: string;
  webPageType?: string;
}
let shouldUseZWS = false;
const handleYTPost = async (post: Post, webhook: Webhook | WebhookClient, subtext?: string | null) => {
  console.log(post.postId);
  const multiImage = [];
  if (post.attachment.multiImage) {
    for (const image of post.attachment.multiImage) {
      multiImage.push({
        attachment: Buffer.from(await (await fetch(image.at(-1)!.url)).arrayBuffer()),
        name: post.postId + "-" + multiImage.length + ".png"
      })
    }
  }
  const embed = post.attachment.poll ? [
    {
      title: "Poll",
      description: post.attachment.poll.choices.join("\n"),
      footer: {
        text: post.attachment.poll.pollType + " \u2022 " + post.attachment.poll.totalVotes
      }
    }
  ] : (post.attachment.video ? [
    {
      title: post.attachment.video.title,
      description: post.attachment.video.descriptionSnippet,
      author: post.attachment.video.owner.name ? {
        name: post.attachment.video.owner.name,
        icon_url: post.attachment.video.owner.thumbnails?.at(-1)?.url,
        url: "https://youtube.com" + post.attachment.video.owner.url
      } : undefined,
      footer: post.attachment.video.publishedTimeText ? {
        text: post.attachment.video.lengthText.long + " \u2022 " + post.attachment.video.viewCountText + " \u2022 " + post.attachment.video.publishedTimeText
      } : undefined,
      url: post.attachment.video.videoId ? "https://www.youtube.com/watch?v=" + post.attachment.video.videoId : undefined
    }
  ] : (post.attachment.quiz ? [
    {
      title: "Quiz",
      fields: post.attachment.quiz.choices.map(choice => ({
        name: (choice.isCorrect ? "\u2705" : "\u274C") + " " + choice.text,
        value: choice.explanation
      })),
      footer: {
        text: post.attachment.quiz.quizType + " \u2022 " + post.attachment.quiz.totalVotes + " \u2022 " + (post.attachment.quiz.disableChangingQuizAnswer ? "Changing quiz answer disabled" : "Changing quiz answer enabled") + " \u2022 " + (post.attachment.quiz.enableAnimation ? "Animated" : "Not animated")
      }
    }
  ] : []))
  const parsePostContent = (postContent: {
    text: string,
    url?: string,
    webPageType?: string
  }[]) => postContent.map(content => content.url ? (content.url === content.text ? content.url : `[${content.text}](https://youtube.com${content.url})`) : content.text).join("")
  const contents = parsePostContent(post.content ?? []);
  const files = post.attachment.image ? [
    {
      attachment: Buffer.from(await (await fetch(post.attachment.image.at(-1)!.url)).arrayBuffer()),
      name: post.postId + ".png"
    }
  ] : multiImage;
  const sharedImage = post.sharedPost?.attachment.image?.at(-1)?.url
    ?? post.sharedPost?.attachment.multiImage?.[0]?.at(-1)?.url;
  const imageUrls = [
    ...files.map((file) => `attachment://${file.name}`),
    ...(sharedImage ? [sharedImage] : []),
  ];
  const sharedPostEmbed = post.sharedPost ? {
    title: "Shared Post",
    description: parsePostContent(post.sharedPost.content).slice(0, 4096),
    author: {
      icon_url: "https:" + post.sharedPost.author.thumbnails.at(-1)!.url,
      name: post.sharedPost.author.name,
      url: "https://youtube.com" + post.sharedPost.author.url
    },
    image: sharedImage ? { url: sharedImage } : undefined,
    fields: post.sharedPost.attachment.multiImage ? [
      {
        name: "Images",
        value: post.sharedPost.attachment.multiImage.map(image => image.at(-1)!.url).join("\n\n")
      }
    ] : undefined,
    url: "https://www.youtube.com/post/" + post.sharedPost.postId
  } : null;
  const embeds = [...embed, ...(sharedPostEmbed ? [sharedPostEmbed] : [])];
  const buttonRow = {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Link,
        url: "https://www.youtube.com/post/" + post.postId,
        label: "Original Post"
      }
    ]
  };
  const news = formatNews(contents) + (subtext ? "\n-# " + subtext : "");
  const username = post.author.name + (shouldUseZWS ? " ." : "");
  const avatarURL = "https:" + post.author.thumbnails.at(-1)?.url;

  // short posts stay legacy messages so they keep a content preview; long ones fall back to components v2
  const payloads = news.length <= 2000 ? [
    { content: news, files, embeds, username, avatarURL, components: [buttonRow] }
  ] : splitMessage(
    [news, ...embeds.map(renderEmbed).filter((extraText) => extraText)].join("\n\n"),
    4000
  ).map((chunk, index, chunks) => ({
    flags: MessageFlags.IsComponentsV2,
    withComponents: true,
    files: index === chunks.length - 1 ? files : [],
    username,
    avatarURL,
    components: [
      { type: ComponentType.TextDisplay, content: chunk },
      ...(index === chunks.length - 1 && imageUrls.length ? [
        {
          type: ComponentType.MediaGallery,
          items: imageUrls.map((url) => ({ media: { url } }))
        }
      ] : []),
      ...(index === chunks.length - 1 ? [buttonRow] : [])
    ]
  }));

  const channel = await client.channels.fetch("1217494766397296771") as TextChannel;
  let crossposted = false;
  for (const [index, payload] of payloads.entries()) {
    const isLast = index === payloads.length - 1;
    const webhookMessage = await webhook.send(payload);

    const message = await channel.messages.fetch(webhookMessage.id);
    if (message.crosspostable) {
      //await message.crosspost();
      crossposted = true;
    }
    console.log(`Waiting 10s before ${isLast ? "pinging" : "sending the next part"}`);
    await Bun.sleep(10000);
  }

  if (crossposted) await (await client.channels.fetch("1298636053552300052") as TextChannel).send("<@&a1216817149335703572>");
}

const searchPosts = async () => {
  const posts = await scrapePosts("UCAv7n_0TS3MbP3OdisnuM7A", true);
  const previousLast = (await fetchDataMessage()).content;
  const newPosts = [];
  for (const post of posts.posts) {
    if (post.postId === previousLast) break;
    newPosts.push(post);
  }
  newPosts.reverse();
  console.log(newPosts.length)
  await writeFile("newPosts.json", JSON.stringify(newPosts, null, 4))

  for (const post of newPosts) {
    try {
      await handleYTPost(post, webhookClient);
    } catch (error) {
      console.warn(`Failed to post ${post.postId}: ${(error as Error).message}`);
      await (await client.channels.fetch("1298636053552300052") as TextChannel).send(
        `<@&1565940566095560815> Failed to post https://www.youtube.com/post/${post.postId}: ${(error as Error).message}`
      );
    }
    await dataWebhook.editMessage(process.env.dataMessage!, post.postId);
    shouldUseZWS = !shouldUseZWS;
  }
};

const pollPosts = async () => {
  try {
    await searchPosts();
  } catch (error) {
    console.error("Post polling failed:", error);
  }
};

await pollPosts();

setInterval(pollPosts, 60000);

Bun.serve({
  port: 3000,
  fetch(req) {
  return new Response("The sending to DC web service is active.");
  }
});
