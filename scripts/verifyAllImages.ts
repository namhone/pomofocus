import { WALLPAPERS, WALLPAPER_CATEGORIES } from '../src/data/wallpapers.js';
import https from 'https';
import http from 'http';

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, { method: 'HEAD', timeout: 6000 }, (res) => {
        const status = res.statusCode || 0;
        const contentType = res.headers['content-type'] || '';
        const isOk = status >= 200 && status < 400 && contentType.startsWith('image/');
        resolve({ url, status, contentType, isOk });
      });
      req.on('error', (err) => resolve({ url, status: 0, error: err.message, isOk: false }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ url, status: 408, error: 'Timeout', isOk: false });
      });
      req.end();
    } catch (err) {
      resolve({ url, status: 0, error: err.message, isOk: false });
    }
  });
}

async function main() {
  console.log(`Checking unique photo URLs in wallpapers...`);
  const uniqueUrls = Array.from(new Set(WALLPAPERS.map((w) => w.thumbnailUrl)));
  console.log(`Total unique thumbnail URLs: ${uniqueUrls.length}`);

  let okCount = 0;
  let failCount = 0;
  const failed = [];

  // Check in batches of 15
  for (let i = 0; i < uniqueUrls.length; i += 15) {
    const chunk = uniqueUrls.slice(i, i + 15);
    const results = await Promise.all(chunk.map(checkUrl));
    for (const r of results) {
      if (r.isOk) {
        okCount++;
      } else {
        failCount++;
        failed.push(r);
        console.log(`FAILED: ${r.url} -> Status: ${r.status}, Content-Type: ${r.contentType || r.error}`);
      }
    }
  }

  console.log(`\nResults: ${okCount} OK, ${failCount} FAILED out of ${uniqueUrls.length}`);
}

main().catch(console.error);
