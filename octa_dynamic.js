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

        cdContainer.innerHTML = buildCountdownHtml(countdown.title, countdown.target_date);
        startCountdownLoop(targetDate);
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

        homeCd.innerHTML = buildCountdownHtml(countdown.title, countdown.target_date);
        startCountdownLoop(targetDate);
        return true;
      }
    }

    if (!tryMount()) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (tryMount() || attempts > 30) {
          clearInterval(interval);
        }
      }, 150);
    }
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

      if (!mountTeam()) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (mountTeam() || attempts > 30) {
            clearInterval(interval);
          }
        }, 150);
      }
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

        projectsWrap.innerHTML = `
          <div class="octa-projects-header">
            <span class="octa-section-tag">/SELECTED WORKS · SHOWCASE</span>
            <h3 class="octa-team-title">${published.length > 0 ? 'Featured Applications & Platforms' : 'Upcoming Products Under Active Engineering'}</h3>
          </div>
          <div class="octa-projects-grid">
            ${displayItems.map(p => `
              <div class="octa-project-card">
                ${p.image_url ? `<img src="${p.image_url}" class="octa-project-thumb" alt="${escapeHtml(p.title)}" onerror="this.style.display='none'">` : ''}
                <div class="octa-project-content">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div class="octa-project-tag">${escapeHtml(p.category || 'Mobile & Web')}</div>
                    <span class="octa-project-status-chip ${p.status === 'Published' ? 'published' : 'coming'}">${escapeHtml(p.status || 'Coming Soon')}</span>
                  </div>
                  <h4 class="octa-project-name">${escapeHtml(p.title)}</h4>
                  <p class="octa-project-desc">${escapeHtml(p.description || '')}</p>
                  ${p.project_url ? `<a href="${p.project_url}" target="_blank" rel="noopener" class="octa-project-btn">Explore Project →</a>` : `<a href="./#contact" class="octa-project-btn">Inquire About Project →</a>`}
                </div>
              </div>
            `).join('')}
          </div>
        `;
        return true;
      }

      if (!mountProjects()) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (mountProjects() || attempts > 30) {
            clearInterval(interval);
          }
        }, 150);
      }
    } catch (e) {
      console.warn('Projects fetch error:', e);
    }
  }

  // 5. ================= FOOTER SOCIALS & ADMIN PORTAL =================
  function initFooterAdminAccess() {
    function mountFooterElements() {
      // 0) Unclip Framer footer containers so elements are never cropped
      const footer = document.querySelector('footer');
      if (footer) {
        footer.style.height = 'auto';
        footer.style.overflow = 'visible';
      }
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

      // B) In /Connect links column: Append Discord, GitHub, Privacy, Terms, and Admin Portal
      const mailLink = document.querySelector('footer a[href^="mailto:"]') || document.querySelector('a[href^="mailto:"]');
      if (mailLink && !document.getElementById('octa-footer-socials-col')) {
        const linkWrapper = document.createElement('div');
        linkWrapper.id = 'octa-footer-socials-col';
        linkWrapper.className = 'octa-footer-socials-col';
        linkWrapper.innerHTML = `
          <a class="octa-footer-social-link" href="${DISCORD_URL}" target="_blank" rel="noopener" title="Octa Devs Discord Community">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span>Discord Community ↗</span>
          </a>
          <a class="octa-footer-social-link" href="${GITHUB_URL}" target="_blank" rel="noopener" title="Octa Devs GitHub Organization">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            <span>github.com/octa-devs ↗</span>
          </a>
          <button type="button" class="octa-footer-social-link octa-cookie-chip" onclick="window.openOctaSupportModal ? window.openOctaSupportModal() : null" title="Support Octa Devs via UPI">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span style="color: #eb4d6d;">💖 Support Us (UPI) ↗</span>
          </button>
          <a class="octa-footer-social-link" href="/privacy.html" title="Octa Devs Privacy Policy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Privacy Policy ↗</span>
          </a>
          <a class="octa-footer-social-link" href="/terms.html" title="Octa Devs Terms of Service">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>Terms of Service ↗</span>
          </a>
          <a class="octa-footer-admin-portal-link" href="/admin" title="Open Octa Devs Admin Panel">
            <span class="octa-admin-pulse-dot"></span>
            <span>Admin Portal ↗</span>
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
              <span class="octa-footer-bar-logo">OCTA DEVS</span>
              <span class="octa-footer-bar-sep">·</span>
              <span class="octa-footer-bar-text">App Development Studio © 2026</span>
            </div>
            <div class="octa-footer-bar-center">
              <a href="${GITHUB_URL}" target="_blank" rel="noopener" class="octa-footer-chip-link" title="Octa Devs GitHub Organization">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                <span>github.com/octa-devs</span>
              </a>
              <a href="${DISCORD_URL}" target="_blank" rel="noopener" class="octa-footer-chip-link" title="Octa Devs Discord Server">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>Discord</span>
              </a>
              <a href="mailto:${CONTACT_EMAIL}" class="octa-footer-chip-link" title="Email ${CONTACT_EMAIL}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <span>${CONTACT_EMAIL}</span>
              </a>
              <span class="octa-footer-bar-sep">·</span>
              <button type="button" class="octa-footer-chip-link octa-cookie-chip octa-footer-mii-link" onclick="window.openOctaSupportModal ? window.openOctaSupportModal() : null" title="Made in India">
                <img src="/Make_In_India.png" alt="Make in India" class="octa-mii-footer-img" />
                <span>Made in India 🇮🇳</span>
              </button>
              <a href="/privacy.html" class="octa-footer-chip-link" title="Privacy Policy">
                <span>Privacy</span>
              </a>
              <a href="/terms.html" class="octa-footer-chip-link" title="Terms of Service">
                <span>Terms</span>
              </a>
              <button type="button" class="octa-footer-chip-link octa-cookie-chip" onclick="window.openOctaCookiePreferences ? window.openOctaCookiePreferences() : null" title="Manage Cookie Preferences">
                <span>Cookies 🍪</span>
              </button>
            </div>
            <div class="octa-footer-bar-right">
              <a href="/admin" class="octa-footer-admin-pill" title="Admin Control Center">
                <span class="octa-admin-pulse-dot"></span>
                <span>Admin Panel</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        `;
        if (footer) {
          footer.appendChild(bar);
        } else {
          document.body.appendChild(bar);
        }
      }

      return !!(document.getElementById('octa-footer-socials-col') || document.getElementById('octa-footer-bottom-bar'));
    }

    if (!mountFooterElements()) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (mountFooterElements() || attempts > 30) {
          clearInterval(interval);
        }
      }, 150);
    }
  }

  // 6. ================= HEADER SHORTCUTS (GITHUB & DISCORD & SUPPORT US) =================
  function initHeaderShortcuts() {
    function mountHeaderLinks() {
      // Look for top navigation bar or menu
      const navWrap = document.querySelector('[data-framer-name="Navigation Bar"], nav, header');
      if (!navWrap || document.getElementById('octa-header-socials')) return false;

      const headerLinks = document.createElement('div');
      headerLinks.id = 'octa-header-socials';
      headerLinks.className = 'octa-header-socials-wrap';
      headerLinks.innerHTML = `
        <button type="button" class="octa-nav-chip octa-nav-chip-support" onclick="window.openOctaSupportModal ? window.openOctaSupportModal() : null" title="Support Octa Devs via UPI">
          <span>💖 Support Us</span>
        </button>
        <a href="${GITHUB_URL}" target="_blank" rel="noopener" class="octa-nav-chip" title="GitHub: octa-devs">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
          <span>GitHub</span>
        </a>
        <a href="${DISCORD_URL}" target="_blank" rel="noopener" class="octa-nav-chip octa-nav-chip-discord" title="Join Discord">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span>Discord</span>
        </a>
        <a href="/privacy.html" class="octa-nav-chip" title="Privacy Policy">
          <span>Privacy</span>
        </a>
        <a href="/terms.html" class="octa-nav-chip" title="Terms of Service">
          <span>Terms</span>
        </a>
      `;

      // Try placing it nicely in the fixed navigation capsule if possible
      const navContainer = navWrap.querySelector('.framer-1m3j43o, .framer-mosn3z') || navWrap;
      navContainer.appendChild(headerLinks);
      return true;
    }

    if (!mountHeaderLinks()) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (mountHeaderLinks() || attempts > 20) {
          clearInterval(interval);
        }
      }, 200);
    }
  }

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
    .octa-projects-wrap {
      width: 100%;
      max-width: 1180px;
      margin: 64px auto;
      padding: 0 24px;
      box-sizing: border-box;
      position: relative;
      z-index: 5;
    }
    .octa-projects-header {
      margin-bottom: 28px;
      text-align: center;
    }
    .octa-projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }
    .octa-project-card {
      background: #141417;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      overflow: hidden;
      color: #faf7f3;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    }
    .octa-project-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 24px 50px rgba(0, 0, 0, 0.45);
      border-color: rgba(235, 77, 109, 0.35);
    }
    .octa-project-thumb {
      width: 100%;
      height: 200px;
      object-fit: cover;
      background: #1a1a20;
    }
    .octa-project-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .octa-project-tag {
      display: inline-block;
      align-self: flex-start;
      font-size: 11px;
      font-weight: 600;
      color: #eb4d6d;
      background: rgba(235, 77, 109, 0.12);
      border-radius: 9999px;
      padding: 3px 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .octa-project-status-chip {
      font-family: "Archivo", sans-serif;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 9999px;
      letter-spacing: 0.02em;
    }
    .octa-project-status-chip.coming {
      background: rgba(235, 77, 109, 0.12);
      color: #eb4d6d;
      border: 1px solid rgba(235, 77, 109, 0.3);
    }
    .octa-project-status-chip.published {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .octa-cd-box-work {
      margin-top: 32px;
      margin-bottom: 40px;
      width: 100%;
      max-width: 900px;
    }
    .octa-project-name {
      font-family: "Archivo", sans-serif;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .octa-project-desc {
      font-size: 14px;
      color: rgba(250, 247, 243, 0.65);
      line-height: 1.5;
      margin-bottom: 20px;
      flex: 1;
    }
    .octa-project-btn {
      align-self: flex-start;
      color: #111111;
      background: #faf7f3;
      font-family: "Archivo", sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 9999px;
      text-decoration: none;
      transition: background 0.2s ease, transform 0.2s ease;
    }
    .octa-project-btn:hover {
      background: #ffffff;
      transform: translateY(-1px);
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
