// Builds dist/ for deployment (Netlify runs `npm run build`).
//
// During development index.html compiles app.js in the browser with Babel, which
// is convenient but slow: every visit downloads the compiler and recompiles the
// whole app. This script compiles ONCE here instead, so visitors just download
// a small, minified app.js. React, Supabase etc. are still loaded from esm.sh at
// runtime, exactly as before (they're left as external imports).

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = __dirname;
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);

esbuild.buildSync({
  entryPoints: [path.join(root, 'app.js')],
  outfile: path.join(dist, 'app.js'),
  bundle: true,
  minify: true,
  format: 'esm',
  loader: { '.js': 'jsx' },
  external: ['https://*'],
  logLevel: 'warning',
});

// dist/index.html: drop the in-browser compiler and load the compiled file.
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const before = html;
html = html
  .replace(/\s*<!-- Lets the browser run JSX[\s\S]*?-->/, '')
  .replace(/\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone[^>]*><\/script>/, '')
  .replace(/<script type="text\/babel"[^>]*src="app\.js"><\/script>/, '<script type="module" src="app.js"></script>');
if (html === before || html.includes('babel')) {
  throw new Error('index.html no longer matches what build.js expects (Babel tags). Update build.js.');
}
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.copyFileSync(path.join(root, 'config.js'), path.join(dist, 'config.js'));

const kb = (f) => (fs.statSync(path.join(dist, f)).size / 1024).toFixed(0) + ' KB';
console.log(`dist/ ready: app.js ${kb('app.js')}, index.html ${kb('index.html')}`);
