const crypto = require('crypto');

// In-memory token store: token -> { createdAt, expiresAt }
const activeSessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function verifyPassword(password) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    console.error('ADMIN_PASSWORD is not set — admin login is disabled.');
    return false;
  }
  if (typeof password !== 'string') return false;

  // Compare over fixed-length digests so the check is timing-safe regardless
  // of how the two inputs differ in length.
  const given = crypto.createHash('sha256').update(password).digest();
  const expected = crypto.createHash('sha256').update(expectedPassword).digest();
  return crypto.timingSafeEqual(given, expected);
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  activeSessions.set(token, {
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  });
  return token;
}

function validateSession(token) {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

function destroySession(token) {
  if (token) activeSessions.delete(token);
}

function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // Also check cookie if present
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const match = cookieHeader.match(/octa_admin_token=([^;]+)/);
    if (match) return match[1].trim();
  }
  return null;
}

module.exports = {
  verifyPassword,
  createSession,
  validateSession,
  destroySession,
  extractToken
};
