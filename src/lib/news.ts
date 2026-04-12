export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  source: string;
  publishedAt: string;
}

export async function fetchNews(keywords: string[], lang?: string | null, country?: string | null): Promise<NewsArticle[]> {
  if (keywords.length === 0) return [];

  const query = keywords.join(" ");
  let url = `/api/news?q=${encodeURIComponent(query)}`;
  if (lang && lang !== 'any') url += `&lang=${lang}`;
  if (country && country !== 'any') url += `&country=${country}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Intelligence feed error: ${response.status}`);
    }

    const articles = await response.json();
    return articles;
  } catch (error) {
    console.error("News stream intercepted or failed:", error);
    return []; // Return empty array on failure instead of fake data
  }
}
