/**
 * Cloudflare Pages Functions - Full API Backend for Octa Devs
 * Runs in Cloudflare Edge Serverless Environment (protected server environment)
 * Supports all admin and public endpoints with Supabase & Discord Webhooks.
 *
 * All credentials come from the Pages environment bindings (context.env) — never
 * from source. Required vars: SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_PASSWORD.
 * Optional: DISCORD_WEBHOOK_URL, ADMIN_TOKEN_SECRET.
 */

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders()
  });
}

/** Reads a required environment binding, throwing a clear error when unset. */
function requireEnv(env, name) {
  const value = env && env[name];
  if (!value) {
    throw new Error(`Server misconfigured: ${name} is not set`);
  }
  return value;
}

async function callSupabase(env, endpoint, options = {}) {
  const baseUrl = requireEnv(env, 'SUPABASE_URL').replace(/\/+$/, '');
  const secretKey = requireEnv(env, 'SUPABASE_SECRET_KEY');

  const headers = {
    'apikey': secretKey,
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(`${baseUrl}/rest/v1/${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (res.status === 204) return null;
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

// ---------------------------------------------------------------------------
// Admin session tokens
//
// Tokens are stateless and HMAC-signed so edge isolates don't need shared
// state: "<expiryMillis>.<hex hmac-sha256 of expiryMillis>".
// ---------------------------------------------------------------------------

function tokenSecret(env) {
  return env.ADMIN_TOKEN_SECRET || requireEnv(env, 'ADMIN_PASSWORD');
}

async function hmacHex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Length-independent, timing-safe string comparison. */
function safeEqual(a, b) {
  const aStr = String(a == null ? '' : a);
  const bStr = String(b == null ? '' : b);
  let diff = aStr.length ^ bStr.length;
  const max = Math.max(aStr.length, bStr.length);
  for (let i = 0; i < max; i++) {
    diff |= aStr.charCodeAt(i % (aStr.length || 1)) ^ bStr.charCodeAt(i % (bStr.length || 1));
  }
  return diff === 0;
}

async function createAdminToken(env) {
  const expiry = String(Date.now() + SESSION_TTL_MS);
  const signature = await hmacHex(tokenSecret(env), expiry);
  return `${expiry}.${signature}`;
}

async function verifyAdminToken(env, token) {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;

  const expiry = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^\d+$/.test(expiry)) return false;
  if (Number(expiry) < Date.now()) return false;

  const expected = await hmacHex(tokenSecret(env), expiry);
  return safeEqual(signature, expected);
}

function extractToken(request) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();

  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/octa_admin_token=([^;]+)/);
  return match ? match[1].trim() : null;
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }

  // Parse JSON body if present
  let body = {};
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }
  }

  try {
    // 1. ADMIN AUTHENTICATION
    if (pathname === '/api/admin/login' && method === 'POST') {
      const adminPassword = requireEnv(env, 'ADMIN_PASSWORD');
      if (safeEqual(body.password, adminPassword)) {
        return jsonResponse({ success: true, token: await createAdminToken(env) });
      }
      return jsonResponse({ success: false, error: 'Invalid admin passcode' }, 401);
    }

    if (pathname === '/api/admin/logout' && method === 'POST') {
      return jsonResponse({ success: true });
    }

    // Every other /api/admin/* route requires a valid signed session token.
    if (pathname.startsWith('/api/admin/')) {
      const valid = await verifyAdminToken(env, extractToken(request));
      if (!valid) {
        return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
      }
    }

    if (pathname === '/api/admin/verify' && method === 'GET') {
      return jsonResponse({ success: true, valid: true });
    }

    // 2. COUNTDOWN
    if (pathname === '/api/countdown' && method === 'GET') {
      const rows = await callSupabase(env, 'launch_settings?select=*&limit=1');
      const countdown = Array.isArray(rows) && rows[0] ? rows[0] : null;
      return jsonResponse({ success: true, countdown });
    }

    if (pathname === '/api/admin/countdown' && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const patchData = {
        title: body.title,
        subtitle: body.subtitle,
        target_date: body.target_date,
        is_active: body.is_active !== false,
        updated_at: new Date().toISOString()
      };
      const rows = await callSupabase(env, 'launch_settings?id=eq.launch_config', {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: patchData
      });
      const countdown = Array.isArray(rows) && rows[0] ? rows[0] : patchData;
      return jsonResponse({ success: true, countdown });
    }

    // 3. TEAM MEMBERS
    if (pathname === '/api/team' && method === 'GET') {
      const rows = await callSupabase(env, 'team_members?select=*&order=sort_order.asc,created_at.asc');
      return jsonResponse({ success: true, team: Array.isArray(rows) ? rows : [] });
    }

    if (pathname === '/api/admin/team' && method === 'POST') {
      const memberData = {
        name: body.name,
        role: body.role,
        bio: body.bio || '',
        avatar_url: body.avatar_url || '',
        sort_order: parseInt(body.sort_order || 0, 10),
        socials: body.socials || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const rows = await callSupabase(env, 'team_members', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: memberData
      });
      const member = Array.isArray(rows) && rows[0] ? rows[0] : memberData;
      return jsonResponse({ success: true, member });
    }

    if (pathname.startsWith('/api/admin/team/') && (method === 'PUT' || method === 'PATCH')) {
      const id = decodeURIComponent(pathname.replace('/api/admin/team/', ''));
      const updateData = {
        name: body.name,
        role: body.role,
        bio: body.bio || '',
        avatar_url: body.avatar_url || '',
        sort_order: parseInt(body.sort_order || 0, 10),
        socials: body.socials || {},
        updated_at: new Date().toISOString()
      };
      const rows = await callSupabase(env, `team_members?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: updateData
      });
      const member = Array.isArray(rows) && rows[0] ? rows[0] : updateData;
      return jsonResponse({ success: true, member });
    }

    if (pathname.startsWith('/api/admin/team/') && method === 'DELETE') {
      const id = decodeURIComponent(pathname.replace('/api/admin/team/', ''));
      await callSupabase(env, `team_members?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return jsonResponse({ success: true });
    }

    // 4. PROJECTS
    if (pathname === '/api/projects' && method === 'GET') {
      const rows = await callSupabase(env, 'projects?select=*&order=sort_order.asc,created_at.desc');
      return jsonResponse({ success: true, projects: Array.isArray(rows) ? rows : [] });
    }

    if (pathname === '/api/admin/projects' && method === 'POST') {
      const projectData = {
        title: body.title,
        category: body.category || 'Mobile & Web',
        description: body.description || '',
        image_url: body.image_url || '',
        project_url: body.project_url || '',
        status: body.status || 'Coming Soon',
        sort_order: parseInt(body.sort_order || 0, 10),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const rows = await callSupabase(env, 'projects', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: projectData
      });
      const project = Array.isArray(rows) && rows[0] ? rows[0] : projectData;
      return jsonResponse({ success: true, project });
    }

    if (pathname.startsWith('/api/admin/projects/') && (method === 'PUT' || method === 'PATCH')) {
      const id = decodeURIComponent(pathname.replace('/api/admin/projects/', ''));
      const updateData = {
        title: body.title,
        category: body.category || 'Mobile & Web',
        description: body.description || '',
        image_url: body.image_url || '',
        project_url: body.project_url || '',
        status: body.status || 'Coming Soon',
        sort_order: parseInt(body.sort_order || 0, 10),
        updated_at: new Date().toISOString()
      };
      const rows = await callSupabase(env, `projects?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: updateData
      });
      const project = Array.isArray(rows) && rows[0] ? rows[0] : updateData;
      return jsonResponse({ success: true, project });
    }

    if (pathname.startsWith('/api/admin/projects/') && method === 'DELETE') {
      const id = decodeURIComponent(pathname.replace('/api/admin/projects/', ''));
      await callSupabase(env, `projects?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return jsonResponse({ success: true });
    }

    // 5. STATS & SYNC
    if (pathname === '/api/admin/stats' && method === 'GET') {
      const [teamRows, projRows, cdRows] = await Promise.all([
        callSupabase(env, 'team_members?select=id'),
        callSupabase(env, 'projects?select=id,status'),
        callSupabase(env, 'launch_settings?select=*&limit=1')
      ]);

      const teamCount = Array.isArray(teamRows) ? teamRows.length : 0;
      const projCount = Array.isArray(projRows) ? projRows.length : 0;
      const pubCount = Array.isArray(projRows) ? projRows.filter(p => p.status === 'Published').length : 0;
      const cdActive = Array.isArray(cdRows) && cdRows[0] ? cdRows[0].is_active !== false : true;

      return jsonResponse({
        success: true,
        stats: {
          supabaseConnected: true,
          teamMembersCount: teamCount,
          projectsCount: projCount,
          publishedProjectsCount: pubCount,
          countdownActive: cdActive,
          discordWebhookConfigured: Boolean(env.DISCORD_WEBHOOK_URL)
        }
      });
    }

    if (pathname === '/api/admin/sync' && method === 'POST') {
      const [teamRows, projRows] = await Promise.all([
        callSupabase(env, 'team_members?select=id'),
        callSupabase(env, 'projects?select=id')
      ]);

      return jsonResponse({
        success: true,
        count: {
          team: Array.isArray(teamRows) ? teamRows.length : 0,
          projects: Array.isArray(projRows) ? projRows.length : 0
        }
      });
    }

    // 6. CONTACT DISCORD WEBHOOK
    if (pathname === '/api/contact' && method === 'POST') {
      const webhookUrl = requireEnv(env, 'DISCORD_WEBHOOK_URL');
      const { name, email, project } = body;
      const discordPayload = {
        username: 'Octa Devs Portal',
        avatar_url: 'https://octadevs.fun/octa_favicon.jpg',
        embeds: [{
          title: '⚡ New Project Inquiry',
          color: 15420781,
          fields: [
            { name: 'Client Name', value: name || 'Anonymous', inline: true },
            { name: 'Email', value: email || 'None', inline: true },
            { name: 'Project Details', value: project || 'No description provided.' }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
      });

      return jsonResponse({ success: true });
    }

    // 7. UPLOAD
    if (pathname === '/api/admin/upload' && method === 'POST') {
      return jsonResponse({ success: true, url: body.image });
    }

    return jsonResponse({ error: 'Endpoint not found: ' + pathname }, 404);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}
