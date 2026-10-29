import { cp, mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (args, cwd = root) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const manifest = JSON.parse(await readFile(path.join(root, 'dist/manifest.webmanifest'), 'utf8'));
if (manifest.scope !== '/Image_app_dev/') {
  throw new Error('Build for GitHub Pages first: set EXPO_PUBLIC_BASE_PATH=/Image_app_dev and run npm run build:web.');
}
const sourceCommit = git(['rev-parse', 'HEAD']);
const remote = git(['remote', 'get-url', 'origin']);
const checkout = await mkdtemp(path.join(os.tmpdir(), 'iwrc-imaging-pages-'));
// Retain the existing Pages branch and its files. Never force-push.
git(['clone', '--depth', '1', '--single-branch', '--branch', 'gh_pages', remote, checkout]);
await cp(path.join(root, 'dist'), checkout, { recursive: true });
git(['add', '--all'], checkout);
if (!git(['diff', '--cached', '--name-only'], checkout)) {
  console.log('The same PWA build is already published.');
  process.exit(0);
}
git(['-c', `user.name=${git(['config', 'user.name'])}`, '-c', `user.email=${git(['config', 'user.email'])}`,
  'commit', '-m', `Publish IWRC Imaging PWA from ${sourceCommit.slice(0, 12)}`], checkout);
console.log(git(['push', 'origin', 'HEAD:gh_pages'], checkout));
console.log(`Published Pages source commit ${git(['rev-parse', 'HEAD'], checkout)}.`);
console.log('GitHub Pages deployment: https://iwrc-devs.github.io/Image_app_dev/');
