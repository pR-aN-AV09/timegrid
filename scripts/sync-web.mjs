// Copies the web app into android-www/ (what Capacitor bundles into the APK).
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
const out = 'android-www';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['index.html','styles.css','app.js','native.js','config.js','sw.js','manifest.webmanifest','icons','vendor']) {
  if (existsSync(f)) cpSync(f, `${out}/${f}`, { recursive: true });
  else console.warn('missing (skipped):', f);
}
console.log('web files copied to', out);
