const fs = require('fs');
const path = require('path');

// Ensure environment variables are loaded
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
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

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial fallback seed
const DEFAULT_STORE = {
  launch_settings: {
    id: 'launch_config',
    title: 'Octa Devs Platform Launch',
    subtitle: 'We are currently designing and building new mobile and web applications. Check back soon for what’s next from Octa Devs.',
    target_date: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    updated_at: new Date().toISOString()
  },
  team_members: [
    {
      id: 'team-1',
      name: 'Aarav Sharma',
      role: 'Co-Founder & Lead Engineer',
      bio: 'Full-stack & mobile systems engineer focused on scalable application architecture and high-performance products.',
      avatar_url: '',
      socials: { linkedin: '', twitter: '', github: '' },
      sort_order: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 'team-2',
      name: 'Akshansh Sinha',
      role: 'Co-Founder & Product Designer',
      bio: 'Product strategist and designer crafting intuitive, high-craft digital interfaces and mobile experiences.',
      avatar_url: '',
      socials: { linkedin: '', twitter: '', github: '' },
      sort_order: 2,
      created_at: new Date().toISOString()
    }
  ],
  projects: []
};

function readLocalStore() {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error reading local store:', e.message);
  }
  saveLocalStore(DEFAULT_STORE);
  return DEFAULT_STORE;
}

function saveLocalStore(data) {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving local store:', e.message);
  }
}

class DatabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    this.supabaseEnabled = !!(this.supabaseUrl && this.supabaseKey);
    this.tableStatus = {
      team_members: false,
      projects: false,
      launch_settings: false
    };
  }

  getHeaders() {
    return {
      'apikey': this.supabaseKey,
      'Authorization': `Bearer ${this.supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async checkSupabaseTables() {
    if (!this.supabaseEnabled) return false;
    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/launch_settings?limit=1`, {
        headers: this.getHeaders()
      });
      const ok = res.status === 200;
      this.tableStatus.launch_settings = ok;
      this.tableStatus.team_members = ok;
      this.tableStatus.projects = ok;
      return ok;
    } catch (e) {
      return false;
    }
  }

  // --- COUNTDOWN / LAUNCH SETTINGS ---
  async getCountdown() {
    if (this.supabaseEnabled) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/launch_settings?id=eq.launch_config&limit=1`, {
          headers: this.getHeaders()
        });
        if (res.ok) {
          const list = await res.json();
          if (list && list.length > 0) return list[0];
        }
      } catch (e) {}
    }
    const store = readLocalStore();
    return store.launch_settings || DEFAULT_STORE.launch_settings;
  }

  async updateCountdown(payload) {
    const updated = {
      id: 'launch_config',
      title: payload.title || 'Octa Devs Platform Launch',
      subtitle: payload.subtitle || '',
      target_date: payload.target_date,
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
      updated_at: new Date().toISOString()
    };

    if (this.supabaseEnabled) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/launch_settings?id=eq.launch_config`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify(updated)
        });
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.length > 0) {
            // Also keep local store in sync
            const store = readLocalStore();
            store.launch_settings = rows[0];
            saveLocalStore(store);
            return rows[0];
          }
        }
      } catch (e) {}
    }

    const store = readLocalStore();
    store.launch_settings = updated;
    saveLocalStore(store);
    return updated;
  }

  // --- TEAM MEMBERS ---
  async getTeamMembers() {
    if (this.supabaseEnabled) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/team_members?order=sort_order.asc,created_at.asc`, {
          headers: this.getHeaders()
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) return list;
        }
      } catch (e) {}
    }
    const store = readLocalStore();
    return (store.team_members || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  async createTeamMember(payload) {
    const socials = payload.socials || {};
    if (payload.instagram) socials.instagram = payload.instagram;
    if (payload.linkedin) socials.linkedin = payload.linkedin;
    if (payload.twitter) socials.twitter = payload.twitter;
    if (payload.github) socials.github = payload.github;

    const newMember = {
      id: 'team-' + Date.now(),
      name: payload.name,
      role: payload.role || '',
      bio: payload.bio || '',
      avatar_url: payload.avatar_url || '',
      socials: socials,
      sort_order: parseInt(payload.sort_order || 0, 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.supabaseEnabled) {
      try {
        const sbPayload = { ...newMember };
        delete sbPayload.id; // allow UUID default
        const res = await fetch(`${this.supabaseUrl}/rest/v1/team_members`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(sbPayload)
        });
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.length > 0) {
            const store = readLocalStore();
            store.team_members = store.team_members || [];
            store.team_members.push(rows[0]);
            saveLocalStore(store);
            return rows[0];
          }
        }
      } catch (e) {}
    }

    const store = readLocalStore();
    store.team_members = store.team_members || [];
    store.team_members.push(newMember);
    saveLocalStore(store);
    return newMember;
  }

  async updateTeamMember(id, payload) {
    const existing = (await this.getTeamMembers()).find(m => m.id === id);
    const existingSocials = (existing && existing.socials) ? existing.socials : {};
    const socials = { ...existingSocials, ...(payload.socials || {}) };
    if (payload.instagram !== undefined) socials.instagram = payload.instagram;
    if (payload.linkedin !== undefined) socials.linkedin = payload.linkedin;
    if (payload.twitter !== undefined) socials.twitter = payload.twitter;
    if (payload.github !== undefined) socials.github = payload.github;

    const validFields = ['name', 'role', 'bio', 'avatar_url', 'sort_order'];
    const sbPatch = {
      socials,
      updated_at: new Date().toISOString()
    };
    validFields.forEach(f => {
      if (payload[f] !== undefined) {
        sbPatch[f] = f === 'sort_order' ? parseInt(payload[f], 10) : payload[f];
      }
    });

    if (this.supabaseEnabled) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/team_members?id=eq.${id}`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify(sbPatch)
        });
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.length > 0) {
            const store = readLocalStore();
            const idx = (store.team_members || []).findIndex(m => m.id === id);
            if (idx !== -1) store.team_members[idx] = rows[0];
            saveLocalStore(store);
            return rows[0];
          }
        } else {
          const err = await res.text();
          console.error('Supabase team PATCH error:', res.status, err);
        }
      } catch (e) {
        console.error('Supabase team PATCH fetch error:', e.message);
      }
    }

    const store = readLocalStore();
    const idx = (store.team_members || []).findIndex(m => m.id === id);
    if (idx !== -1) {
      store.team_members[idx] = { ...store.team_members[idx], ...sbPatch };
      saveLocalStore(store);
      return store.team_members[idx];
    }
    return null;
  }

  async deleteTeamMember(id) {
    if (this.supabaseEnabled) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/team_members?id=eq.${id}`, {
          method: 'DELETE',
          headers: this.getHeaders()
        });
        if (res.ok) {
          const store = readLocalStore();
          store.team_members = (store.team_members || []).filter(m => m.id !== id);
          saveLocalStore(store);
          return true;
        }
      } catch (e) {}
    }

    const store = readLocalStore();
    store.team_members = (store.team_members || []).filter(m => m.id !== id);
    saveLocalStore(store);
    return true;
  }

  // --- PROJECTS ---
  async getProjects() {
    if (this.supabaseEnabled) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/projects?order=sort_order.asc,created_at.desc`, {
          headers: this.getHeaders()
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) return list;
        }
      } catch (e) {}
    }
    const store = readLocalStore();
    return (store.projects || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  async createProject(payload) {
    const newProject = {
      id: 'proj-' + Date.now(),
      title: payload.title,
      category: payload.category || 'Mobile App',
      description: payload.description || '',
      image_url: payload.image_url || '',
      project_url: payload.project_url || '',
      status: payload.status || 'Coming Soon',
      featured: Boolean(payload.featured),
      sort_order: parseInt(payload.sort_order || 0, 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.supabaseEnabled) {
      try {
        const sbPayload = { ...newProject };
        delete sbPayload.id;
        const res = await fetch(`${this.supabaseUrl}/rest/v1/projects`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(sbPayload)
        });
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.length > 0) {
            const store = readLocalStore();
            store.projects = store.projects || [];
            store.projects.push(rows[0]);
            saveLocalStore(store);
            return rows[0];
          }
        }
      } catch (e) {}
    }

    const store = readLocalStore();
    store.projects = store.projects || [];
    store.projects.push(newProject);
    saveLocalStore(store);
    return newProject;
  }

  async updateProject(id, payload) {
    const patch = {
      ...payload,
      updated_at: new Date().toISOString()
    };

    if (this.supabaseEnabled) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/projects?id=eq.${id}`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify(patch)
        });
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.length > 0) {
            const store = readLocalStore();
            const idx = (store.projects || []).findIndex(p => p.id === id);
            if (idx !== -1) store.projects[idx] = rows[0];
            saveLocalStore(store);
            return rows[0];
          }
        }
      } catch (e) {}
    }

    const store = readLocalStore();
    const idx = (store.projects || []).findIndex(p => p.id === id);
    if (idx !== -1) {
      store.projects[idx] = { ...store.projects[idx], ...patch };
      saveLocalStore(store);
      return store.projects[idx];
    }
    return null;
  }

  async deleteProject(id) {
    if (this.supabaseEnabled) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/projects?id=eq.${id}`, {
          method: 'DELETE',
          headers: this.getHeaders()
        });
        if (res.ok) {
          const store = readLocalStore();
          store.projects = (store.projects || []).filter(p => p.id !== id);
          saveLocalStore(store);
          return true;
        }
      } catch (e) {}
    }

    const store = readLocalStore();
    store.projects = (store.projects || []).filter(p => p.id !== id);
    saveLocalStore(store);
    return true;
  }

  async getStats() {
    const members = await this.getTeamMembers();
    const projects = await this.getProjects();
    const countdown = await this.getCountdown();
    const supabaseReady = await this.checkSupabaseTables();

    return {
      teamMembersCount: members.length,
      projectsCount: projects.length,
      publishedProjectsCount: projects.filter(p => p.status === 'Published').length,
      countdownActive: countdown.is_active,
      countdownTargetDate: countdown.target_date,
      supabaseConfigured: this.supabaseEnabled,
      supabaseConnected: supabaseReady,
      discordWebhookConfigured: !!process.env.DISCORD_WEBHOOK_URL
    };
  }

  async syncWithSupabase() {
    if (!this.supabaseEnabled) return { success: false, error: 'Supabase credentials not configured' };
    try {
      const countdown = await this.getCountdown();
      const team = await this.getTeamMembers();
      const projects = await this.getProjects();
      const store = {
        launch_settings: countdown,
        team_members: team,
        projects: projects
      };
      saveLocalStore(store);
      return { 
        success: true, 
        stats: await this.getStats(),
        count: { team: team.length, projects: projects.length }, 
        countdown 
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = new DatabaseService();
