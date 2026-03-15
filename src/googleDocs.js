const axios = require('axios');

/**
 * Fetch a public Google Doc and extract URLs from its content.
 * Supports:
 *   - Published Google Docs (docs.google.com/document/d/ID/pub)
 *   - Exported as plain text
 *   - Google Sheets exported as CSV
 */
async function fetchGoogleDoc(docUrl) {
  if (!docUrl) throw new Error('No URL provided');

  let fetchUrl = docUrl;

  // Convert standard doc URL to export URL
  const docMatch = docUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  const sheetMatch = docUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);

  if (docMatch) {
    const id = docMatch[1];
    fetchUrl = `https://docs.google.com/document/d/${id}/export?format=txt`;
  } else if (sheetMatch) {
    const id = sheetMatch[1];
    // Get gid if present
    const gidMatch = docUrl.match(/gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    fetchUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  }

  let text;
  try {
    const res = await axios.get(fetchUrl, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EmailScraper/1.0)',
      },
      maxRedirects: 5,
    });
    text = res.data.toString();
  } catch (err) {
    throw new Error(`Could not fetch Google Doc: ${err.message}. Make sure the document is set to "Anyone with the link can view".`);
  }

  // Extract URLs from the text
  const urlRegex = /(?:https?:\/\/|www\.)[^\s,\n\r"'<>]+/gi;
  const allMatches = text.match(urlRegex) || [];

  // Also try line-by-line parsing (for plain domain lists)
  const lines = text.split(/[\r\n,]+/).map(l => l.trim()).filter(Boolean);
  const domainRegex = /^(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}/;

  const urls = new Set();

  for (const match of allMatches) {
    const clean = match.replace(/[.,;'")\]>]+$/, '');
    urls.add(normalizeUrl(clean));
  }

  for (const line of lines) {
    const clean = line.replace(/[.,;'")\]>]+$/, '').trim();
    if (domainRegex.test(clean) && !clean.includes(' ')) {
      urls.add(normalizeUrl(clean));
    }
  }

  const result = [...urls].filter(Boolean);
  if (result.length === 0) {
    throw new Error('No URLs found in the document. Make sure the document contains website URLs or domain names.');
  }

  return result;
}

function normalizeUrl(url) {
  if (!url) return null;
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) return 'https://' + url;
  return url;
}

module.exports = { fetchGoogleDoc };
