/**
 * Octa Devs Dynamic Features
 * - Contact Form to Discord Webhook
 * - Real-Time Launch Countdown Widget (Home & Works pages)
 * - Dynamic Team Members Showcase with Instagram handles (Home page - positioned at down)
 * - Dynamic Projects Portfolio (Home & Works pages)
 * - Discord Community (https://discord.gg/6t8GfTSRBN) & GitHub (https://github.com/octa-devs) Integration
 * - Accessible Footer Admin Portal Link & Studio Bottom Bar
 */

(function () {
  'use strict';

  const GITHUB_URL = 'https://github.com/octa-devs';
  const DISCORD_URL = 'https://discord.gg/6t8GfTSRBN';
  const CONTACT_EMAIL = 'hello@octadevs.fun';
  const SUPABASE_URL = 'https://bofgjrslnvtlvikdopxi.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_DclQThQDyYmDcr6ThGmHoQ_s4s9qSI6';
  const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1553366159435366517/urFQoeoyr_zm_m4RMCmI0QzWXJasEvWQeh1DOi5ew8p4iHc980Ay5MRWUXG_KDCYjqRv';

  // 1. ================= CONTACT FORM DISCORD INTEGRATION =================
  function initContactForm() {
    document.addEventListener('submit', async function (e) {
      const form = e.target;
      if (!form) return;

      const nameInput = form.querySelector('input[name="Name"], input[name="name"], input[placeholder*="name" i]');
      const emailInput = form.querySelector('input[name="Email"], input[name="email"], input[type="email"]');
      const projectInput = form.querySelector('textarea, input[name="Your Project"], input[placeholder*="project" i]');

      // If this is not a contact form with name & email, pass through
      if (!nameInput && !emailInput) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const project = projectInput ? projectInput.value.trim() : '';

      if (!name || !email) {
        showToast('Please provide your name and email address.', 'error');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
      let originalBtnContent = '';
      if (submitBtn) {
        originalBtnContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span style="opacity:0.8;">Sending to Octa Devs...</span>';
      }

      let delivered = false;

      // 1. Attempt Node.js backend if active
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, project })
        });
        const text = await response.text();
        if (response.ok && text) {
          const data = JSON.parse(text);
          if (data.success) delivered = true;
        }
      } catch (err) {
        console.warn('Backend server contact endpoint unavailable, attempting direct Discord webhook:', err);
      }

      // 2. Direct Discord Webhook Fallback (for static hosting on Cloudflare Pages)
      if (!delivered) {
        try {
          const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: 'Octa Devs Portal',
              avatar_url: 'https://octadevs.fun/octa_favicon.jpg',
              embeds: [{
                title: '⚡ New Project Inquiry',
                color: 15420781,
                fields: [
                  { name: 'Client Name', value: name, inline: true },
                  { name: 'Email', value: email, inline: true },
                  { name: 'Project Details', value: project || 'No description provided.' }
                ],
                timestamp: new Date().toISOString()
              }]
            })
          });
          if (discordRes.ok || discordRes.status === 204) {
            delivered = true;
          }
        } catch (e) {
          console.error('Direct Discord delivery failed:', e);
        }
      }

      if (delivered) {
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (projectInput) projectInput.value = '';
        showToast('Message sent! Our team has received your inquiry on Discord.', 'success');
      } else {
        showToast('Error submitting message. Please email hello@octadevs.fun', 'error');
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnContent;
      }
    }, true);
  }

  // 2. ================= LAUNCH COUNTDOWN WIDGET =================
  let countdownTimerId = null;

  async function initLaunchCountdown() {
    try {
      let countdown = null;
      try {
        const res = await fetch('/api/countdown');
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            if (data.success && data.countdown) countdown = data.countdown;
          }
        }
      } catch (e) {}

      // Supabase direct REST fallback
      if (!countdown) {
        try {
          const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/launch_settings?select=*&limit=1`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          if (sbRes.ok) {
            const rows = await sbRes.json();
            if (rows && rows[0]) countdown = rows[0];
          }
        } catch (sbErr) {
          console.warn('Supabase countdown fetch error:', sbErr);
        }
      }

      if (!countdown || countdown.is_active === false) return;

      const targetDate = new Date(countdown.target_date).getTime();
      renderCountdownWidget(countdown, targetDate);
    } catch (e) {
      console.warn('Countdown init error:', e);
    }
  }

  function renderCountdownWidget(countdown, targetDate) {
    const isWorkPage = window.location.pathname.includes('work') || window.location.href.includes('work.html');
    
    function tryMount() {
      if (isWorkPage) {
        // Works page: inside hero section or container
        const comingSoonCard = document.querySelector('#hero-section .framer-1qh84jt, #hero-section, .framer-1kxryyl, .octa-minimal-card, .octa-coming-wrapper, .octa-coming-soon-card');
        if (!comingSoonCard) return false;

        let cdContainer = document.getElementById('octa-live-countdown');
        if (!cdContainer) {
          cdContainer = document.createElement('div');
          cdContainer.id = 'octa-live-countdown';
          cdContainer.className = 'octa-cd-box octa-cd-box-work';
          comingSoonCard.appendChild(cdContainer);
        }

        // Rebuild only when the widget is missing, so the running timer is
        // not reset on every persistMount tick.
        if (!cdContainer.querySelector('.octa-cd-grid, [class*="octa-cd-"]')) {
          cdContainer.innerHTML = buildCountdownHtml(countdown.title, countdown.target_date);
          startCountdownLoop(targetDate);
        }
        return true;
      } else {
        // Home page: inside Coming Soon Section
        const comingSoonContent = document.querySelector('[data-framer-name="Coming Soon Content"], .framer-1wen0na');
        const comingSoonSec = document.querySelector('[data-framer-name="Coming Soon Section"], .framer-1koelmu');
        const targetContainer = comingSoonContent || comingSoonSec;
        if (!targetContainer) return false;

        let homeCd = document.getElementById('octa-home-countdown');
        if (!homeCd) {
          homeCd = document.createElement('div');
          homeCd.id = 'octa-home-countdown';
          homeCd.className = 'octa-cd-box octa-cd-box-home';
          targetContainer.appendChild(homeCd);
        }

        if (!homeCd.querySelector('.octa-cd-grid, [class*="octa-cd-"]')) {
          homeCd.innerHTML = buildCountdownHtml(countdown.title, countdown.target_date);
          startCountdownLoop(targetDate);
        }
        return true;
      }
    }

    persistMount(tryMount);
  }

  function buildCountdownHtml(title, targetDateStr) {
    let formattedDate = '';
    if (targetDateStr) {
      try {
        formattedDate = new Date(targetDateStr).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      } catch (e) {}
    }

    return `
      <div class="octa-cd-header-row">
        <div class="octa-cd-badge">
          <span class="octa-cd-dot"></span>
          <span>${escapeHtml(title || 'PLATFORM RELEASE COUNTDOWN')}</span>
        </div>
        ${formattedDate ? `<span class="octa-cd-date-pill">Target: ${escapeHtml(formattedDate)}</span>` : ''}
      </div>
      <div class="octa-cd-grid">
        <div class="octa-cd-item">
          <span class="octa-cd-num" id="cd-days">00</span>
          <span class="octa-cd-lbl">Days</span>
        </div>
        <span class="octa-cd-sep">:</span>
        <div class="octa-cd-item">
          <span class="octa-cd-num" id="cd-hours">00</span>
          <span class="octa-cd-lbl">Hours</span>
        </div>
        <span class="octa-cd-sep">:</span>
        <div class="octa-cd-item">
          <span class="octa-cd-num" id="cd-mins">00</span>
          <span class="octa-cd-lbl">Mins</span>
        </div>
        <span class="octa-cd-sep">:</span>
        <div class="octa-cd-item">
          <span class="octa-cd-num" id="cd-secs">00</span>
          <span class="octa-cd-lbl">Secs</span>
        </div>
      </div>
    `;
  }

  function startCountdownLoop(targetDate) {
    if (countdownTimerId) clearInterval(countdownTimerId);

    function tick() {
      const now = Date.now();
      const diff = targetDate - now;

      const dEls = document.querySelectorAll('#cd-days');
      const hEls = document.querySelectorAll('#cd-hours');
      const mEls = document.querySelectorAll('#cd-mins');
      const sEls = document.querySelectorAll('#cd-secs');

      if (!dEls.length) return;

      if (diff <= 0) {
        dEls.forEach(el => el.textContent = '00');
        hEls.forEach(el => el.textContent = '00');
        mEls.forEach(el => el.textContent = '00');
        sEls.forEach(el => el.textContent = '00');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const dStr = String(days).padStart(2, '0');
      const hStr = String(hours).padStart(2, '0');
      const mStr = String(mins).padStart(2, '0');
      const sStr = String(secs).padStart(2, '0');

      dEls.forEach(el => el.textContent = dStr);
      hEls.forEach(el => el.textContent = hStr);
      mEls.forEach(el => el.textContent = mStr);
      sEls.forEach(el => el.textContent = sStr);
    }

    tick();
    countdownTimerId = setInterval(tick, 1000);
  }

  // 3. ================= DYNAMIC TEAM MEMBERS SHOWCASE =================
  async function initTeamMembers() {
    try {
      let team = null;
      try {
        const res = await fetch('/api/team');
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            if (data.success && Array.isArray(data.team) && data.team.length > 0) team = data.team;
          }
        }
      } catch (e) {}

      // Supabase direct REST fallback
      if (!team) {
        try {
          const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/team_members?select=*&order=sort_order.asc,created_at.asc`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          if (sbRes.ok) {
            const rows = await sbRes.json();
            if (Array.isArray(rows) && rows.length > 0) team = rows;
          }
        } catch (sbErr) {
          console.warn('Supabase team fetch error:', sbErr);
        }
      }

      if (!Array.isArray(team) || team.length === 0) return;

      function mountTeam() {
        // Mount exclusively on Home Page down near the bottom (right above Contact section)
        if (window.location.pathname.includes('work') || window.location.href.includes('work.html')) {
          return true;
        }

        const contactSection = document.querySelector('[data-framer-name="Contact Section"], #contact');
        const comingSoonSec = document.querySelector('[data-framer-name="Coming Soon Section"], .framer-1koelmu');

        let targetParent = null;
        let insertBeforeNode = null;

        if (contactSection && contactSection.parentNode) {
          targetParent = contactSection.parentNode;
          insertBeforeNode = contactSection;
        } else if (comingSoonSec && comingSoonSec.parentNode) {
          targetParent = comingSoonSec.parentNode;
          insertBeforeNode = comingSoonSec.nextSibling;
        } else {
          const bioSection = document.getElementById('bio-section');
          if (bioSection && bioSection.parentNode) {
            targetParent = bioSection.parentNode;
            insertBeforeNode = bioSection.nextSibling;
          }
        }

        if (!targetParent) return false;

        let teamSection = document.getElementById('octa-dynamic-team-section');
        if (!teamSection) {
          teamSection = document.createElement('section');
          teamSection.id = 'octa-dynamic-team-section';
          teamSection.className = 'octa-team-showcase-section';
          targetParent.insertBefore(teamSection, insertBeforeNode);
        }

        // Already rendered and intact: don't rebuild on every persistMount tick.
        if (teamSection.querySelector('.octa-member-card')) return true;

        teamSection.innerHTML = `
          <div class="octa-team-inner">
            <div class="octa-team-header-row">
              <div class="octa-team-meta">
                <span class="octa-section-tag">/OUR PEOPLE · CORE TEAM</span>
                <h3 class="octa-team-title">The Founding Engineers & Designers</h3>
              </div>
              <p class="octa-team-subtext">
                Turning ambitious product concepts into scalable, production-grade applications.
              </p>
            </div>
            <div class="octa-team-grid">
              ${team.map(m => {
                const initials = m.name ? m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'OD';
                const avatarHtml = m.avatar_url
                  ? `<img src="${m.avatar_url}" class="octa-member-avatar" alt="${escapeHtml(m.name)}" onerror="this.outerHTML='<div class=\\'octa-member-avatar octa-initials\\'>${initials}</div>'">`
                  : `<div class="octa-member-avatar octa-initials">${initials}</div>`;

                const socials = m.socials || {};
                
                // Instagram handle & link
                let instaHtml = '';
                if (socials.instagram) {
                  let instaRaw = socials.instagram;
                  let handle = instaRaw.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '').replace(/\/$/, '');
                  let instaLink = 'https://instagram.com/' + handle;
                  instaHtml = `
                    <a href="${instaLink}" target="_blank" rel="noopener" class="octa-insta-chip" title="Instagram: @${escapeHtml(handle)}">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                      <span>@${escapeHtml(handle)}</span>
                    </a>
                  `;
                }

                // Portfolio / personal site gets its own highlighted pill
                let portfolioHtml = '';
                if (socials.portfolio) {
                  const portfolioUrl = /^https?:\/\//i.test(socials.portfolio)
                    ? socials.portfolio
                    : 'https://' + socials.portfolio;
                  portfolioHtml = `
                    <a href="${escapeHtml(portfolioUrl)}" target="_blank" rel="noopener" class="octa-portfolio-chip" title="Portfolio: ${escapeHtml(portfolioUrl)}">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
                      </svg>
                      <span>Portfolio ↗</span>
                    </a>
                  `;
                }

                // Other socials
                const otherLinks = [];
                if (socials.github) {
                  otherLinks.push(`<a href="${socials.github}" target="_blank" rel="noopener" class="octa-social-sublink">GitHub ↗</a>`);
                }
                if (socials.linkedin) {
                  otherLinks.push(`<a href="${socials.linkedin}" target="_blank" rel="noopener" class="octa-social-sublink">LinkedIn ↗</a>`);
                }
                if (socials.twitter) {
                  otherLinks.push(`<a href="${socials.twitter}" target="_blank" rel="noopener" class="octa-social-sublink">X ↗</a>`);
                }

                return `
                  <div class="octa-member-card">
                    <div class="octa-member-top">
                      ${avatarHtml}
                      <div class="octa-member-info">
                        <h4 class="octa-member-name">${escapeHtml(m.name)}</h4>
                        <span class="octa-member-role-badge">${escapeHtml(m.role || 'Founding Engineer')}</span>
                      </div>
                    </div>
                    ${m.bio ? `<p class="octa-member-bio">${escapeHtml(m.bio)}</p>` : ''}
                    <div class="octa-member-footer">
                      ${portfolioHtml}
                      ${instaHtml}
                      ${otherLinks.length ? `<div class="octa-social-others">${otherLinks.join(' · ')}</div>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
        return true;
      }

      persistMount(mountTeam);
    } catch (e) {
      console.warn('Team fetch error:', e);
    }
  }

  // 4. ================= DYNAMIC PROJECTS PORTFOLIO =================
  async function initPublishedProjects() {
    try {
      let projects = null;
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            if (data.success && Array.isArray(data.projects)) projects = data.projects;
          }
        }
      } catch (e) {}

      // Supabase direct REST fallback
      if (!projects) {
        try {
          const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=*&order=sort_order.asc,created_at.desc`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          if (sbRes.ok) {
            const rows = await sbRes.json();
            if (Array.isArray(rows)) projects = rows;
          }
        } catch (sbErr) {
          console.warn('Supabase projects fetch error:', sbErr);
        }
      }

      if (!Array.isArray(projects)) return;
      const published = Array.isArray(projects) ? projects.filter(p => p.status === 'Published') : [];
      const isWorkPage = window.location.pathname.includes('work') || window.location.href.includes('work.html');

      // If home page and no published projects, return
      if (!isWorkPage && published.length === 0) return;

      function mountProjects() {
        let targetParent = null;
        let insertBeforeNode = null;

        if (isWorkPage) {
          const workContainer = document.querySelector('#hero-section .framer-1qh84jt, #hero-section, .framer-1kxryyl, .framer-1f5wx7y');
          if (!workContainer) return false;
          targetParent = workContainer;
          insertBeforeNode = null;

          // The Framer section is a single flex row, so an appended child would
          // be squeezed in beside the hero copy. Let the row wrap and have the
          // showcase take a full-width line of its own underneath.
          const parentStyle = getComputedStyle(workContainer);
          if (parentStyle.display === 'flex' || parentStyle.display === 'inline-flex') {
            workContainer.style.flexWrap = 'wrap';
            workContainer.style.height = 'auto';
            workContainer.style.overflow = 'visible';
          }
        } else {
          // Home page: Mount between Coming Soon Section and Dev Team Section
          const teamSection = document.getElementById('octa-dynamic-team-section');
          const contactSection = document.querySelector('[data-framer-name="Contact Section"], #contact');
          const comingSoonSec = document.querySelector('[data-framer-name="Coming Soon Section"], .framer-1koelmu');

          if (teamSection && teamSection.parentNode) {
            targetParent = teamSection.parentNode;
            insertBeforeNode = teamSection;
          } else if (contactSection && contactSection.parentNode) {
            targetParent = contactSection.parentNode;
            insertBeforeNode = contactSection;
          } else if (comingSoonSec && comingSoonSec.parentNode) {
            targetParent = comingSoonSec.parentNode;
            insertBeforeNode = comingSoonSec.nextSibling;
          }
        }

        if (!targetParent) return false;

        let projectsWrap = document.getElementById('octa-published-projects');
        if (!projectsWrap) {
          projectsWrap = document.createElement('div');
          projectsWrap.id = 'octa-published-projects';
          projectsWrap.className = 'octa-projects-wrap';
          if (insertBeforeNode) {
            targetParent.insertBefore(projectsWrap, insertBeforeNode);
          } else {
            targetParent.appendChild(projectsWrap);
          }
        }

        const displayItems = published.length > 0 ? published : (
          isWorkPage ? [
            {
              title: 'Apex Financial Platform',
              category: 'Mobile App · iOS & Android',
              description: 'Next-generation fintech suite built with React Native and Supabase real-time engine.',
              status: 'Coming Soon'
            },
            {
              title: 'Vortex Cloud Workspace',
              category: 'Web Application · SaaS',
              description: 'Collaborative cloud dashboard for high-growth tech teams and automated workflows.',
              status: 'Coming Soon'
            },
            {
              title: 'Pulse Studio Design System',
              category: 'Design System · UI/UX',
              description: 'Unified component system and design language engineered for multi-platform scale.',
              status: 'Coming Soon'
            }
          ] : []
        );

        if (displayItems.length === 0) return true;

        // Already rendered and still intact: leave it alone. Re-running the
        // render would wipe the active filter and restart the card animations
        // every time persistMount ticks.
        if (projectsWrap.querySelector('.octa-works-shell')) return true;

        const isLive = published.length > 0;

        // ---- Category filter set (works page only) ----
        const categories = [];
        displayItems.forEach(p => {
          const c = (p.category || 'Other').trim();
          if (c && categories.indexOf(c) === -1) categories.push(c);
        });

        const publishedCount = displayItems.filter(p => p.status === 'Published').length;
        const comingCount = displayItems.length - publishedCount;

        const statsHtml = isWorkPage ? `
          <div class="octa-works-stats">
            <div class="octa-works-stat">
              <span class="octa-works-stat-value">${displayItems.length}</span>
              <span class="octa-works-stat-label">Total Projects</span>
            </div>
            <div class="octa-works-stat">
              <span class="octa-works-stat-value">${publishedCount}</span>
              <span class="octa-works-stat-label">Shipped</span>
            </div>
            <div class="octa-works-stat">
              <span class="octa-works-stat-value">${comingCount}</span>
              <span class="octa-works-stat-label">In Build</span>
            </div>
            <div class="octa-works-stat">
              <span class="octa-works-stat-value">${categories.length}</span>
              <span class="octa-works-stat-label">Disciplines</span>
            </div>
          </div>
        ` : '';

        const filtersHtml = (isWorkPage && categories.length > 1) ? `
          <div class="octa-works-filters" role="group" aria-label="Filter projects by category">
            <button type="button" class="octa-works-filter is-active" data-filter="__all">All Work</button>
            ${categories.map(c => `
              <button type="button" class="octa-works-filter" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>
            `).join('')}
          </div>
        ` : '';

        projectsWrap.innerHTML = `
          <div class="octa-works-shell">
            <div class="octa-projects-header">
              <span class="octa-section-tag">/SELECTED WORKS · SHOWCASE</span>
              <h3 class="octa-works-title">${isLive ? 'Applications &amp; platforms we have shipped' : 'Products under active engineering'}</h3>
              <p class="octa-works-intro">${isLive
                ? 'A selection of mobile and web products built by the Octa Devs studio — from first architecture sketch through to release.'
                : 'Our current build queue. Each of these is in active development and will land on this page as it ships.'}</p>
            </div>

            ${statsHtml}
            ${filtersHtml}

            <div class="octa-projects-grid">
              ${displayItems.map((p, i) => {
                const status = p.status || 'Coming Soon';
                const isPublished = status === 'Published';
                const category = p.category || 'Mobile & Web';
                const initials = (p.title || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

                const mediaHtml = p.image_url
                  ? `<img src="${p.image_url}" class="octa-project-thumb" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.closest('.octa-project-media').classList.add('is-fallback'); this.remove();">`
                  : '';

                return `
                <article class="octa-project-card${isPublished ? ' is-published' : ''}" data-category="${escapeHtml(category)}" style="--octa-card-index:${i}">
                  <div class="octa-project-media${p.image_url ? '' : ' is-fallback'}">
                    ${mediaHtml}
                    <span class="octa-project-media-initials" aria-hidden="true">${escapeHtml(initials)}</span>
                    <span class="octa-project-status-chip ${isPublished ? 'published' : 'coming'}">
                      <span class="octa-project-status-dot"></span>${escapeHtml(status)}
                    </span>
                  </div>

                  <div class="octa-project-content">
                    <div class="octa-project-tag">${escapeHtml(category)}</div>
                    <h4 class="octa-project-name">${escapeHtml(p.title)}</h4>
                    ${p.description ? `<p class="octa-project-desc">${escapeHtml(p.description)}</p>` : ''}
                    <div class="octa-project-foot">
                      ${p.project_url
                        ? `<a href="${p.project_url}" target="_blank" rel="noopener" class="octa-project-btn">Explore project <span aria-hidden="true">↗</span></a>`
                        : `<a href="./#contact" class="octa-project-btn is-ghost">Enquire about this <span aria-hidden="true">→</span></a>`}
                    </div>
                  </div>
                </article>
              `;
              }).join('')}
            </div>

            <div class="octa-works-empty" id="octa-works-empty" hidden>
              <p>No projects in this category yet.</p>
            </div>

            ${isWorkPage ? `
              <div class="octa-works-cta">
                <div>
                  <h4 class="octa-works-cta-title">Have a product in mind?</h4>
                  <p class="octa-works-cta-sub">Tell us what you are building and we will come back with an approach and a timeline.</p>
                </div>
                <a href="./#contact" class="octa-works-cta-btn">Start a project <span aria-hidden="true">→</span></a>
              </div>
            ` : ''}
          </div>
        `;

        wireWorksFilters(projectsWrap);
        return true;
      }

      persistMount(mountProjects);
    } catch (e) {
      console.warn('Projects fetch error:', e);
    }
  }

  // Category filter chips on the works showcase.
  function wireWorksFilters(scope) {
    const buttons = scope.querySelectorAll('.octa-works-filter');
    if (!buttons.length) return;

    const cards = scope.querySelectorAll('.octa-project-card');
    const emptyNote = scope.querySelector('#octa-works-empty');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');

        buttons.forEach(b => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        let shown = 0;
        cards.forEach(card => {
          const match = filter === '__all' || card.getAttribute('data-category') === filter;
          card.hidden = !match;
          if (match) shown++;
        });

        if (emptyNote) emptyNote.hidden = shown > 0;
      });
    });
  }

  // ---------- Persistent mounting helper ----------
  // Framer rehydrates its React tree after DOMContentLoaded and discards any
  // nodes we injected into it. So instead of mounting once, we keep re-running
  // the mount function (it is a no-op when the nodes are already present)
  // for a while and whenever the DOM changes.
  function persistMount(mountFn, duration = 20000) {
    const run = () => {
      try { mountFn(); } catch (e) { console.warn('Octa mount error:', e); }
    };
    run();

    const started = Date.now();
    const timer = setInterval(() => {
      run();
      if (Date.now() - started > duration) clearInterval(timer);
    }, 400);

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        run();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), duration);
  }

  // 5. ================= FOOTER SOCIALS & ADMIN PORTAL =================
  function initFooterAdminAccess() {
    function mountFooterElements() {
      // 0) Unclip Framer footer containers so elements are never cropped.
      // NOTE: Framer ships one <footer> per breakpoint and hides the ones that
      // do not apply, so only a footer with a real width is usable as a mount
      // point. When none is visible we fall back to document.body.
      const footers = Array.from(document.querySelectorAll('footer'));
      footers.forEach(f => {
        f.style.height = 'auto';
        f.style.overflow = 'visible';
      });
      const footer = footers.find(f => f.getBoundingClientRect().width > 0) || null;
      document.querySelectorAll('.framer-1ac7wjl, .framer-dd8dt3, .framer-3drypv, .framer-5sim8l').forEach(el => {
        el.style.height = 'auto';
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
      });

      // A) In /Explore buttons group: Append Privacy & Terms pill buttons next to Contact/Services/Works
      const exploreTargetLink = document.querySelector('footer a[href*="#contact"]') || document.querySelector('a[href*="#contact"]');
      if (exploreTargetLink) {
        const pillGroup = exploreTargetLink.closest('[class*="framer-"]') ? exploreTargetLink.closest('[class*="framer-"]').parentNode : exploreTargetLink.parentNode;
        if (pillGroup && !document.getElementById('octa-explore-privacy')) {
          const privPill = document.createElement('a');
          privPill.id = 'octa-explore-privacy';
          privPill.className = 'octa-footer-pill-btn';
          privPill.href = '/privacy.html';
          privPill.title = 'Octa Devs Privacy Policy';
          privPill.innerHTML = `<span>Privacy</span>`;

          const termsPill = document.createElement('a');
          termsPill.id = 'octa-explore-terms';
          termsPill.className = 'octa-footer-pill-btn';
          termsPill.href = '/terms.html';
          termsPill.title = 'Octa Devs Terms of Service';
          termsPill.innerHTML = `<span>Terms</span>`;

          pillGroup.appendChild(privPill);
          pillGroup.appendChild(termsPill);
        }
      }

      // B) In /Connect links column: only add Discord, GitHub, and Support Us
      const mailLink = document.querySelector('footer a[href^="mailto:"]') || document.querySelector('a[href^="mailto:"]');
      if (mailLink && !document.getElementById('octa-footer-socials-col')) {
        const linkWrapper = document.createElement('div');
        linkWrapper.id = 'octa-footer-socials-col';
        linkWrapper.className = 'octa-footer-socials-col';
        linkWrapper.innerHTML = `
          <a class="octa-footer-social-link" href="${DISCORD_URL}" target="_blank" rel="noopener" title="Discord">
            <span>Discord ↗</span>
          </a>
          <a class="octa-footer-social-link" href="${GITHUB_URL}" target="_blank" rel="noopener" title="GitHub">
            <span>GitHub ↗</span>
          </a>
        `;
        const targetContainer = mailLink.closest('.framer-dd8dt3') || mailLink.closest('.framer-1ac7wjl') || mailLink.parentNode.parentNode || mailLink.parentNode;
        targetContainer.appendChild(linkWrapper);
      }

      // C) Discrete bottom bar across entire footer attached to footer or body
      if (!document.getElementById('octa-footer-bottom-bar')) {
        const bar = document.createElement('div');
        bar.id = 'octa-footer-bottom-bar';
        bar.className = 'octa-footer-bottom-bar';
        bar.innerHTML = `
          <div class="octa-footer-bar-inner">
            <div class="octa-footer-bar-left">
              <img src="/Make_In_India.png" alt="Make in India" class="octa-mii-footer-img" />
              <span class="octa-footer-bar-sep">·</span>
              <span class="octa-footer-bar-logo">OCTA DEVS</span>
              <span class="octa-footer-bar-sep">·</span>
              <span class="octa-footer-bar-text">© 2026</span>
            </div>
            <div class="octa-footer-bar-center">
              <a href="${GITHUB_URL}" target="_blank" rel="noopener" class="octa-footer-chip-link">GitHub</a>
              <a href="${DISCORD_URL}" target="_blank" rel="noopener" class="octa-footer-chip-link">Discord</a>
              <a href="mailto:${CONTACT_EMAIL}" class="octa-footer-chip-link">${CONTACT_EMAIL}</a>
              <button type="button" class="octa-footer-chip-link octa-cookie-chip" onclick="window.openOctaCookiePreferences ? window.openOctaCookiePreferences() : null" title="Cookie Preferences">🍪 Cookies</button>
            </div>
            <div class="octa-footer-bar-right">
              <a href="/privacy.html" class="octa-footer-legal-pill" title="Octa Devs Privacy Policy">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <span>Privacy Policy</span>
              </a>
              <a href="/terms.html" class="octa-footer-legal-pill" title="Octa Devs Terms of Service">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6M9 13h6M9 17h4"></path></svg>
                <span>Terms of Service</span>
              </a>
              <a href="/admin" class="octa-footer-admin-pill" title="Octa Devs Admin Panel">
                <span class="octa-admin-pulse-dot"></span>
                <span>Admin Panel</span>
              </a>
            </div>
          </div>
        `;
        // Always mount the bar at body level: it is then immune to Framer's
        // React rehydration and always spans the full page width, regardless
        // of which breakpoint's footer is active.
        document.body.appendChild(bar);
      }

      return !!(document.getElementById('octa-footer-socials-col') || document.getElementById('octa-footer-bottom-bar'));
    }

    persistMount(mountFooterElements);
  }

  // 6. ================= HEADER SHORTCUTS =================
  // Removed: injecting chips into Framer nav breaks layout.
  // All links accessible from footer bottom bar.
  function initHeaderShortcuts() {}



  // 7. ================= COOKIE CONSENT BANNER & MODAL =================
  function initCookieConsent() {
    const COOKIE_STORAGE_KEY = 'octa_cookie_consent';

    window.openOctaCookiePreferences = function () {
      openConsentModal();
    };

    function getConsent() {
      try {
        const stored = localStorage.getItem(COOKIE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    }

    function saveConsent(consentObj) {
      try {
        localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(consentObj));
      } catch (e) {}
    }

    function closeBanner() {
      document.body.classList.remove('octa-cookie-banner-open');
      if (window.octaUpdateSupportBubbleOffset) window.octaUpdateSupportBubbleOffset();
      const banner = document.getElementById('octa-cookie-banner');
      if (banner) {
        banner.classList.remove('octa-cookie-visible');
        setTimeout(() => banner.remove(), 400);
      }
    }

    function closeModal() {
      const modal = document.getElementById('octa-cookie-modal');
      if (modal) {
        modal.classList.remove('octa-modal-visible');
        setTimeout(() => modal.remove(), 300);
      }
    }

    function applyConsent(settings) {
      const consentRecord = {
        essential: true,
        analytics: !!settings.analytics,
        functional: !!settings.functional,
        timestamp: new Date().toISOString()
      };
      saveConsent(consentRecord);
      closeBanner();
      closeModal();
      showToast('Cookie preferences updated & saved');
    }

    function openConsentModal() {
      let existingModal = document.getElementById('octa-cookie-modal');
      if (existingModal) existingModal.remove();

      const current = getConsent() || { essential: true, analytics: true, functional: true };

      const modal = document.createElement('div');
      modal.id = 'octa-cookie-modal';
      modal.className = 'octa-cookie-modal-backdrop';
      modal.innerHTML = `
        <div class="octa-cookie-modal-card" role="dialog" aria-modal="true" aria-labelledby="octa-cookie-modal-title">
          <div class="octa-cookie-modal-header">
            <div class="octa-cookie-badge-row">
              <span class="octa-cookie-beacon-dot"></span>
              <span class="octa-cookie-subheading">PRIVACY & PREFERENCES</span>
            </div>
            <h3 id="octa-cookie-modal-title" class="octa-cookie-modal-title">Cookie & Tracking Settings</h3>
            <p class="octa-cookie-modal-desc">
              Customise which categories of cookies and telemetry you allow. Essential cookies are required to deliver core website stability and security.
            </p>
          </div>

          <div class="octa-cookie-options-list">
            <!-- Essential -->
            <div class="octa-cookie-option-item">
              <div class="octa-cookie-opt-text">
                <div class="octa-cookie-opt-title-row">
                  <strong>Strictly Essential</strong>
                  <span class="octa-cookie-chip-locked">Always Active</span>
                </div>
                <p>Required for platform authentication, CSRF security, theme state, and site navigation.</p>
              </div>
              <div class="octa-cookie-switch-wrap">
                <input type="checkbox" checked disabled class="octa-toggle-checkbox">
              </div>
            </div>

            <!-- Analytics -->
            <div class="octa-cookie-option-item">
              <div class="octa-cookie-opt-text">
                <div class="octa-cookie-opt-title-row">
                  <strong>Analytics & Telemetry</strong>
                </div>
                <p>Collects anonymized usage statistics to help us optimize page load speeds, design UX, and platform features.</p>
              </div>
              <div class="octa-cookie-switch-wrap">
                <label class="octa-switch">
                  <input type="checkbox" id="octa-pref-analytics" ${current.analytics !== false ? 'checked' : ''}>
                  <span class="octa-slider"></span>
                </label>
              </div>
            </div>

            <!-- Functional -->
            <div class="octa-cookie-option-item">
              <div class="octa-cookie-opt-text">
                <div class="octa-cookie-opt-title-row">
                  <strong>Functional & Personalization</strong>
                </div>
                <p>Remembers your interface preferences and interactive settings between sessions.</p>
              </div>
              <div class="octa-cookie-switch-wrap">
                <label class="octa-switch">
                  <input type="checkbox" id="octa-pref-functional" ${current.functional !== false ? 'checked' : ''}>
                  <span class="octa-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div class="octa-cookie-modal-footer">
            <div class="octa-cookie-policy-links">
              <a href="/privacy.html" class="octa-cookie-mini-link">Privacy Policy ↗</a>
              <span>·</span>
              <a href="/terms.html" class="octa-cookie-mini-link">Terms ↗</a>
            </div>
            <div class="octa-cookie-modal-btn-row">
              <button type="button" class="octa-cookie-btn-sec" id="octa-modal-reject-btn">Reject All Non-Essential</button>
              <button type="button" class="octa-cookie-btn-pri" id="octa-modal-save-btn">Save Preferences</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      requestAnimationFrame(() => {
        modal.classList.add('octa-modal-visible');
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      document.getElementById('octa-modal-save-btn').addEventListener('click', () => {
        const analytics = document.getElementById('octa-pref-analytics').checked;
        const functional = document.getElementById('octa-pref-functional').checked;
        applyConsent({ analytics, functional });
      });

      document.getElementById('octa-modal-reject-btn').addEventListener('click', () => {
        applyConsent({ analytics: false, functional: false });
      });
    }

    function showBanner() {
      if (document.getElementById('octa-cookie-banner')) return;

      // Drives the floating support bubble out of the banner's way.
      document.body.classList.add('octa-cookie-banner-open');

      const banner = document.createElement('div');
      banner.id = 'octa-cookie-banner';
      banner.className = 'octa-cookie-banner-wrap';
      banner.setAttribute('role', 'region');
      banner.setAttribute('aria-label', 'Cookie Consent Notice');
      banner.innerHTML = `
        <div class="octa-cookie-banner-inner">
          <div class="octa-cookie-banner-main">
            <div class="octa-cookie-icon-box">
              <span>🍪</span>
            </div>
            <div class="octa-cookie-text-box">
              <div class="octa-cookie-header-row">
                <span class="octa-cookie-title">Cookie Preferences & Privacy</span>
                <span class="octa-cookie-pill-tag">GDPR & CCPA Compliant</span>
              </div>
              <p class="octa-cookie-desc">
                We use cookies and anonymous telemetry to safeguard platform integrity, analyze traffic, and power agency features. Learn more in our 
                <a href="/privacy.html" class="octa-cookie-text-link">Privacy Policy</a> and 
                <a href="/terms.html" class="octa-cookie-text-link">Terms of Service</a>.
              </p>
            </div>
          </div>
          <div class="octa-cookie-actions-row">
            <button type="button" class="octa-cookie-btn-ghost" id="octa-btn-customize">Customise</button>
            <button type="button" class="octa-cookie-btn-sec" id="octa-btn-decline">Essential Only</button>
            <button type="button" class="octa-cookie-btn-pri" id="octa-btn-accept">Accept All</button>
          </div>
        </div>
      `;
      document.body.appendChild(banner);

      requestAnimationFrame(() => {
        banner.classList.add('octa-cookie-visible');
        if (window.octaUpdateSupportBubbleOffset) {
          requestAnimationFrame(window.octaUpdateSupportBubbleOffset);
        }
      });

      document.getElementById('octa-btn-accept').addEventListener('click', () => {
        applyConsent({ analytics: true, functional: true });
      });

      document.getElementById('octa-btn-decline').addEventListener('click', () => {
        applyConsent({ analytics: false, functional: false });
      });

      document.getElementById('octa-btn-customize').addEventListener('click', () => {
        openConsentModal();
      });
    }

    // Only show banner if user has not made a decision
    const saved = getConsent();
    if (!saved) {
      setTimeout(showBanner, 800);
    }
  }

  // 8. ================= SUPPORT US (UPI) MODAL =================
  function initSupportModal() {
    window.openOctaSupportModal = function () {
      let existingModal = document.getElementById('octa-support-modal');
      if (existingModal) existingModal.remove();

      const modal = document.createElement('div');
      modal.id = 'octa-support-modal';
      modal.className = 'octa-cookie-modal-backdrop';
      modal.innerHTML = `
        <div class="octa-cookie-modal-card octa-support-card" role="dialog" aria-modal="true" aria-labelledby="octa-support-title">
          <div class="octa-cookie-modal-header" style="text-align: center;">
            <div class="octa-support-header-badge">
              <img src="/Make_In_India.png" alt="Make in India" class="octa-mii-badge-img" />
              <span class="octa-cookie-subheading">SUPPORT OUR INDIE STUDIO</span>
            </div>
            <h3 id="octa-support-title" class="octa-cookie-modal-title" style="margin-top: 10px;">Support Octa Devs 💖</h3>
            <p class="octa-cookie-modal-desc">
              We are an indie team building high-performance web applications and digital tools. Your contribution directly powers our open-source development and infrastructure!
            </p>
          </div>

          <div class="octa-upi-container">
            <div class="octa-upi-header">
              <img src="/upi.png" alt="UPI Logo" class="octa-upi-logo-img" />
              <span class="octa-upi-tag">Instant UPI Transfer</span>
            </div>
            <div class="octa-upi-box">
              <div class="octa-upi-id-label">Official VPA / UPI ID:</div>
              <div class="octa-upi-value-row">
                <code class="octa-upi-code">akshanshsinha67@axl</code>
                <button type="button" class="octa-upi-copy-btn" onclick="window.copyOctaUpiId()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  <span>Copy ID</span>
                </button>
              </div>
            </div>
            <div class="octa-upi-actions">
              <a href="upi://pay?pa=akshanshsinha67@axl&pn=Octa%20Devs&cu=INR" class="octa-cookie-btn-pri octa-upi-pay-btn" title="Pay with any UPI app (GPay, PhonePe, Paytm, BHIM)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                <span>Pay via UPI App ↗</span>
              </a>
              <a href="${DISCORD_URL}" target="_blank" rel="noopener" class="octa-cookie-btn-sec" style="display:inline-flex;align-items:center;gap:6px;" title="Join Discord Community">
                <span>Discord Community ↗</span>
              </a>
            </div>
          </div>

          <div class="octa-support-modal-footer">
            <div class="octa-mii-footer-row">
              <img src="/Make_In_India.png" alt="Make in India" class="octa-mii-footer-img" />
              <span>Proudly Built in India 🇮🇳</span>
            </div>
            <button type="button" class="octa-cookie-btn-ghost" id="octa-support-close-btn">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      requestAnimationFrame(() => {
        modal.classList.add('octa-modal-visible');
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSupportModal();
      });

      document.getElementById('octa-support-close-btn').addEventListener('click', closeSupportModal);
    };

    function closeSupportModal() {
      const modal = document.getElementById('octa-support-modal');
      if (modal) {
        modal.classList.remove('octa-modal-visible');
        setTimeout(() => modal.remove(), 300);
      }
    }

    window.copyOctaUpiId = function () {
      const upiId = 'akshanshsinha67@axl';
      navigator.clipboard.writeText(upiId).then(() => {
        showToast('UPI ID copied to clipboard: akshanshsinha67@axl', 'success');
      }).catch(() => {
        showToast('UPI ID: akshanshsinha67@axl', 'success');
      });
    };
  }

  // 8b. ================= CONTACT SECTION SOCIAL BADGES =================
  // Appends Discord + GitHub badges next to the existing Instagram icon
  // in the Framer "Social Media Icons" row on the Let's talk section.
  function initContactSocialBadges() {
    function mountBadges() {
      if (document.getElementById('octa-contact-socials')) return true;

      const instaLink = document.querySelector('a[href*="instagram.com/octadevsofficial"]');
      if (!instaLink) return false;

      const row = instaLink.closest('[data-framer-name="Social Media Icons"]')
        || instaLink.parentNode.parentNode
        || instaLink.parentNode;
      if (!row) return false;

      const wrap = document.createElement('div');
      wrap.id = 'octa-contact-socials';
      wrap.className = 'octa-contact-socials';
      wrap.innerHTML = `
        <a class="octa-contact-social-badge octa-badge-discord" href="${DISCORD_URL}" target="_blank" rel="noopener" title="Join the Octa Devs Discord" aria-label="Discord">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.3 4.9A19 19 0 0 0 15.7 3.5l-.3.7a14 14 0 0 1 4 1.3 13.4 13.4 0 0 0-11-.5c-.4.2-.7.3-.9.4a14 14 0 0 1 4-1.3l-.3-.6A19 19 0 0 0 3.7 4.9C1.3 8.5.6 12.1 1 15.6a19 19 0 0 0 5.7 2.9l.7-1a12 12 0 0 1-1.9-.9l.4-.3a13.6 13.6 0 0 0 11.6 0l.4.3c-.6.4-1.2.7-1.9 1l.7.9a19 19 0 0 0 5.7-2.9c.5-4-.7-7.6-2.1-10.6ZM8.6 13.7c-1 0-1.9-.9-1.9-2.1 0-1.1.8-2 1.9-2s1.9 1 1.9 2.1-.8 2-1.9 2Zm6.8 0c-1 0-1.9-.9-1.9-2.1 0-1.1.8-2 1.9-2s1.9 1 1.9 2.1-.8 2-1.9 2Z"></path></svg>
        </a>
        <a class="octa-contact-social-badge octa-badge-github" href="${GITHUB_URL}" target="_blank" rel="noopener" title="Octa Devs on GitHub" aria-label="GitHub">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.47c.53.1.72-.23.72-.5v-1.8c-2.92.64-3.54-1.4-3.54-1.4-.48-1.23-1.17-1.56-1.17-1.56-.96-.65.07-.64.07-.64 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.47 1.15 3.07.88.1-.68.37-1.15.67-1.41-2.33-.27-4.78-1.17-4.78-5.2 0-1.15.41-2.09 1.08-2.83-.11-.27-.47-1.34.1-2.8 0 0 .88-.28 2.888 1.08a9.95 9.95 0 0 1 5.24 0c2-1.36 2.88-1.08 2.88-1.08.58 1.46.21 2.53.11 2.8.67.74 1.08 1.68 1.08 2.83 0 4.04-2.46 4.93-4.8 5.19.38.33.72.97.72 1.96v2.9c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z"></path></svg>
        </a>
      `;

      row.appendChild(wrap);
      return true;
    }

    persistMount(mountBadges);
  }

  // 9. ================= FLOATING SUPPORT US BUBBLE (bottom-right) =================
  function initSupportBubble() {
    if (document.getElementById('octa-support-bubble')) return;

    const wrap = document.createElement('div');
    wrap.id = 'octa-support-bubble';
    wrap.className = 'octa-support-bubble';
    wrap.innerHTML = `
      <button type="button" class="octa-support-bubble-btn" aria-label="Support Octa Devs" title="Support Octa Devs">
        <span class="octa-support-bubble-ring" aria-hidden="true"></span>
        <span class="octa-support-bubble-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-6.7-4.35-9.2-8.2C1 10 2.1 6.3 5.3 5.2 7.4 4.5 9.6 5.3 12 7.6c2.4-2.3 4.6-3.1 6.7-2.4 3.2 1.1 4.3 4.8 2.5 7.6C18.7 16.65 12 21 12 21z"></path></svg>
        </span>
        <span class="octa-support-bubble-label">Support Us</span>
      </button>
    `;
    document.body.appendChild(wrap);

    wrap.querySelector('.octa-support-bubble-btn').addEventListener('click', () => {
      if (window.openOctaSupportModal) window.openOctaSupportModal();
    });

    // rAF is paused in background tabs, so back it with a timeout: the bubble
    // must never be left invisible and un-clickable.
    const reveal = () => {
      wrap.classList.add('octa-bubble-in');
      updateSupportBubbleOffset();
    };
    requestAnimationFrame(reveal);
    setTimeout(reveal, 300);

    window.addEventListener('resize', updateSupportBubbleOffset);
  }

  // Keeps the bubble clear of the cookie banner. Done in JS rather than CSS so
  // the offset always tracks the banner's real height on any breakpoint.
  function updateSupportBubbleOffset() {
    const bubble = document.getElementById('octa-support-bubble');
    if (!bubble) return;

    const base = window.innerWidth <= 700 ? 18 : 24;
    const banner = document.getElementById('octa-cookie-banner');

    if (banner && banner.classList.contains('octa-cookie-visible')) {
      const bannerHeight = banner.getBoundingClientRect().height;
      bubble.style.bottom = Math.round(base + bannerHeight + 14) + 'px';
    } else {
      bubble.style.bottom = base + 'px';
    }
  }
  window.octaUpdateSupportBubbleOffset = updateSupportBubbleOffset;

  // Toast Notification UI
  function showToast(message, type = 'success') {
    let toast = document.getElementById('octa-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'octa-toast';
      toast.className = 'octa-toast-element';
      document.body.appendChild(toast);
    }
    toast.className = `octa-toast-element ${type} show`;
    toast.innerHTML = `<span class="octa-toast-dot ${type}"></span> <span>${escapeHtml(message)}</span>`;
    setTimeout(() => {
      toast.className = 'octa-toast-element';
    }, 4500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Injected CSS Styles for dynamic elements matching site aesthetic
  const styles = `
    /* Framer Overflow Overrides to ensure countdown and dynamic sections are always 100% visible */
    .framer-1koelmu, [data-framer-name="Coming Soon Section"] {
      height: auto !important;
      min-height: auto !important;
      overflow: visible !important;
      padding-bottom: 60px !important;
    }
    .framer-1wen0na, [data-framer-name="Coming Soon Content"] {
      height: auto !important;
      overflow: visible !important;
      max-width: 820px !important;
    }

    /* ================= COOKIE CONSENT BANNER & MODAL ================= */
    .octa-cookie-banner-wrap {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(140%);
      width: calc(100% - 40px);
      max-width: 820px;
      background: #111114;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 16px 22px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(235, 77, 109, 0.15);
      z-index: 999990;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: #faf7f3;
      font-family: "Inter", sans-serif;
    }
    .octa-cookie-banner-wrap.octa-cookie-visible {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    .octa-cookie-banner-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    .octa-cookie-banner-main {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1 1 440px;
    }
    .octa-cookie-icon-box {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(235, 77, 109, 0.12);
      border: 1px solid rgba(235, 77, 109, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .octa-cookie-text-box {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .octa-cookie-header-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .octa-cookie-title {
      font-family: "Archivo", sans-serif;
      font-size: 14.5px;
      font-weight: 700;
      color: #faf7f3;
      letter-spacing: -0.01em;
    }
    .octa-cookie-pill-tag {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .octa-cookie-desc {
      font-size: 12.5px;
      color: rgba(250, 247, 243, 0.75);
      line-height: 1.45;
      margin: 0;
    }
    .octa-cookie-text-link {
      color: #eb4d6d;
      text-decoration: underline;
      text-underline-offset: 2px;
      font-weight: 500;
    }
    .octa-cookie-text-link:hover {
      color: #ff5e7e;
    }
    .octa-cookie-actions-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .octa-cookie-btn-pri {
      background: #eb4d6d;
      color: #ffffff;
      border: none;
      border-radius: 9999px;
      padding: 8px 18px;
      font-family: "Archivo", sans-serif;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .octa-cookie-btn-pri:hover {
      background: #ff5e7e;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(235, 77, 109, 0.4);
    }
    .octa-cookie-btn-sec {
      background: rgba(255, 255, 255, 0.08);
      color: #faf7f3;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 9999px;
      padding: 8px 16px;
      font-family: "Archivo", sans-serif;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .octa-cookie-btn-sec:hover {
      background: rgba(255, 255, 255, 0.14);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.22);
    }
    .octa-cookie-btn-ghost {
      background: none;
      color: rgba(250, 247, 243, 0.65);
      border: none;
      padding: 8px 12px;
      font-family: "Archivo", sans-serif;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: color 0.2s ease;
      white-space: nowrap;
    }
    .octa-cookie-btn-ghost:hover {
      color: #ffffff;
      text-decoration: underline;
    }

    /* Modal Backdrop */
    .octa-cookie-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      padding: 20px;
    }
    .octa-cookie-modal-backdrop.octa-modal-visible {
      opacity: 1;
      pointer-events: auto;
    }
    .octa-cookie-modal-card {
      background: #121215;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 26px;
      padding: 34px 36px;
      max-width: 560px;
      width: 100%;
      color: #faf7f3;
      font-family: "Inter", sans-serif;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
      transform: scale(0.95);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .octa-cookie-modal-backdrop.octa-modal-visible .octa-cookie-modal-card {
      transform: scale(1);
    }
    .octa-cookie-modal-header {
      margin-bottom: 22px;
    }
    .octa-cookie-badge-row {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 8px;
    }
    .octa-cookie-beacon-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #eb4d6d;
      box-shadow: 0 0 8px #eb4d6d;
    }
    .octa-cookie-subheading {
      font-family: "Archivo", sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #eb4d6d;
      text-transform: uppercase;
    }
    .octa-cookie-modal-title {
      font-family: "Archivo", sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .octa-cookie-modal-desc {
      font-size: 13.5px;
      color: rgba(250, 247, 243, 0.7);
      line-height: 1.5;
    }
    .octa-cookie-options-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 20px 0;
    }
    .octa-cookie-option-item {
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .octa-cookie-opt-text {
      flex: 1;
    }
    .octa-cookie-opt-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .octa-cookie-opt-title-row strong {
      font-family: "Archivo", sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: #faf7f3;
    }
    .octa-cookie-chip-locked {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(250, 247, 243, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .octa-cookie-opt-text p {
      font-size: 12px;
      color: rgba(250, 247, 243, 0.6);
      line-height: 1.45;
      margin: 0;
    }
    /* iOS Switch */
    .octa-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }
    .octa-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .octa-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255, 255, 255, 0.16);
      transition: .3s;
      border-radius: 24px;
    }
    .octa-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }
    .octa-switch input:checked + .octa-slider {
      background-color: #eb4d6d;
    }
    .octa-switch input:checked + .octa-slider:before {
      transform: translateX(20px);
    }
    .octa-cookie-modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .octa-cookie-policy-links {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: rgba(250, 247, 243, 0.4);
    }
    .octa-cookie-mini-link {
      color: rgba(250, 247, 243, 0.7);
      text-decoration: none;
      transition: color 0.2s ease;
    }
    .octa-cookie-mini-link:hover {
      color: #eb4d6d;
    }
    .octa-cookie-modal-btn-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .octa-cookie-chip {
      background: none;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: inherit;
      color: inherit;
    }
    .octa-cookie-chip:hover {
      color: #eb4d6d !important;
    }

    /* Toast Notification */
    .octa-toast-element {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 9999px;
      padding: 12px 24px;
      color: #faf7f3;
      font-family: "Archivo", sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: none;
    }
    .octa-toast-element.show {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
    .octa-toast-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #eb4d6d;
      box-shadow: 0 0 10px #eb4d6d;
    }
    .octa-toast-dot.success {
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
    }

    /* Countdown Widget */
    .octa-cd-box {
      margin: 24px 0;
      padding: 24px 28px;
      background: #0d0d10;
      border: 1px solid rgba(235, 77, 109, 0.28);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      box-sizing: border-box;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      position: relative;
      z-index: 5;
    }
    .octa-cd-box-home {
      margin: 32px auto 0 auto;
      background: #0d0d10;
      border: 1px solid rgba(235, 77, 109, 0.32);
      border-radius: 24px;
      padding: 28px 36px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(235, 77, 109, 0.12);
    }
    .octa-cd-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      flex-wrap: wrap;
      gap: 8px;
    }
    .octa-cd-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #eb4d6d;
      font-family: "Archivo", sans-serif;
    }
    .octa-cd-date-pill {
      font-size: 11.5px;
      color: rgba(250, 247, 243, 0.55);
      font-family: "Inter", sans-serif;
      letter-spacing: 0.03em;
    }
    .octa-cd-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #eb4d6d;
      box-shadow: 0 0 10px #eb4d6d;
      animation: octaBeaconPulse 2s infinite ease-in-out;
    }
    @keyframes octaBeaconPulse {
      0%, 100% { opacity: 0.6; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.3); }
    }
    .octa-cd-grid {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      width: 100%;
    }
    .octa-cd-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 12px 16px;
      min-width: 68px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }
    .octa-cd-num {
      font-family: "Archivo", sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #faf7f3;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .octa-cd-lbl {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(250, 247, 243, 0.55);
      margin-top: 4px;
      font-weight: 600;
    }
    .octa-cd-sep {
      font-size: 24px;
      font-weight: 700;
      color: rgba(235, 77, 109, 0.85);
      line-height: 1;
    }

    /* Full-Width Team Showcase Section on Home Page */
    .octa-team-showcase-section {
      width: 100%;
      background: #0d0d10;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 90px 24px;
      box-sizing: border-box;
      position: relative;
      z-index: 5;
    }
    .octa-team-inner {
      max-width: 1180px;
      margin: 0 auto;
    }
    .octa-team-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 40px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 24px;
    }
    .octa-team-meta {
      max-width: 600px;
    }
    .octa-section-tag {
      font-family: "Archivo", sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #eb4d6d;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      display: block;
      margin-bottom: 8px;
    }
    .octa-team-title {
      font-family: "Archivo", sans-serif;
      font-size: 34px;
      font-weight: 700;
      color: #faf7f3;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 0;
    }
    .octa-team-subtext {
      font-family: "Inter", sans-serif;
      font-size: 15px;
      line-height: 1.55;
      color: rgba(250, 247, 243, 0.65);
      max-width: 380px;
      margin: 0;
    }
    .octa-team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }
    .octa-member-card {
      background: #141417;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 28px;
      color: #faf7f3;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, border-color 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    }
    .octa-member-card::before {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      width: 120px;
      height: 120px;
      background: radial-gradient(circle, rgba(235, 77, 109, 0.08) 0%, transparent 70%);
      pointer-events: none;
    }
    .octa-member-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 24px 50px rgba(0, 0, 0, 0.45);
      border-color: rgba(235, 77, 109, 0.35);
    }
    .octa-member-top {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 16px;
    }
    .octa-member-avatar {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      object-fit: cover;
      background: #1d1d22;
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }
    .octa-member-avatar.octa-initials {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Archivo", sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #eb4d6d;
      background: rgba(235, 77, 109, 0.1);
      border-color: rgba(235, 77, 109, 0.25);
    }
    .octa-member-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .octa-member-name {
      font-family: "Archivo", sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #faf7f3;
      letter-spacing: -0.01em;
      margin: 0;
    }
    .octa-member-role-badge {
      font-family: "Inter", sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: #eb4d6d;
      background: rgba(235, 77, 109, 0.12);
      border-radius: 9999px;
      padding: 2px 10px;
      align-self: flex-start;
      margin-top: 2px;
    }
    .octa-member-bio {
      font-family: "Inter", sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: rgba(250, 247, 243, 0.72);
      margin: 0 0 20px 0;
      flex: 1;
    }
    .octa-member-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .octa-portfolio-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #faf7f3;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      padding: 5px 12px;
      font-family: "Archivo", sans-serif;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .octa-portfolio-chip:hover {
      background: #faf7f3;
      border-color: #faf7f3;
      color: #111111;
      transform: translateY(-1px);
    }
    .octa-insta-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #faf7f3;
      background: linear-gradient(135deg, rgba(235, 77, 109, 0.25), rgba(131, 58, 180, 0.25));
      border: 1px solid rgba(235, 77, 109, 0.35);
      border-radius: 9999px;
      padding: 5px 12px;
      font-family: "Archivo", sans-serif;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .octa-insta-chip:hover {
      background: linear-gradient(135deg, #eb4d6d, #833ab4);
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(235, 77, 109, 0.35);
    }
    .octa-social-others {
      font-size: 12px;
      color: rgba(250, 247, 243, 0.4);
    }
    .octa-social-sublink {
      color: rgba(250, 247, 243, 0.65);
      text-decoration: none;
      transition: color 0.2s ease;
    }
    .octa-social-sublink:hover {
      color: #ffffff;
      text-decoration: underline;
    }

    /* Projects Wrap on Works & Home page */
    /* ================= WORKS / PROJECTS SHOWCASE ================= */
    /* Full-bleed dark band, matching the team showcase treatment. The light
       Framer page sits above it, so the showcase needs its own surface for the
       white headings and dark cards to read correctly.
       flex-basis 100% makes it claim its own line inside a Framer flex row. */
    .octa-projects-wrap {
      width: 100%;
      flex: 1 0 100%;
      margin: 0;
      padding: 84px 24px;
      background: #0d0d10;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      box-sizing: border-box;
      position: relative;
      z-index: 5;
    }
    .octa-works-shell {
      width: 100%;
      max-width: 1180px;
      margin: 0 auto;
    }

    .octa-projects-header {
      margin-bottom: 32px;
      text-align: center;
    }
    .octa-works-title {
      font-family: "Archivo", sans-serif;
      font-size: clamp(28px, 4vw, 44px);
      font-weight: 700;
      letter-spacing: -0.035em;
      line-height: 1.1;
      color: #faf7f3;
      margin: 10px 0 0;
      max-width: 760px;
      margin-left: auto;
      margin-right: auto;
    }
    .octa-works-intro {
      font-family: "Inter", sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: rgba(250, 247, 243, 0.62);
      max-width: 620px;
      margin: 14px auto 0;
    }

    /* ---- Stat strip ---- */
    .octa-works-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 28px;
    }
    .octa-works-stat {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 16px;
      padding: 18px 16px;
      text-align: center;
    }
    .octa-works-stat-value {
      display: block;
      font-family: "Archivo", sans-serif;
      font-size: 30px;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1;
      color: #faf7f3;
      font-variant-numeric: tabular-nums;
    }
    .octa-works-stat-label {
      display: block;
      margin-top: 8px;
      font-family: "Archivo", sans-serif;
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(250, 247, 243, 0.45);
    }

    /* ---- Filter chips ---- */
    .octa-works-filters {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      margin-bottom: 30px;
    }
    .octa-works-filter {
      font-family: "Archivo", sans-serif;
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: rgba(250, 247, 243, 0.65);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 9999px;
      padding: 8px 16px;
      cursor: pointer;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .octa-works-filter:hover {
      color: #faf7f3;
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.22);
    }
    .octa-works-filter.is-active {
      color: #111111;
      background: #faf7f3;
      border-color: #faf7f3;
    }
    .octa-works-filter:focus-visible {
      outline: 2px solid #eb4d6d;
      outline-offset: 2px;
    }

    /* ---- Grid & cards ---- */
    .octa-projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 22px;
    }
    .octa-project-card {
      position: relative;
      background: linear-gradient(170deg, #17171c 0%, #0e0e11 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      overflow: hidden;
      color: #faf7f3;
      display: flex;
      flex-direction: column;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 0.3s ease;
      animation: octaCardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
      animation-delay: calc(var(--octa-card-index, 0) * 60ms);
    }
    .octa-project-card[hidden] { display: none; }
    @keyframes octaCardIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .octa-project-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 26px 54px rgba(0, 0, 0, 0.45);
      border-color: rgba(235, 77, 109, 0.35);
    }

    /* Media */
    .octa-project-media {
      position: relative;
      width: 100%;
      height: 200px;
      background: #1a1a20;
      overflow: hidden;
      flex-shrink: 0;
    }
    .octa-project-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .octa-project-card:hover .octa-project-thumb {
      transform: scale(1.05);
    }
    .octa-project-media-initials {
      display: none;
      position: absolute;
      inset: 0;
      align-items: center;
      justify-content: center;
      font-family: "Archivo", sans-serif;
      font-size: 46px;
      font-weight: 700;
      letter-spacing: -0.04em;
      color: rgba(250, 247, 243, 0.14);
    }
    .octa-project-media.is-fallback {
      background:
        radial-gradient(ellipse at 30% 20%, rgba(235, 77, 109, 0.18) 0%, transparent 60%),
        linear-gradient(150deg, #1d1d24 0%, #121216 100%);
    }
    .octa-project-media.is-fallback .octa-project-media-initials {
      display: flex;
    }
    .octa-project-status-chip {
      position: absolute;
      top: 14px;
      right: 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: "Archivo", sans-serif;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 11px;
      border-radius: 9999px;
      letter-spacing: 0.02em;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .octa-project-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }
    .octa-project-status-chip.coming {
      background: rgba(235, 77, 109, 0.22);
      color: #ff8ba5;
      border: 1px solid rgba(235, 77, 109, 0.4);
    }
    .octa-project-status-chip.published {
      background: rgba(16, 185, 129, 0.22);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }

    /* Content */
    .octa-project-content {
      padding: 22px 24px 24px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .octa-project-tag {
      display: inline-block;
      align-self: flex-start;
      font-family: "Archivo", sans-serif;
      font-size: 10.5px;
      font-weight: 700;
      color: #eb4d6d;
      background: rgba(235, 77, 109, 0.12);
      border: 1px solid rgba(235, 77, 109, 0.22);
      border-radius: 9999px;
      padding: 4px 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
    }
    .octa-project-name {
      font-family: "Archivo", sans-serif;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.025em;
      margin-bottom: 8px;
      line-height: 1.25;
    }
    .octa-project-desc {
      font-family: "Inter", sans-serif;
      font-size: 14px;
      color: rgba(250, 247, 243, 0.62);
      line-height: 1.6;
      margin-bottom: 20px;
      flex: 1;
    }
    .octa-project-foot {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: auto;
      padding-top: 4px;
    }
    .octa-project-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      align-self: flex-start;
      color: #111111;
      background: #faf7f3;
      font-family: "Archivo", sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 9px 18px;
      border-radius: 9999px;
      text-decoration: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .octa-project-btn:hover {
      background: #ffffff;
      transform: translateY(-2px);
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
    }
    .octa-project-btn.is-ghost {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: rgba(250, 247, 243, 0.86);
    }
    .octa-project-btn.is-ghost:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.3);
      color: #ffffff;
    }

    /* Empty filter result */
    .octa-works-empty {
      text-align: center;
      padding: 48px 20px;
      border: 1px dashed rgba(255, 255, 255, 0.16);
      border-radius: 20px;
      color: rgba(250, 247, 243, 0.55);
      font-family: "Inter", sans-serif;
      font-size: 14.5px;
      margin-top: 22px;
    }
    .octa-works-empty[hidden] { display: none; }

    /* Closing CTA */
    .octa-works-cta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 40px;
      padding: 30px 32px;
      border-radius: 24px;
      background:
        radial-gradient(ellipse at 100% 0%, rgba(235, 77, 109, 0.16) 0%, transparent 60%),
        linear-gradient(150deg, #17171c 0%, #0e0e11 100%);
      border: 1px solid rgba(255, 255, 255, 0.09);
    }
    .octa-works-cta-title {
      font-family: "Archivo", sans-serif;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: #faf7f3;
      margin-bottom: 6px;
    }
    .octa-works-cta-sub {
      font-family: "Inter", sans-serif;
      font-size: 14px;
      line-height: 1.55;
      color: rgba(250, 247, 243, 0.6);
      max-width: 520px;
    }
    .octa-works-cta-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      background: #eb4d6d;
      color: #ffffff;
      font-family: "Archivo", sans-serif;
      font-size: 14px;
      font-weight: 600;
      padding: 13px 26px;
      border-radius: 9999px;
      text-decoration: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .octa-works-cta-btn:hover {
      background: #ff5e7e;
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(235, 77, 109, 0.4);
    }

    .octa-cd-box-work {
      margin-top: 32px;
      margin-bottom: 40px;
      width: 100%;
      max-width: 900px;
    }

    @media (max-width: 700px) {
      .octa-projects-wrap { padding: 54px 18px; }
      .octa-projects-grid { grid-template-columns: 1fr; gap: 18px; }
      .octa-works-stats { grid-template-columns: repeat(2, 1fr); }
      .octa-project-media { height: 180px; }
      .octa-works-cta { padding: 24px 20px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .octa-project-card { animation: none; }
      .octa-project-card:hover .octa-project-thumb { transform: none; }
    }

    .octa-footer-pill-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-color: var(--token-2fcd1089-c4fe-44ec-8e47-1defe3c9bd50, rgb(250, 247, 243));
      color: rgb(17, 17, 17);
      border-radius: 8px;
      padding: 8px 16px;
      margin: 4px;
      font-family: "Archivo", "Inter", sans-serif;
      font-size: 16px;
      font-weight: 500;
      letter-spacing: -0.02em;
      text-decoration: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    .octa-footer-pill-btn:hover {
      background-color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    /* Footer Socials column inside /Connect */
    .octa-footer-socials-col {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 14px;
    }
    .octa-footer-social-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: "Archivo", sans-serif;
      font-size: 13.5px;
      font-weight: 500;
      color: rgba(250, 247, 243, 0.65);
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .octa-footer-social-link:hover {
      color: #faf7f3;
      transform: translateX(3px);
    }
    .octa-footer-admin-portal-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: "Archivo", sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: rgba(250, 247, 243, 0.5);
      text-decoration: none;
      transition: all 0.2s ease;
      margin-top: 4px;
    }
    .octa-footer-admin-portal-link:hover {
      color: #eb4d6d;
      transform: translateX(2px);
    }

    /* Bottom Sub-Bar across entire footer */
    .octa-footer-bottom-bar {
      width: 100%;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 22px 24px;
      box-sizing: border-box;
      position: relative;
      z-index: 10;
      background: #0d0d10;
    }
    .octa-footer-bar-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }
    .octa-footer-bar-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: "Inter", sans-serif;
      font-size: 13px;
      color: rgba(250, 247, 243, 0.5);
    }
    .octa-footer-bar-logo {
      font-family: "Archivo", sans-serif;
      font-weight: 700;
      color: #faf7f3;
      letter-spacing: -0.01em;
    }
    .octa-footer-bar-sep {
      color: rgba(250, 247, 243, 0.3);
    }
    .octa-footer-bar-center {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .octa-footer-chip-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: "Archivo", sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: rgba(250, 247, 243, 0.6);
      text-decoration: none;
      padding: 5px 10px;
      border-radius: 6px;
      transition: all 0.2s ease;
    }
    .octa-footer-chip-link:hover {
      color: #faf7f3;
      background: rgba(255, 255, 255, 0.06);
    }
    .octa-footer-admin-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      padding: 7px 16px;
      color: #faf7f3;
      font-family: "Archivo", sans-serif;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-decoration: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .octa-footer-admin-pill:hover {
      background: #eb4d6d;
      border-color: #eb4d6d;
      color: #ffffff;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(235, 77, 109, 0.35);
    }
    .octa-footer-legal-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      padding: 7px 15px;
      color: rgba(250, 247, 243, 0.82);
      font-family: "Archivo", sans-serif;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.01em;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .octa-footer-legal-pill svg {
      opacity: 0.7;
      flex-shrink: 0;
    }
    .octa-footer-legal-pill:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.28);
      color: #ffffff;
      transform: translateY(-2px);
    }
    .octa-footer-legal-pill:hover svg {
      opacity: 1;
    }
    .octa-footer-bar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    @media (max-width: 860px) {
      .octa-footer-bar-inner {
        justify-content: center;
        text-align: center;
      }
      .octa-footer-bar-center,
      .octa-footer-bar-right {
        justify-content: center;
        width: 100%;
      }
    }
    .octa-admin-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #eb4d6d;
      box-shadow: 0 0 8px #eb4d6d;
      transition: background 0.2s ease;
    }
    .octa-footer-admin-pill:hover .octa-admin-pulse-dot {
      background: #ffffff;
      box-shadow: 0 0 8px #ffffff;
    }

    /* Header Nav Social Chips */
    .octa-header-socials-wrap {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-left: 12px;
    }
    .octa-nav-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-family: "Archivo", sans-serif;
      font-size: 11.5px;
      font-weight: 600;
      color: rgba(250, 247, 243, 0.8);
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .octa-nav-chip:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .octa-nav-chip-discord:hover {
      background: rgba(88, 101, 242, 0.2);
      border-color: rgba(88, 101, 242, 0.4);
      color: #ffffff;
    }
    .octa-nav-chip-support {
      background: rgba(235, 77, 109, 0.15);
      border: 1px solid rgba(235, 77, 109, 0.35);
      color: #eb4d6d;
      cursor: pointer;
    }
    .octa-nav-chip-support:hover {
      background: #eb4d6d;
      color: #ffffff;
      border-color: #eb4d6d;
      box-shadow: 0 4px 14px rgba(235, 77, 109, 0.35);
    }
    .octa-support-card {
      max-width: 520px;
    }
    .octa-support-header-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      justify-content: center;
    }
    .octa-mii-badge-img {
      height: 28px;
      width: auto;
      object-fit: contain;
    }
    .octa-upi-container {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 20px;
      margin: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .octa-upi-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .octa-upi-logo-img {
      height: 26px;
      width: auto;
      object-fit: contain;
    }
    .octa-upi-tag {
      font-family: "Archivo", sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      padding: 3px 10px;
      border-radius: 9999px;
      letter-spacing: 0.04em;
    }
    .octa-upi-box {
      background: #09090b;
      border: 1px dashed rgba(235, 77, 109, 0.35);
      border-radius: 14px;
      padding: 14px 16px;
    }
    .octa-upi-id-label {
      font-size: 11px;
      color: rgba(250, 247, 243, 0.55);
      margin-bottom: 6px;
      font-family: "Inter", sans-serif;
    }
    .octa-upi-value-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .octa-upi-code {
      font-family: "JetBrains Mono", "Fira Code", monospace;
      font-size: 16px;
      font-weight: 700;
      color: #faf7f3;
      letter-spacing: 0.02em;
    }
    .octa-upi-copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(235, 77, 109, 0.15);
      color: #eb4d6d;
      border: 1px solid rgba(235, 77, 109, 0.3);
      border-radius: 9999px;
      padding: 6px 14px;
      font-family: "Archivo", sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .octa-upi-copy-btn:hover {
      background: #eb4d6d;
      color: #ffffff;
    }
    .octa-upi-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .octa-upi-pay-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }
    .octa-support-modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .octa-mii-footer-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: rgba(250, 247, 243, 0.6);
      font-family: "Inter", sans-serif;
    }
    .octa-mii-footer-img {
      height: 22px;
      width: auto;
      object-fit: contain;
    }
    .octa-footer-mii-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* ================= CONTACT SECTION SOCIAL BADGES ================= */
    .octa-contact-socials {
      display: inline-flex;
      align-items: center;
      gap: 16px;
    }
    .octa-contact-social-badge {
      width: 40px;
      height: 40px;
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.1);
      color: #111111;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .octa-contact-social-badge svg {
      width: 20px;
      height: 20px;
      display: block;
    }
    .octa-contact-social-badge:hover {
      transform: translateY(-3px);
      color: #ffffff;
    }
    .octa-badge-discord:hover {
      background: #5865f2;
      box-shadow: 0 8px 20px rgba(88, 101, 242, 0.35);
    }
    .octa-badge-github:hover {
      background: #111111;
      box-shadow: 0 8px 20px rgba(17, 17, 17, 0.3);
    }
    .octa-contact-social-badge:focus-visible {
      outline: 2px solid #eb4d6d;
      outline-offset: 3px;
    }

    /* ================= FLOATING SUPPORT US BUBBLE ================= */
    .octa-support-bubble {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 999995;
      opacity: 0;
      transform: translateY(24px) scale(0.85);
      transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), bottom 0.4s ease;
      pointer-events: none;
    }
    .octa-support-bubble.octa-bubble-in {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .octa-support-bubble-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 0;
      height: 56px;
      padding: 0 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      background: linear-gradient(135deg, #f0607e 0%, #eb4d6d 55%, #d13455 100%);
      color: #ffffff;
      font-family: "Archivo", sans-serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.01em;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(235, 77, 109, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25);
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      -webkit-tap-highlight-color: transparent;
    }
    .octa-support-bubble-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 16px 42px rgba(235, 77, 109, 0.5), 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    .octa-support-bubble-btn:active {
      transform: translateY(-1px) scale(0.97);
    }
    .octa-support-bubble-btn:focus-visible {
      outline: 2px solid #ffffff;
      outline-offset: 3px;
    }
    .octa-support-bubble-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      animation: octaBubbleHeartBeat 2.4s ease-in-out infinite;
    }
    .octa-support-bubble-label {
      max-width: 0;
      overflow: hidden;
      white-space: nowrap;
      opacity: 0;
      transition: max-width 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, margin-left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .octa-support-bubble-btn:hover .octa-support-bubble-label,
    .octa-support-bubble-btn:focus-visible .octa-support-bubble-label {
      max-width: 140px;
      opacity: 1;
      margin-left: 9px;
    }
    .octa-support-bubble-ring {
      position: absolute;
      inset: -1px;
      border-radius: 9999px;
      border: 2px solid rgba(235, 77, 109, 0.55);
      animation: octaBubblePulse 2.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
      pointer-events: none;
    }
    @keyframes octaBubblePulse {
      0%   { transform: scale(1); opacity: 0.7; }
      70%  { transform: scale(1.35); opacity: 0; }
      100% { transform: scale(1.35); opacity: 0; }
    }
    @keyframes octaBubbleHeartBeat {
      0%, 100%   { transform: scale(1); }
      12%        { transform: scale(1.22); }
      24%        { transform: scale(1); }
      36%        { transform: scale(1.16); }
      48%        { transform: scale(1); }
    }
    /* Keep toasts clear of the bubble */
    .octa-toast-element {
      bottom: 96px !important;
    }
    @media (max-width: 700px) {
      .octa-support-bubble {
        right: 16px;
        bottom: 18px;
      }
      .octa-support-bubble-btn {
        height: 50px;
        padding: 0 14px;
      }
    }
    @media print {
      .octa-support-bubble { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .octa-support-bubble-ring,
      .octa-support-bubble-icon {
        animation: none;
      }
      .octa-support-bubble {
        transition: none;
      }
    }
  `;

  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  // Initialize all dynamic modules
  function init() {
    injectStyles();
    initContactForm();
    initLaunchCountdown();
    initTeamMembers();
    initPublishedProjects();
    initFooterAdminAccess();
    initHeaderShortcuts();
    initCookieConsent();
    initSupportModal();
    initContactSocialBadges();
    initSupportBubble();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
