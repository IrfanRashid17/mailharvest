const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const SKIP_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|webp|pdf|zip|rar|mp4|mp3|css|js|woff|woff2|ttf|ico)$/i;

const PRIORITY_PATHS = ['contact', 'about', 'team', 'staff', 'support', 'help', 'info', 'reach-us', 'get-in-touch', 'connect'];

const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  },
  maxRedirects: 5,
});

function normalizeUrl(base, href) {
  try {
    const u = new URL(href, base);
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

function isSameDomain(base, link) {
  try {
    const b = new URL(base);
    const l = new URL(link);
    return l.hostname === b.hostname || l.hostname.endsWith('.' + b.hostname);
  } catch {
    return false;
  }
}

function extractEmails(text) {
  const raw = text.match(EMAIL_REGEX) || [];
  return [...new Set(raw.filter(e => {
    // Filter out common false positives
    if (e.endsWith('.png') || e.endsWith('.jpg') || e.endsWith('.gif')) return false;
    if (e.includes('example.com') || e.includes('yourdomain')) return false;
    if (e.startsWith('no-reply@') || e.startsWith('noreply@')) return true;
    return true;
  }))];
}

function priorityScore(url) {
  const lower = url.toLowerCase();
  for (let i = 0; i < PRIORITY_PATHS.length; i++) {
    if (lower.includes(PRIORITY_PATHS[i])) return PRIORITY_PATHS.length - i;
  }
  return 0;
}

async function fetchPage(url) {
  const res = await axiosInstance.get(url);
  return res.data;
}

async function scrapeEmails(startUrl, onPage) {
  // Normalize start URL
  let base = startUrl.trim();
  if (!/^https?:\/\//i.test(base)) base = 'https://' + base;

  const visited = new Set();
  const queue = [base];
  const allEmails = new Set();
  const MAX_PAGES = 10;
  let pageCount = 0;

  // First pass: collect all links from homepage to sort by priority
  let discoveredLinks = [];

  while (queue.length > 0 && pageCount < MAX_PAGES) {
    // Sort queue by priority
    queue.sort((a, b) => priorityScore(b) - priorityScore(a));

    const url = queue.shift();
    if (visited.has(url)) continue;
    if (SKIP_EXTENSIONS.test(url)) continue;

    visited.add(url);
    pageCount++;

    if (onPage) onPage(pageCount, Math.min(queue.length + pageCount, MAX_PAGES));

    try {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);

      // Extract emails from HTML text
      const pageText = $.text();
      const htmlStr = html.toString();

      // Also check mailto: links
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href');
        const email = href.replace('mailto:', '').split('?')[0].trim();
        if (email && EMAIL_REGEX.test(email)) allEmails.add(email);
      });

      // Extract from visible text and raw HTML
      extractEmails(pageText).forEach(e => allEmails.add(e));
      extractEmails(htmlStr).forEach(e => allEmails.add(e));

      // Discover new links
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const abs = normalizeUrl(url, href);
        if (!abs) return;
        if (!isSameDomain(base, abs)) return;
        if (SKIP_EXTENSIONS.test(abs)) return;
        if (!visited.has(abs) && !queue.includes(abs)) {
          queue.push(abs);
        }
      });

    } catch (err) {
      // Skip failed pages silently
    }

    // Small delay to be respectful
    await sleep(300);
  }

  return [...allEmails];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { scrapeEmails };
