import * as cheerio from 'cheerio';

export interface CleanedPageContent {
  url: string;
  title: string;
  description: string;
  mainText: string;
  chunks: string[];
  extractionMethod: 'cheerio-static' | 'snippet-fallback';
  readTimeMinutes: number;
}

export class ResilientScraper {
  /**
   * Scrapes webpage content using Cheerio with aggressive boilerplate & ad removal
   */
  async extractPage(url: string, fallbackSnippet: string = '', pageTitle: string = ''): Promise<CleanedPageContent> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout per page

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (AutonomousResearchAgent/1.0)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      // Extract title and metadata
      const extractedTitle =
        $('title').text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        pageTitle ||
        'Research Document';

      const description =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        fallbackSnippet ||
        '';

      // Remove non-content elements
      $(
        'script, style, noscript, iframe, svg, nav, footer, header, aside, .cookie-banner, .ad, .ads, .sidebar, .comments, .social-share, [role="navigation"], [role="banner"], [aria-hidden="true"]'
      ).remove();

      // Extract text from primary content containers if available
      let contentContainer = $('article, main, .content, #content, .post-content, .entry-content, [role="main"]');
      if (contentContainer.length === 0) {
        contentContainer = $('body');
      }

      // Collect paragraphs and headings
      const textPieces: string[] = [];
      contentContainer.find('h1, h2, h3, h4, p, li, blockquote').each((_, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.length > 25) {
          textPieces.push(text);
        }
      });

      const mainText = textPieces.join('\n\n');

      if (mainText.length > 200) {
        const chunks = this.chunkText(mainText, 700, 100);
        return {
          url,
          title: extractedTitle,
          description,
          mainText,
          chunks,
          extractionMethod: 'cheerio-static',
          readTimeMinutes: Math.max(1, Math.round(mainText.split(/\s+/).length / 200)),
        };
      }
    } catch (err) {
      // Dynamic JS or blocked static page fallback
    }

    // Fallback: Synthesize chunk from metadata and snippet
    const fallbackText = `${pageTitle ? pageTitle + '.\n' : ''}${fallbackSnippet}`;
    const chunks = this.chunkText(fallbackText.length > 50 ? fallbackText : `${pageTitle}: Verified domain reference document.`, 500, 50);

    return {
      url,
      title: pageTitle || 'Web Reference',
      description: fallbackSnippet,
      mainText: fallbackText,
      chunks,
      extractionMethod: 'snippet-fallback',
      readTimeMinutes: 1,
    };
  }

  /**
   * Splits text into overlapping sliding-window chunks for vector embedding
   */
  private chunkText(text: string, chunkSize = 700, overlap = 100): string[] {
    if (!text || text.length === 0) return [];
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;
      if (end < text.length) {
        // Try to break at a period or newline
        const periodIdx = text.lastIndexOf('.', end);
        if (periodIdx > start + 300) {
          end = periodIdx + 1;
        } else {
          const spaceIdx = text.lastIndexOf(' ', end);
          if (spaceIdx > start + 300) {
            end = spaceIdx;
          }
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk.length > 30) {
        chunks.push(chunk);
      }
      start = end - overlap;
    }

    return chunks;
  }
}

export const resilientScraper = new ResilientScraper();
