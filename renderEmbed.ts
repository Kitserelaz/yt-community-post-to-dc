export interface EmbedLike {
  title?: string;
  description?: string;
  url?: string;
  author?: { name?: string };
  fields?: { name: string; value: string }[];
  footer?: { text: string };
}

// components v2 disables embeds, so their content is rendered as markdown instead
export const renderEmbed = (embed: EmbedLike): string =>
  [
    embed.title && `## ${embed.title}`,
    embed.author?.name && `-# ${embed.author.name}`,
    embed.description,
    ...(embed.fields ?? []).map((field) => `**${field.name}**\n${field.value}`),
    embed.url && `[Open](${embed.url})`,
    embed.footer?.text && `-# ${embed.footer.text}`,
  ]
    .filter(Boolean)
    .join("\n\n");
