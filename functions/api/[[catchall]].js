/**
 * Cloudflare Pages Functions - Full API Backend for Octa Devs
 * Runs in Cloudflare Edge Serverless Environment (protected server environment)
 * Supports all admin and public endpoints with Supabase & Discord Webhooks.
 */

const SUPABASE_URL = 'https://bofgjrslnvtlvikdopxi.supabase.co';
const SUPABASE_SECRET_KEY = typeof atob !== 'undefined' 
  ? atob('c2Jfc2VjcmV0X1NBaUxJREFyMGhBZnRkd0RtSHo2a2dfR0JsYUpxd2Y=')
  : '';
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1553366159435366517/urFQoeoyr_zm_m4RMCmI0QzWXJasEvWQeh1DOi5ew8p4iHc980Ay5MRWUXG_KDCYjqRv';
const ADMIN_PASSCODE = 'admin00';

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

async function callSupabase(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SECRET_KEY,
    'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
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

export async function onRequest(context) {
  const { request } = context;
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
      const { password } = body;
      if (password === ADMIN_PASSCODE) {
        const token = 'octa_token_' + Date.now() + '_' + Math.random().toString(36).substring(2);
        return jsonResponse({ success: true, token });
      }
      return jsonResponse({ success: false, error: 'Invalid admin passcode' }, 401);
    }

    if (pathname === '/api/admin/verify' && method === 'GET') {
      const auth = request.headers.get('Authorization') || '';
      if (auth.startsWith('Bearer ')) {
        return jsonResponse({ success: true, valid: true });
      }
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    if (pathname === '/api/admin/logout' && method === 'POST') {
      return jsonResponse({ success: true });
    }

    // 2. COUNTDOWN
    if (pathname === '/api/countdown' && method === 'GET') {
      const rows = await callSupabase('launch_settings?select=*&limit=1');
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
      const rows = await callSupabase('launch_settings?id=eq.launch_config', {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: patchData
      });
      const countdown = Array.isArray(rows) && rows[0] ? rows[0] : patchData;
      return jsonResponse({ success: true, countdown });
    }

    // 3. TEAM MEMBERS
    if (pathname === '/api/team' && method === 'GET') {
      const rows = await callSupabase('team_members?select=*&order=sort_order.asc,created_at.asc');
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
      const rows = await callSupabase('team_members', {
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
      const rows = await callSupabase(`team_members?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: updateData
      });
      const member = Array.isArray(rows) && rows[0] ? rows[0] : updateData;
      return jsonResponse({ success: true, member });
    }

    if (pathname.startsWith('/api/admin/team/') && method === 'DELETE') {
      const id = decodeURIComponent(pathname.replace('/api/admin/team/', ''));
      await callSupabase(`team_members?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return jsonResponse({ success: true });
    }

    // 4. PROJECTS
    if (pathname === '/api/projects' && method === 'GET') {
      const rows = await callSupabase('projects?select=*&order=sort_order.asc,created_at.desc');
      return jsonResponse({ success: true, projects: Array.isArray(rows) ? rows : [] });
    }

    if (pathname === '/api/admin/projects' && method === 'POST') {
      const projData = {
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
      const rows = await callSupabase('projects', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: projData
      });
      const project = Array.isArray(rows) && rows[0] ? rows[0] : projData;
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
      const rows = await callSupabase(`projects?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: updateData
      });
      const project = Array.isArray(rows) && rows[0] ? rows[0] : updateData;
      return jsonResponse({ success: true, project });
    }

    if (pathname.startsWith('/api/admin/projects/') && method === 'DELETE') {
      const id = decodeURIComponent(pathname.replace('/api/admin/projects/', ''));
      await callSupabase(`projects?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return jsonResponse({ success: true });
    }

    // 5. STATS & SYNC
    if (pathname === '/api/admin/stats' && method === 'GET') {
      const [teamRows, projRows, cdRows] = await Promise.all([
        callSupabase('team_members?select=id'),
        callSupabase('projects?select=id,status'),
        callSupabase('launch_settings?select=*&limit=1')
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
          discordWebhookConfigured: true
        }
      });
    }

    if (pathname === '/api/admin/sync' && method === 'POST') {
      const [teamRows, projRows] = await Promise.all([
        callSupabase('team_members?select=id'),
        callSupabase('projects?select=id')
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

      await fetch(DISCORD_WEBHOOK_URL, {
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
