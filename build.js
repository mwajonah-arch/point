// Medipoint has no real bundling step by design (app.js runs straight in
// the browser via Babel + esm.sh, on purpose — see README "Run the
// Application"). "dist/" just needs to be an exact, up-to-date copy of the
// files a static host (like GitHub Pages) should serve.
//
// Previously dist/ was hand-copied and quietly drifted out of sync with
// app.js (missing icons, a missing `memo` import). This script removes the
// manual-copy step entirely — run `npm run build` before every deploy and
// dist/ will always match the source exactly.

const fs = require('fs');
const path = require('path');

const root = __dirname;
const dist = path.join(root, 'dist');

// Start clean so no stale files (like the old hashed CSS asset) linger.
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);

const filesToCopy = ['app.js', 'config.js', 'index.html'];
for (const file of filesToCopy) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

console.log(`Copied ${filesToCopy.join(', ')} into dist/ — ready to deploy.`);
