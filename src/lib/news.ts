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
      title: "Kebangkitan Startup Teknologi di Indonesia 2026",
      description: "Jakarta menjadi hub teknologi utama di Asia Tenggara dengan munculnya berbagai unicorn baru di bidang AI dan Green Tech.",
      url: "#",
      image: "https://picsum.photos/seed/indo1/400/200",
      source: "IndoTech (Mock)",
      publishedAt: new Date().toISOString()
    },
    {
      id: "m2",
      title: "Pariwisata Indonesia Mengalami Lonjakan Signifikan",
      description: "Bali dan Labuan Bajo tetap menjadi primadona, sementara destinasi baru di Kalimantan mulai menarik perhatian dunia.",
      url: "#",
      image: "https://picsum.photos/seed/indo2/400/200",
      source: "Warta Wisata (Mock)",
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
      title: "Ekonomi Indonesia Tumbuh Stabil di Tengah Ketidakpastian Global",
      description: "Laporan terbaru menunjukkan ketahanan ekonomi nasional didorong oleh konsumsi domestik dan ekspor komoditas.",
      url: "#",
      image: "https://picsum.photos/seed/economy/400/200",
      source: "Bisnis Update (Mock)",
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
