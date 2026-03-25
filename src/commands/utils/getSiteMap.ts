import yargs from 'yargs';
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspacePath } from '../../utils/workspace';
import { log } from '../../utils/logger';

interface SiteMapNode {
  url: string;
  title?: string;
  depth: number;
  children: SiteMapNode[];
}

async function crawlPage(page: Page, url: string, visited: Set<string>, depth: number, maxDepth: number, maxPages: number): Promise<SiteMapNode[]> {
  if (visited.size >= maxPages || depth > maxDepth) {
    return [];
  }

  if (visited.has(url)) {
    return [];
  }

  visited.add(url);

  try {
    log.info(`Crawling: ${url} (${visited.size} pages visited)`);
    
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    if (!response || response.status() >= 400) {
      log.warn(`Failed to load: ${url} - Status: ${response?.status()}`);
      return [];
    }

    const title = await page.title().catch(() => undefined);

    const nodes: SiteMapNode[] = [{
      url,
      title,
      depth,
      children: []
    }];

    if (depth < maxDepth && visited.size < maxPages) {
      const links = await page.$$eval('a[href]', (anchors) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (anchors as any[])
        .map((a: any) => a.getAttribute('href'))
        .filter((href: any): href is string => !!href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:'));
    });

      const baseUrl = new URL(url);
      const uniqueLinks = new Set<string>();

      for (const link of links) {
        if (uniqueLinks.size >= maxPages - visited.size) break;

        try {
          const absoluteUrl = new URL(link, baseUrl.origin).href;
          if (absoluteUrl.startsWith(baseUrl.origin) && !visited.has(absoluteUrl)) {
            uniqueLinks.add(absoluteUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }

      for (const link of uniqueLinks) {
        const childNodes = await crawlPage(page, link, visited, depth + 1, maxDepth, maxPages);
        nodes[0].children.push(...childNodes);
      }
    }

    return nodes;
  } catch (error: any) {
    log.warn(`Error crawling ${url}: ${error.message}`);
    return [];
  }
}

function flattenUrls(nodes: SiteMapNode[]): string[] {
  const urls: string[] = [];
  for (const node of nodes) {
    urls.push(node.url);
    if (node.children.length > 0) {
      urls.push(...flattenUrls(node.children));
    }
  }
  return urls;
}

export const getSiteMapCommand: yargs.CommandModule = {
  command: 'get-sitemap',
  describe: 'Create a site map by spidering all links using Playwright',
  builder: (yargs) => {
    return yargs
      .option('url', {
        alias: 'u',
        type: 'string',
        demandOption: true,
        description: 'Starting URL for the sitemap',
      })
      .option('max-depth', {
        type: 'number',
        default: 3,
        description: 'Maximum crawl depth',
      })
      .option('max-pages', {
        type: 'number',
        default: 100,
        description: 'Maximum number of pages to crawl',
      })
      .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output file path (default: workspace/sitemap.json)',
      })
      .option('headless', {
        type: 'boolean',
        default: true,
        description: 'Run browser in headless mode',
      });
  },
  handler: async (argv) => {
    const url = argv.url as string;
    const maxDepth = argv.maxDepth as number;
    const maxPages = argv.maxPages as number;
    const headless = argv.headless as boolean;

    log.info(`Starting sitemap generation for: ${url}`);
    log.info(`Max depth: ${maxDepth}, Max pages: ${maxPages}`);

    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({ headless });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (compatible; ZAPR-SitemapBot/1.0)',
      });
      const page = await context.newPage();

      const visited = new Set<string>();
      const sitemap = await crawlPage(page, url, visited, 0, maxDepth, maxPages);

      log.success(`Crawling complete! Found ${visited.size} pages`);

      const urls = flattenUrls(sitemap);
      log.info(`Total URLs collected: ${urls.length}`);

      const outputPath = argv.output 
        ? path.resolve(argv.output as string) 
        : getWorkspacePath('sitemap.json');

      const output = {
        baseUrl: url,
        generated: new Date().toISOString(),
        totalPages: visited.size,
        maxDepth,
        urls,
        sitemap
      };

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
      log.success(`Sitemap saved to: ${outputPath}`);
      log.info(`Found ${urls.length} unique URLs`);

    } catch (error: any) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  },
};