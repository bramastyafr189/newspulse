import Parser from 'rss-parser';
import { decode } from 'html-entities';

const parser = new Parser({
  customFields: {
    item: ['source']
  }
});

// Mapping for standard languages to Google News specific hl/gl/ceid combo
const langMap: Record<string, string> = {
  'en': 'hl=en-US&gl=US&ceid=US:en',
  'id': 'hl=id&gl=ID&ceid=ID:id',
  'ja': 'hl=ja&gl=JP&ceid=JP:ja',
  'ar': 'hl=ar&gl=AE&ceid=AE:ar',
};

export async function getNewsOnServer(q: string, lang = 'any') {
  const geoParams = langMap[lang] || langMap['en'];
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${geoParams}`;

  const feed = await parser.parseURL(rssUrl);

  let articles = feed.items.slice(0, 50).map((item, index) => {
    const fullTitle = decode(item.title || '');
    const title = fullTitle.includes(' - ') ? fullTitle.split(' - ').slice(0, -1).join(' - ') : fullTitle;
    
    let description = decode(item.contentSnippet || item.content || '');
    description = description.replace(/<[^>]+>/g, '').trim();

    // Remove redundant title and source from the description
    // Google News often puts "Title - Source" at the start of the content snippet
    if (description.startsWith(fullTitle)) {
      description = description.substring(fullTitle.length).trim();
    } else if (description.startsWith(title)) {
      description = description.substring(title.length).trim();
    }

    // Clean up leading punctuation that might remain after removing the title (e.g. " - " or ": ")
    description = description.replace(/^[\s\-\:\u00A0]+/, '').trim();

    let image: string | null = null;
    if (item.content) {
      const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch) image = imgMatch[1];
    }

    // Extract source name correctly
    let sourceName = 'Google Intelligence';
    if (item.source) {
      sourceName = item.source as string;
    } else if (fullTitle.includes(' - ')) {
      const parts = fullTitle.split(' - ');
      sourceName = parts.pop() || sourceName;
    }

    // If description is identical to sourceName, it's redundant
    if (description === sourceName) {
      description = '';
    }

    return {
      id: item.guid || `${Date.now()}-${index}`,
      title: title,
      description: description,
      url: item.link || '',
      image: image,
      source: sourceName,
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
    };
  });

  articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return articles;
}
