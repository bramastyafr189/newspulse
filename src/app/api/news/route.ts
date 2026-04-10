import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const lang = searchParams.get('lang');
  const country = searchParams.get('country');
  
  const apiKey = process.env.GNEWS_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    return NextResponse.json({ error: 'API Key missing' }, { status: 401 });
  }

  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    // GNews API: Using dynamic lang and country filters if provided
    let url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&max=10&token=${apiKey}`;
    if (lang && lang !== 'any') url += `&lang=${lang}`;
    if (country && country !== 'any') url += `&country=${country}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.errors) {
      return NextResponse.json({ error: data.errors[0] }, { status: 500 });
    }

    // Transform GNews response to our internal format
    const articles = data.articles.map((article: any, index: number) => ({
      id: `${Date.now()}-${index}`,
      title: article.title,
      description: article.description,
      url: article.url,
      image: article.image,
      source: article.source.name,
      publishedAt: article.publishedAt,
    }));

    return NextResponse.json(articles);
  } catch (error) {
    console.error('GNews API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
