export const formatNews = (raw: string): string => {
  const lines: string[] = raw
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // first line can be "NAME DATE" or "NAME - DATE"; anything else is plain body text
  const headerMatch: RegExpMatchArray | undefined = lines[0]?.match(
    /^(\S+)\s*-?\s*(\d{4}\.\d{1,2}\.\d{1,2})$/
  );
  const newsName: string | undefined = headerMatch?.[1];
  const newsDate: string | undefined = headerMatch?.[2];
  const bodyLines: string[] = headerMatch ? lines.slice(1) : lines;

  // spin emoji (swap ID if yours differs per newsName)
  const spinEmoji = `<a:MJV_${newsName}spin:1275203664277016657>`;

  const titleLines: string[] = headerMatch
    ? [`# ${spinEmoji}${newsName}${spinEmoji}`, `## ${newsDate}`, '']
    : [];

  const digitEmoji: Record<string, string> = {
    '1': '<:MJV_1:1403666931059261590>',
    '2': '<:MJV_2:1403666934666362953>',
    '3': '<:MJV_3:1403666936067264512>',
    '4': '<:MJV_4:1403666937170366547>',
    '5': '<:MJV_5:1403666938772852746>',
    '6': '<:MJV_6:1403666940244918311>',
    '7': '<:MJV_7:1403666942237216798>',
    '8': '<:MJV_8:1403666943570870363>',
    '9': '<:MJV_9:1403666975581802619>',
    '0': '<:MJV_0:1403666929511698545>',
  };

  const items: string[] = [];

  for (const line of bodyLines) {
    // Case: standalone UPDATE
    const updateMatch = line.match(/^UPDATE\s*:\s*(.+)$/i);
    if (updateMatch) {
      const [, updateText] = updateMatch;
      items.push(`**UPDATE :** ${updateText!.trim()}`);
      continue;
    }

    // Otherwise, numbered item
    // First try "1 : CATEGORY : text"
    let m = line.match(/^(\d+)\s*:\s*([^:]+?)\s*:\s*(.+)$/);
    let numStr: string, category: string | null, text: string;

    if (m && !m[2]?.trim()?.endsWith("http") && !m[2]?.trim()?.endsWith("https")) {
      [, numStr, category, text] = m.map((s) => s.trim()) as [string, string, string, string];
    } else {
      // Then try "1 CATEGORY : text"
      m = line.match(/^(\d+)\s+([^:]+?)\s*:\s*(.+)$/);
      if (m && !m[2]?.trim()?.endsWith("http") && !m[2]?.trim()?.endsWith("https")) {
        [, numStr, category, text] = m.map((s) => s.trim()) as [string, string, string, string];
      } else {
        // Finally "1 : text" (no category)
        m = line.match(/^(\d+)\s*:\s*(.+)$/);
        if (!m) {
          // Not a numbered item: keep the line as written
          items.push(line);
          continue;
        }
        [, numStr, text] = m.map((s) => s.trim()) as [string, string, string];
        category = null;
      }
    }

    // build bullet by mapping digits
    const bullet = numStr
      .split('')
      .map((d) => digitEmoji[d] || '')
      .join('');

    if (category) {
      items.push(`${bullet} **${category} :** ${text.trim()}`);
    } else {
      items.push(`${bullet} ${text.trim()}`);
    }
  }

  const footer: string = `============================================================

*For you who are reading this outside the server and want to get informed on your server by following server announcements, you need to get Level 10 in Millennavia, Boudroholm. Join here: <https://discord.gg/fk4gPDeaCP> [verification required]
For you who are not subscribed and reading this in Discord, subscribe: <https://www.youtube.com/@MillenniumXYZNews>*`;

  return [...titleLines, ...items, footer].join('\n\n');
};
