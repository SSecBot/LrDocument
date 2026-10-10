// Copies the OCR engine (tesseract.js worker + WASM core) and the Turkish language data into
// public/ocr so the academic-calendar import works without any third-party CDN.
// Runs automatically after `npm install` / `npm ci` and before `dev` / `build`.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const out = join(root, 'public', 'ocr');

function pkgDir(name) {
  return dirname(require.resolve(`${name}/package.json`));
}

const files = [
  [join(pkgDir('tesseract.js'), 'dist', 'worker.min.js'), join(out, 'worker.min.js')],
  [join(pkgDir('tesseract.js-core'), 'tesseract-core-lstm.wasm.js'), join(out, 'core', 'tesseract-core-lstm.wasm.js')],
  [join(pkgDir('tesseract.js-core'), 'tesseract-core-simd-lstm.wasm.js'), join(out, 'core', 'tesseract-core-simd-lstm.wasm.js')],
  [join(pkgDir('@tesseract.js-data/tur'), '4.0.0_best_int', 'tur.traineddata.gz'), join(out, 'lang', 'tur.traineddata.gz')],
];

let copied = 0;
for (const [from, to] of files) {
  if (!existsSync(from)) {
    console.warn(`[ocr] eksik dosya: ${from}`);
    continue;
  }
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  copied++;
}
if (copied) console.log(`[ocr] ${copied} dosya public/ocr klasörüne kopyalandı.`);
