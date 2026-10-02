import * as cheerio from 'cheerio';

export interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceType: 'duckduckgo' | 'wikipedia' | 'arxiv' | 'hackernews' | 'reddit' | 'github' | 'tavily';
  reliabilityScore: number;
  metadata?: Record<string, any>;
}

export class MultiSourceSearcher {
  /**
   * Dispatches queries across selected data sources in parallel
   */
  async searchAcrossSources(
    query: string,
    activeSources: string[] = ['duckduckgo', 'wikipedia', 'arxiv', 'hackernews', 'reddit', 'github', 'tavily']
  ): Promise<RawSearchResult[]> {
    const promises: Promise<RawSearchResult[]>[] = [];

    if (activeSources.includes('duckduckgo')) {
      promises.push(this.searchDuckDuckGo(query).catch(() => []));
    }
    if (activeSources.includes('wikipedia')) {
      promises.push(this.searchWikipedia(query).catch(() => []));
    }
    if (activeSources.includes('arxiv')) {
      promises.push(this.searchArXiv(query).catch(() => []));
    }
    if (activeSources.includes('hackernews')) {
      promises.push(this.searchHackerNews(query).catch(() => []));
    }
    if (activeSources.includes('reddit')) {
      promises.push(this.searchReddit(query).catch(() => []));
    }
    if (activeSources.includes('github')) {
      promises.push(this.searchGitHub(query).catch(() => []));
    }
    if (activeSources.includes('tavily')) {
      promises.push(this.searchTavilyOrFallback(query).catch(() => []));
    }

    const nestedResults = await Promise.all(promises);
    const flattened = nestedResults.flat();

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const deduplicated: RawSearchResult[] = [];
    for (const item of flattened) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        deduplicated.push(item);
      }
    }

    return deduplicated;
  }

  /**
   * DuckDuckGo search: Zero cost via HTML & Instant API
   */
  async searchDuckDuckGo(query: string): Promise<RawSearchResult[]> {
    const results: RawSearchResult[] = [];
    try {
      // 1. Try DuckDuckGo Instant Answer API
      const instantRes = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DeepResearchBot/1.0)' },
          signal: AbortSignal.timeout(3500),
        }
      );
      if (instantRes.ok) {
        const json = await instantRes.json();
        if (json.AbstractText && json.AbstractURL) {
          results.push({
            title: json.Heading || query,
            url: json.AbstractURL,
            snippet: json.AbstractText,
            sourceType: 'duckduckgo',
            reliabilityScore: 92,
          });
        }
        if (Array.isArray(json.RelatedTopics)) {
          for (const topic of json.RelatedTopics.slice(0, 3)) {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
                url: topic.FirstURL,
                snippet: topic.Text,
                sourceType: 'duckduckgo',
                reliabilityScore: 86,
              });
            }
          }
        }
      }
    } catch (e) {
      // Fall through to HTML search
    }

    if (results.length < 3) {
      try {
        // 2. Fetch DuckDuckGo HTML Lite
        const htmlRes = await fetch('https://html.duckduckgo.com/html/', {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `q=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(3500),
        });

        if (htmlRes.ok) {
          const html = await htmlRes.text();
          const $ = cheerio.load(html);
          $('.result').each((_, el) => {
            if (results.length >= 6) return;
            const titleEl = $(el).find('.result__title a');
            const snippetEl = $(el).find('.result__snippet');
            let href = titleEl.attr('href') || '';
            const title = titleEl.text().trim();
            const snippet = snippetEl.text().trim();

            // Clean DDG redirect URL /uddg=
            if (href.includes('uddg=')) {
              const matched = href.match(/uddg=([^&]+)/);
              if (matched) href = decodeURIComponent(matched[1]);
            }

            if (title && href && href.startsWith('http') && snippet) {
              results.push({
                title,
                url: href,
                snippet,
                sourceType: 'duckduckgo',
                reliabilityScore: 84,
              });
            }
          });
        }
      } catch (err) {
        // Fallback synthetic entry if offline
      }
    }

    return results;
  }

  /**
   * Wikipedia Encyclopedia search: 100% Free Open API
   */
  async searchWikipedia(query: string): Promise<RawSearchResult[]> {
    const results: RawSearchResult[] = [];
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=4&namespace=0&format=json`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const [searchTerm, titles, snippets, urls] = await res.json();
        for (let i = 0; i < titles.length; i++) {
          if (titles[i] && urls[i]) {
            results.push({
              title: titles[i],
              url: urls[i],
              snippet: snippets[i] || `Wikipedia entry on ${titles[i]}`,
              sourceType: 'wikipedia',
              reliabilityScore: 95,
            });
          }
        }
      }
    } catch (e) {
      // Graceful ignore
    }
    return results;
  }

  /**
   * ArXiv Academic Papers: 100% Free ArXiv Export API
   */
  async searchArXiv(query: string): Promise<RawSearchResult[]> {
    const results: RawSearchResult[] = [];
    try {
      const cleanTerm = query.replace(/[^\w\s]/g, '').slice(0, 80);
      const res = await fetch(
        `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(cleanTerm)}&start=0&max_results=4`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });
        $('entry').each((_, entry) => {
          const title = $(entry).find('title').text().replace(/\s+/g, ' ').trim();
          const summary = $(entry).find('summary').text().replace(/\s+/g, ' ').trim();
          const id = $(entry).find('id').text().trim();
          const published = $(entry).find('published').text().trim();

          if (title && id) {
            results.push({
              title: `[Paper] ${title}`,
              url: id,
              snippet: summary.slice(0, 350) + (summary.length > 350 ? '...' : ''),
              sourceType: 'arxiv',
              reliabilityScore: 98,
              metadata: { published },
            });
          }
        });
      }
    } catch (e) {
      // Graceful ignore
    }
    return results;
  }

  /**
   * Hacker News Search: Algolia public API
   */
  async searchHackerNews(query: string): Promise<RawSearchResult[]> {
    const results: RawSearchResult[] = [];
    try {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=4`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const json = await res.json();
        for (const hit of json.hits || []) {
          const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
          results.push({
            title: hit.title || 'Hacker News Discussion',
            url,
            snippet: `${hit.points || 0} points, ${hit.num_comments || 0} comments. Published: ${new Date(hit.created_at).toLocaleDateString()}`,
            sourceType: 'hackernews',
            reliabilityScore: 82,
            metadata: { points: hit.points, comments: hit.num_comments },
          });
        }
      }
    } catch (e) {
      // Graceful ignore
    }
    return results;
  }

  /**
   * Reddit Discussions: Public JSON endpoint
   */
  async searchReddit(query: string): Promise<RawSearchResult[]> {
    const results: RawSearchResult[] = [];
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=4`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DeepResearchBot/1.0)' },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        const children = json.data?.children || [];
        for (const post of children) {
          const d = post.data;
          if (d && d.title) {
            results.push({
              title: `r/${d.subreddit}: ${d.title}`,
              url: `https://reddit.com${d.permalink}`,
              snippet: d.selftext ? d.selftext.slice(0, 280) + '...' : `Score: ${d.score} | Comments: ${d.num_comments}`,
              sourceType: 'reddit',
              reliabilityScore: 78,
              metadata: { score: d.score, subreddit: d.subreddit },
            });
          }
        }
      }
    } catch (e) {
      // Reddit may rate-limit; ignore gracefully
    }
    return results;
  }

  /**
   * GitHub Code & Repositories: Public API
   */
  async searchGitHub(query: string): Promise<RawSearchResult[]> {
    const results: RawSearchResult[] = [];
    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=3`,
        { headers: { 'User-Agent': 'DeepResearchBot' } }
      );
      if (res.ok) {
        const json = await res.json();
        for (const repo of json.items || []) {
          results.push({
            title: `GitHub: ${repo.full_name}`,
            url: repo.html_url,
            snippet: `${repo.description || 'Open-source project'} ⭐ ${repo.stargazers_count} stars | Language: ${repo.language || 'Various'}`,
            sourceType: 'github',
            reliabilityScore: 89,
            metadata: { stars: repo.stargazers_count, language: repo.language },
          });
        }
      }
    } catch (e) {
      // Graceful ignore
    }
    return results;
  }

  /**
   * Tavily search or intelligent domain fallback
   */
  async searchTavilyOrFallback(query: string): Promise<RawSearchResult[]> {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      try {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: tavilyKey,
            query,
            search_depth: 'basic',
            max_results: 4,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          return (json.results || []).map((r: any) => ({
            title: r.title,
            url: r.url,
            snippet: r.content,
            sourceType: 'tavily',
            reliabilityScore: 94,
          }));
        }
      } catch (e) {
        // Fallback
      }
    }
    return [];
  }
}

export const multiSourceSearcher = new MultiSourceSearcher();
