/**
 * Parse CSV or plain text file to extract URLs.
 * Supports: single column, multi-column (first URL-like column used), comma/tab/newline delimited.
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const urls = [];

  for (const line of lines) {
    // Try splitting by comma or tab
    const cells = line.split(/[,\t]/).map(c => c.replace(/^["']|["']$/g, '').trim());

    for (const cell of cells) {
      if (looksLikeUrl(cell)) {
        urls.push(normalizeUrl(cell));
        break; // Take first URL-like cell per row
      }
    }

    // If no cell looks like URL, maybe entire line is a domain
    if (urls.length < lines.indexOf(line) + 1) {
      const plain = line.replace(/^["']|["']$/g, '').trim();
      if (plain && !plain.toLowerCase().includes('url') && !plain.toLowerCase().includes('website')) {
        urls.push(normalizeUrl(plain));
      }
    }
  }

  return [...new Set(urls.filter(Boolean))];
}

function looksLikeUrl(str) {
  return /^(https?:\/\/|www\.)[^\s]+/i.test(str) || /^[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}/.test(str);
}

function normalizeUrl(url) {
  url = url.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return 'https://' + url;
  return url;
}

module.exports = { parseCSV };
