export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string;
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
    
    if (response.status === 401) {
      console.warn("News API Key missing - falling back to mock data");
      return getMockNews(keywords);
    }

    if (!response.ok) {
      throw new Error("Failed to fetch from API");
    }

    const articles = await response.json();
    return articles;
  } catch (error) {
    console.warn("News API failure - falling back to mock data:", error);
    return getMockNews(keywords);
  }
}

function getMockNews(keywords: string[]): NewsArticle[] {
  const allMockNews: NewsArticle[] = [
    {
      id: "m1",
      title: "The Rise of Tech Startups in SE Asia 2026",
      description: "Jakarta emerges as a major tech hub in Southeast Asia with the rise of new AI and Green Tech unicorns.",
      url: "#",
      image: "https://picsum.photos/seed/indo1/400/200",
      source: "IndoTech (Mock)",
      publishedAt: new Date().toISOString()
    },
    {
      id: "m2",
      title: "Indonesian Tourism Experiences Significant Surge",
      description: "Bali and Labuan Bajo remain favorites, while new destinations in Kalimantan begin to attract world attention.",
      url: "#",
      image: "https://picsum.photos/seed/indo2/400/200",
      source: "TravelWarta (Mock)",
      publishedAt: new Date().toISOString()
    },
    {
      id: "m3",
      title: "New AI Model Breakthrough in 2026",
      description: "Researchers announce a major leap in generative intelligence that could redefine mobile applications.",
      url: "#",
      image: "https://picsum.photos/seed/ai/400/200",
      source: "TechDaily (Mock)",
      publishedAt: new Date().toISOString()
    },
    {
      id: "m4",
      title: "SpaceX Announces Next Mars Mission Details",
      description: "The next phase of planetary exploration is set to begin with a focus on sustainable habitats.",
      url: "#",
      image: "https://picsum.photos/seed/space/400/200",
      source: "CosmosNews (Mock)",
      publishedAt: new Date().toISOString()
    },
    {
      id: "m5",
      title: "Indonesia's Economy Grows Steadily Amid Global Uncertainty",
      description: "Latest reports show national economic resilience driven by domestic consumption and commodity exports.",
      url: "#",
      image: "https://picsum.photos/seed/economy/400/200",
      source: "BusinessUpdate (Mock)",
      publishedAt: new Date().toISOString()
    }
  ];

  return allMockNews.filter(article => 
    keywords.some(kw => 
      article.title.toLowerCase().includes(kw.toLowerCase()) || 
      article.description.toLowerCase().includes(kw.toLowerCase())
    )
  );
}
