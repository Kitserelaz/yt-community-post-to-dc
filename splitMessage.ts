// one "atom" is either a whole markdown link, custom emoji, bare url, or a single character
const atomPattern = /\[[^\]]*\]\([^)]*\)|<a?:[a-zA-Z0-9_]+:\d+>|<https?:\/\/[^>]+>|[\s\S]/gu;

// splits a single block that is longer than the limit, breaking on the last space where possible
const splitBlock = (block: string, limit: number): string[] => {
  const chunks: string[] = [];
  let current = "";

  for (const [atom] of block.matchAll(atomPattern)) {
    if (current.length + atom.length > limit) {
      const lastSpace = current.lastIndexOf(" ");
      if (lastSpace > 0) {
        chunks.push(current.slice(0, lastSpace));
        current = current.slice(lastSpace + 1);
      } else if (current) {
        chunks.push(current);
        current = "";
      }
    }
    current += atom;
  }

  if (current) chunks.push(current);
  return chunks;
};

export const splitMessage = (text: string, limit: number): string[] => {
  const chunks: string[] = [];
  let current = "";

  for (const block of text.split("\n\n")) {
    const pieces = block.length > limit ? splitBlock(block, limit) : [block];

    for (const piece of pieces) {
      const candidate = current ? `${current}\n\n${piece}` : piece;
      if (candidate.length > limit) {
        if (current) chunks.push(current);
        current = piece;
      } else {
        current = candidate;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
};
