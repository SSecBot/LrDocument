// Builds public/i18n/<locale>.js from src/lib/i18n/<locale>/*.json (runs before dev and build).
// Browsers load the file with a script tag only when that language is chosen; the server reads it
// from disk (src/lib/i18n/index.ts, server.ts).
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src', 'lib', 'i18n');
const outDir = join(root, 'public', 'i18n');
mkdirSync(outDir, { recursive: true });

for (const locale of ['en']) {
  const dir = join(srcDir, locale);
  const dict = {};
  if (existsSync(dir)) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      const part = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      for (const [k, v] of Object.entries(part)) {
        if (typeof v !== 'string') throw new Error(`${file}: "${k}" is not a string`);
        dict[k] = v;
      }
    }
  }
  const body = `self.__LR_DICT = Object.assign(self.__LR_DICT || {}, { ${locale}: /*DICT*/${JSON.stringify(dict)}/*END*/ });\n`;
  writeFileSync(join(outDir, `${locale}.js`), body);
  console.log(`i18n: ${locale} ${Object.keys(dict).length} texts`);
}
