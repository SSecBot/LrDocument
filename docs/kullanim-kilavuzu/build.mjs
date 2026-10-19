// Kullanım kılavuzunu PDF'e dönüştürür: docs/kullanim-kilavuzu/kilavuz.html → public/kullanim-kilavuzu.pdf
// Gerekli: Playwright (npx playwright install chromium). Kullanım: node docs/kullanim-kilavuzu/build.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, '..', '..', 'public', 'kullanim-kilavuzu.pdf');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(dir, 'kilavuz.html')).href, { waitUntil: 'load' });
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="width:100%;font-size:8px;color:#9ca3af;text-align:center;font-family:Segoe UI,Arial">LrDocument Kullanım Kılavuzu · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});
await browser.close();
console.log('Oluşturuldu:', out);
