import type { ExtractedContent } from '../types';

export function extractThinkingBlocks(raw: string): ExtractedContent {
  const blocks: string[] = [];
  const fullRegex = /<((?:antml:)?thinking)>[\s\S]*?<\/\1>/g;
  let match;

  while ((match = fullRegex.exec(raw)) !== null) {
    const tag = match[1];
    const inner = match[0]
      .replace(new RegExp(`^<${tag}>`), '')
      .replace(new RegExp(`</${tag}>$`), '')
      .trim();
    if (inner) blocks.push(inner);
  }

  let visible = raw.replace(fullRegex, '');

  const openRegex = /<((?:antml:)?thinking)>/g;
  let lastOpen: { tag: string; index: number; end: number } | null = null;
  while ((match = openRegex.exec(raw)) !== null) {
    lastOpen = { tag: match[1], index: match.index, end: openRegex.lastIndex };
  }

  if (lastOpen) {
    const closeTag = `</${lastOpen.tag}>`;
    if (raw.indexOf(closeTag, lastOpen.end) === -1) {
      const unfinished = raw.slice(lastOpen.end).trim();
      if (unfinished) blocks.push(unfinished);
      visible = raw.slice(0, lastOpen.index).replace(fullRegex, '');
    }
  }

  return { visible: visible.trim(), blocks };
}

export function hasUnclosedThinkingTag(raw: string): boolean {
  const openRegex = /<((?:antml:)?thinking)>/g;
  let lastOpen: { tag: string; index: number; end: number } | null = null;
  let match;
  while ((match = openRegex.exec(raw)) !== null) {
    lastOpen = { tag: match[1], index: match.index, end: openRegex.lastIndex };
  }
  if (!lastOpen) return false;
  const closeTag = `</${lastOpen.tag}>`;
  return raw.indexOf(closeTag, lastOpen.end) === -1;
}
