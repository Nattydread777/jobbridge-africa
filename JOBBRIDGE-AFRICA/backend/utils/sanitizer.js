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

export const cleanHtmlDescription = (htmlString) => {
  if (htmlString === null || htmlString === undefined) return '';
  const $ = load(String(htmlString), {}, false);
  $('script, style, noscript, template').remove();
  $('br').replaceWith('\n');
  $('p, div, section, article, h1, h2, h3, h4, h5, h6, li').each(function addLineBreak() {
    $(this).append('\n');
  });
  const visibleText = $.root().text();
  const decoded = load(visibleText, {}, false).root().text();
  return decoded
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
