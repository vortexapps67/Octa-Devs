/**
 * Cloudflare Pages middleware — runs on every request, before static assets.
 *
 * Pages deploys the repository root, so server-side source (lib/, scripts/,
 * server.js, the SQL schema) is otherwise downloadable from the live site.
 * A `_redirects` rule cannot stop this: Pages serves a matching static asset
 * first and only falls back to redirects for paths that would 404. Functions,
 * by contrast, intercept the request before asset resolution — so this is the
 * layer that can actually refuse.
 */

const PRIVATE_PREFIXES = [
  '/lib/',
  '/scripts/',
  '/data/',
  '/functions/',
  '/node_modules/'
];

const PRIVATE_FILES = new Set([
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/supabase_schema.sql'
]);

const PRIVATE_EXTENSIONS = ['.sql', '.md', '.log', '.env', '.yml', '.yaml', '.toml'];

const NOT_FOUND_PAGE = '/404.html';

function isPrivate(pathname) {
  const p = pathname.toLowerCase();

  // Never block the page we serve as the 404 body, or we recurse.
  if (p === NOT_FOUND_PAGE) return false;

  // Dotfiles and dot-directories at any depth: .env, .git/config, ...
  if (p.split('/').some(segment => segment.startsWith('.'))) return true;

  if (PRIVATE_FILES.has(p)) return true;
  if (PRIVATE_PREFIXES.some(prefix => p.startsWith(prefix))) return true;
  if (PRIVATE_EXTENSIONS.some(ext => p.endsWith(ext))) return true;

  return false;
}

export async function onRequest(context) {
  const { request, next } = context;
  const { pathname, origin } = new URL(request.url);

  if (!isPrivate(pathname)) return next();

  // Answer with the site's own 404 page, at a real 404 status.
  try {
    const page = await fetch(origin + NOT_FOUND_PAGE);
    if (page.ok) {
      return new Response(page.body, {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Robots-Tag': 'noindex'
        }
      });
    }
  } catch (e) {
    // Fall through to the plain response below.
  }

  return new Response('Not Found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

// Exported for tests.
export { isPrivate };
