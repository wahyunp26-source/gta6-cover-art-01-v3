// Neon Coast Cover Studio — the entry program (Node 22, standard library only).
// Hands the app in: copies this repo's app/ and screenshots/ to /output and
// writes /output/dossier.json with the vendored make.fun library. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appOut = join(outDir, 'app');
const shotsOut = join(outDir, 'screenshots');

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), appOut, { recursive: true });
mkdirSync(shotsOut, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsOut, { recursive: true });
}

// The scorer's own caps for this bounty (reference/gate.json): the text cap
// shapes the dossier bytes; the rest refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; app/ over 993 files or 48 MiB
// in all; any app/ path over 1000 bytes). app/ counts beside /output's own
// 1000-entry cap, its screenshots/ and dossier.json.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
