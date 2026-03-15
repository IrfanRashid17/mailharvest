const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { scrapeEmails } = require('./src/scraper');
const { parseCSV } = require('./src/csvParser');
const { fetchGoogleDoc } = require('./src/googleDocs');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Allow embedding from any origin (WordPress site iframe)
app.use(cors({ origin: '*' }));
app.use(express.json());

// Allow iframe embedding from WordPress — remove X-Frame-Options restriction
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// SSE clients map: jobId -> res
const clients = new Map();
// Job results map: jobId -> { results, status }
const jobs = new Map();

function sendEvent(jobId, data) {
  const res = clients.get(jobId);
  if (res) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// SSE endpoint
app.get('/api/stream/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  clients.set(jobId, res);
  req.on('close', () => clients.delete(jobId));
});

// Start scraping job from URL list
app.post('/api/scrape', async (req, res) => {
  const { urls, jobId } = req.body;
  if (!urls || !jobId) return res.status(400).json({ error: 'Missing urls or jobId' });

  res.json({ ok: true });
  runJob(jobId, urls);
});

// Upload CSV
app.post('/api/upload-csv', upload.single('file'), async (req, res) => {
  try {
    const text = req.file.buffer.toString('utf8');
    const urls = parseCSV(text);
    res.json({ urls });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Fetch Google Doc
app.post('/api/google-doc', async (req, res) => {
  const { docUrl } = req.body;
  try {
    const urls = await fetchGoogleDoc(docUrl);
    res.json({ urls });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get job results
app.get('/api/results/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

async function runJob(jobId, urls) {
  const results = [];
  jobs.set(jobId, { status: 'running', results, total: urls.length, done: 0 });

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) continue;

    sendEvent(jobId, { type: 'progress', url, index: i, total: urls.length, status: 'scraping' });

    try {
      const emails = await scrapeEmails(url, (page, pagesTotal) => {
        sendEvent(jobId, { type: 'page', url, page, pagesTotal });
      });

      const result = { url, emails, status: 'done' };
      results.push(result);
      sendEvent(jobId, { type: 'result', ...result, index: i });
    } catch (err) {
      const result = { url, emails: [], status: 'error', error: err.message };
      results.push(result);
      sendEvent(jobId, { type: 'result', ...result, index: i });
    }

    jobs.set(jobId, { status: 'running', results, total: urls.length, done: i + 1 });
  }

  jobs.set(jobId, { status: 'done', results, total: urls.length, done: urls.length });
  sendEvent(jobId, { type: 'done', total: urls.length });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Email Scraper running on http://localhost:${PORT}`));
