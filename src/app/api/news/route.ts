import { NextResponse } from 'next/server';
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const lang = searchParams.get('lang') || 'any';
  
  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const geoParams = langMap[lang] || langMap['en'];
    // Construct Google News RSS Search URL
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${geoParams}`;

    const feed = await parser.parseURL(rssUrl);

    // Transform feed items to our internal format (limit to top 50 results)
    let articles = feed.items.slice(0, 50).map((item, index) => {
      // Decode HTML entities from title
      const fullTitle = decode(item.title || '');
      
      // Cleanup description (strip HTML tags completely)
      let description = decode(item.contentSnippet || item.content || '');
      description = description.replace(/<[^>]+>/g, '').trim();

      // Attempt to extract thumbnail image if present in the HTML content
      let image = null;
      if (item.content) {
        const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
          image = imgMatch[1];
        }
      }

      // Determine Source Name
      let sourceName = 'Google Intelligence';
      if (item.source) {
         sourceName = item.source as string;
      } else if (fullTitle.includes(' - ')) {
         const parts = fullTitle.split(' - ');
         sourceName = parts.pop() || sourceName;
      }

      // Remove source name suffix from the main title if appended
      const title = fullTitle.includes(' - ') ? fullTitle.split(' - ').slice(0, -1).join(' - ') : fullTitle;

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

    // Enforce strict chronological order (newest first)
    articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Google News RSS API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch news from RSS cascade' }, { status: 500 });
  }
}
