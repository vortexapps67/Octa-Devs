const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Synchronously load .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const db = require('./lib/db');
const { sendContactNotification } = require('./lib/discord');
const auth = require('./lib/auth');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.sql': 'text/plain; charset=utf-8'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch (e) {
          resolve({});
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of params.entries()) {
          obj[k] = v;
        }
        resolve(obj);
      } else {
        // Try parsing as JSON first, otherwise return raw
        try {
          resolve(JSON.parse(body || '{}'));
        } catch (e) {
          resolve({ raw: body });
        }
      }
    });
  });
}

function requireAuth(req, res) {
  const token = auth.extractToken(req);
  if (!auth.validateSession(token)) {
    sendJson(res, 401, { success: false, error: 'Unauthorized. Please login again.' });
    return false;
  }
  return true;
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // ==================== API ROUTES ====================

  // 1. Contact Form submission (Public)
  if (pathname === '/api/contact' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const name = body.name || body.Name || 'Anonymous';
      const email = body.email || body.Email || '';
      const project = body.project || body.message || body.YourProject || body['Tell us about your project'] || body.body || '';

      if (!name || !email) {
        sendJson(res, 400, { success: false, error: 'Name and email are required.' });
        return;
      }

      // Dispatch to Discord
      await sendContactNotification({ name, email, project });
      sendJson(res, 200, { success: true, message: 'Your message has been sent directly to the Octa Devs team!' });
    } catch (err) {
      console.error('Contact API error:', err.message);
      sendJson(res, 500, { success: false, error: 'Failed to deliver message to Discord: ' + err.message });
    }
    return;
  }

  // 2. Admin Login
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const password = body.password || '';
    if (auth.verifyPassword(password)) {
      const token = auth.createSession();
      sendJson(res, 200, { success: true, token });
    } else {
      sendJson(res, 401, { success: false, error: 'Invalid admin password.' });
    }
    return;
  }

  // 3. Admin Logout
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const token = auth.extractToken(req);
    auth.destroySession(token);
    sendJson(res, 200, { success: true, message: 'Logged out' });
    return;
  }

  // 4. Admin Session Verification
  if (pathname === '/api/admin/verify' && req.method === 'GET') {
    const token = auth.extractToken(req);
    const isValid = auth.validateSession(token);
    sendJson(res, 200, { success: isValid });
    return;
  }

  // 5. Admin Stats
  if (pathname === '/api/admin/stats' && req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    try {
      const stats = await db.getStats();
      sendJson(res, 200, { success: true, stats });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return;
  }

  // 6. Public Launch Countdown
  if (pathname === '/api/countdown' && req.method === 'GET') {
    try {
      const countdown = await db.getCountdown();
      sendJson(res, 200, { success: true, countdown });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return;
  }

  // 7. Admin Update Countdown
  if (pathname === '/api/admin/countdown' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    try {
      const body = await parseBody(req);
      const updated = await db.updateCountdown(body);
      sendJson(res, 200, { success: true, countdown: updated });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return;
  }

  // 8. Public Team Members
  if (pathname === '/api/team' && req.method === 'GET') {
    try {
      const team = await db.getTeamMembers();
      sendJson(res, 200, { success: true, team });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return;
  }

  // 9. Admin Team CRUD
  if (pathname === '/api/admin/team') {
    if (!requireAuth(req, res)) return;
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        if (!body.name) {
          sendJson(res, 400, { success: false, error: 'Name is required' });
          return;
        }
        const created = await db.createTeamMember(body);
        sendJson(res, 201, { success: true, member: created });
      } catch (e) {
        sendJson(res, 500, { success: false, error: e.message });
      }
      return;
    }
  }

  const teamMatch = pathname.match(/^\/api\/admin\/team\/(.+)$/);
  if (teamMatch) {
    if (!requireAuth(req, res)) return;
    const memberId = decodeURIComponent(teamMatch[1]);
    if (req.method === 'PUT') {
      try {
        const body = await parseBody(req);
        const updated = await db.updateTeamMember(memberId, body);
        sendJson(res, 200, { success: true, member: updated });
      } catch (e) {
        sendJson(res, 500, { success: false, error: e.message });
      }
      return;
    }
    if (req.method === 'DELETE') {
      try {
        await db.deleteTeamMember(memberId);
        sendJson(res, 200, { success: true, message: 'Member deleted' });
      } catch (e) {
        sendJson(res, 500, { success: false, error: e.message });
      }
      return;
    }
  }

  // 10. Public Projects
  if (pathname === '/api/projects' && req.method === 'GET') {
    try {
      const projects = await db.getProjects();
      sendJson(res, 200, { success: true, projects });
    } catch (e) {
      sendJson(res, 500, { success: false, error: e.message });
    }
    return;
  }

  // 11. Admin Projects CRUD
  if (pathname === '/api/admin/projects') {
    if (!requireAuth(req, res)) return;
    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        if (!body.title) {
          sendJson(res, 400, { success: false, error: 'Title is required' });
          return;
        }
        const created = await db.createProject(body);
        sendJson(res, 201, { success: true, project: created });
      } catch (e) {
        sendJson(res, 500, { success: false, error: e.message });
      }
      return;
    }
  }

  const projectMatch = pathname.match(/^\/api\/admin\/projects\/(.+)$/);
  if (projectMatch) {
    if (!requireAuth(req, res)) return;
    const projId = decodeURIComponent(projectMatch[1]);
    if (req.method === 'PUT') {
      try {
        const body = await parseBody(req);
        const updated = await db.updateProject(projId, body);
        sendJson(res, 200, { success: true, project: updated });
      } catch (e) {
        sendJson(res, 500, { success: false, error: e.message });
      }
      return;
    }
    if (req.method === 'DELETE') {
      try {
        await db.deleteProject(projId);
        sendJson(res, 200, { success: true, message: 'Project deleted' });
      } catch (e) {
        sendJson(res, 500, { success: false, error: e.message });
      }
      return;
    }
  }

  // 12. Admin Image Upload
  if (pathname === '/api/admin/upload' && req.method === 'POST') {
    if (!requireAuth(req, res)) return;
    try {
      const body = await parseBody(req);
      let dataUrl = body.image || body.data || '';
      let filename = (body.name || body.filename || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_');

      if (!dataUrl) {
        sendJson(res, 400, { success: false, error: 'No image data provided' });
        return;
      }

      let ext = path.extname(filename) || '.png';
      let buffer;
      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);

      if (match) {
        ext = '.' + match[1].replace('jpeg', 'jpg');
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(dataUrl, 'base64');
      }

      const uploadsDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const saveName = 'upload_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + ext;
      const savePath = path.join(uploadsDir, saveName);
      fs.writeFileSync(savePath, buffer);

      const publicUrl = './uploads/' + saveName;
      sendJson(res, 200, { success: true, url: publicUrl });
    } catch (e) {
      console.error('Upload error:', e);
      sendJson(res, 500, { success: false, error: e.message });
    }
    return;
  }

  // ==================== STATIC FILE SERVING ====================

  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/admin' || reqPath === '/admin/') reqPath = '/admin.html';
  if (reqPath === '/favicon.ico') reqPath = '/octa_favicon.jpg';

  let filePath = path.join(__dirname, reqPath);

  // If path doesn't have extension and file with .html exists
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    }
  }

  // Fallback for asset requests when inside /admin/ (e.g. /admin/octa_favicon.jpg)
  if (!fs.existsSync(filePath) && reqPath.startsWith('/admin/')) {
    const stripped = path.join(__dirname, reqPath.replace(/^\/admin\//, '/'));
    if (fs.existsSync(stripped)) {
      filePath = stripped;
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Admin Panel available at http://localhost:${PORT}/admin`);
});
