# ⚡ MailHarvest — Bulk Email Scraper

A full-stack web tool to extract emails from websites in bulk.
Supports **Google Docs**, **CSV upload**, and **manual URL input**.
Crawls entire websites (up to 60 pages per site) and extracts all emails in real time.

---

## 🚀 Features

- ✅ Full-site crawl (all pages, not just homepage)
- ✅ Real-time progress with Server-Sent Events
- ✅ Google Docs & Google Sheets integration
- ✅ CSV / TXT file upload
- ✅ Manual URL input
- ✅ Export results as CSV
- ✅ Copy all emails to clipboard
- ✅ Email deduplication
- ✅ Priority crawl for contact/about/team pages

---

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm

### Steps

```bash
# 1. Clone or upload the project to your server
cd /var/www/mailharvest   # or any directory

# 2. Install dependencies
npm install

# 3. Copy env file
cp .env.example .env
# Edit .env if needed (PORT, etc.)

# 4. Start in development
npm run dev

# OR start in production
npm start
```

The app runs on **http://localhost:3000** by default.

---

## 🌐 Deploying to Your Domain

### Step 1 — Install dependencies on your VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### Step 2 — Upload project & install

```bash
# Upload the email-scraper folder to your server
# Then:
cd /var/www/mailharvest
npm install --production
```

### Step 3 — Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # Follow the printed command to auto-start on reboot
```

### Step 4 — Configure Nginx

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/mailharvest

# Edit and replace YOUR_DOMAIN.com with your actual domain
sudo nano /etc/nginx/sites-available/mailharvest

# Enable the site
sudo ln -s /etc/nginx/sites-available/mailharvest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5 — SSL with Let's Encrypt (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
sudo systemctl reload nginx
```

✅ Your app is now live at **https://YOUR_DOMAIN.com**

---

## 📄 Google Doc Setup

1. Create a Google Doc or Sheet with one URL per line (or per cell)
2. Click **Share** → **Anyone with the link** → **Viewer**
3. Copy the link and paste it in the Google Doc tab of the tool

**Supported formats:**
- `https://docs.google.com/document/d/DOC_ID/edit`
- `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

---

## 📁 CSV Format

Your CSV can be:
- Single column of URLs/domains
- Multi-column (first column with URL-like content is used)
- Plain `.txt` file with one URL per line

---

## ⚙️ Configuration

Edit `src/scraper.js` to adjust:
- `MAX_PAGES` — max pages crawled per site (default: 60)
- `PRIORITY_PATHS` — contact/about pages crawled first
- Crawl delay (default: 300ms per page)

---

## 📂 Project Structure

```
email-scraper/
├── server.js              # Express server + API routes
├── src/
│   ├── scraper.js         # Core crawl + email extraction
│   ├── csvParser.js       # CSV/TXT URL parsing
│   └── googleDocs.js      # Google Docs/Sheets fetcher
├── public/
│   └── index.html         # Frontend UI
├── ecosystem.config.js    # PM2 config
├── nginx.conf             # Nginx reverse proxy config
├── package.json
└── .env.example
```

---

## 🛡️ Legal Notice

Use this tool responsibly. Only scrape websites you have permission to access.
Respect `robots.txt` and website terms of service.
