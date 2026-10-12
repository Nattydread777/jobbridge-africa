import { load } from 'cheerio';

export const cleanHtmlSnippet = (htmlString) => {
  if (htmlString === null || htmlString === undefined) return '';
  const source = String(htmlString);
  const $ = load(source, {}, false);
  $('script, style, noscript, template').remove();
  const visibleText = $.root().text();

  // Decode entities while ensuring encoded markup cannot reintroduce tags.
  const decoded = load(visibleText, {}, false).root().text();
  return decoded.replace(/\s+/g, ' ').trim();
};
