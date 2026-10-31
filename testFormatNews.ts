import { formatNews } from "./formatNews.ts";
import { splitMessage } from "./splitMessage.ts";
import { scrapePosts } from "./scrapeyt.ts";

const posts = (await scrapePosts("UCAv7n_0TS3MbP3OdisnuM7A", true)).posts;

let passed = 0;

for (const post of posts) {
  const raw = (post.content ?? []).map((content) => content.text).join("");

  try {
    const chunks = splitMessage(formatNews(raw), 4000);
    const longest = Math.max(...chunks.map((chunk) => chunk.length));
    if (longest > 4000) throw new Error(`chunk of ${longest} characters`);

    passed++;
    console.log(`PASS ${post.postId} (${chunks.length} chunk${chunks.length === 1 ? "" : "s"})`);
  } catch (error) {
    console.log(`FAIL ${post.postId}: ${(error as Error).message}`);
  }
}

console.log(`\n${passed}/${posts.length} posts parsed`);
