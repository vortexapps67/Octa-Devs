/**
 * Octa Devs Dynamic Features
 * - Contact Form to Discord Webhook
 * - Real-Time Launch Countdown Widget (Home & Works pages)
 * - Dynamic Team Members Showcase with Instagram handles (Home page)
 * - Dynamic Projects Portfolio (Home & Works pages)
 * - Accessible Footer Admin Portal Link & Bottom Bar
 */

(function () {
  'use strict';

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

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, project })
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
          if (nameInput) nameInput.value = '';
          if (emailInput) emailInput.value = '';
          if (projectInput) projectInput.value = '';
          showToast('Message sent! Our team has received your inquiry on Discord.', 'success');
        } else {
          throw new Error(data.error || 'Failed to submit form');
        }
      } catch (err) {
        console.error('Contact error:', err);
        showToast(err.message || 'Error submitting message. Please email hello.octadevs@gmail.com', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnContent;
        }
      }
    }, true);
  }

  // 2. ================= LAUNCH COUNTDOWN WIDGET =================
  let countdownTimerId = null;

  async function initLaunchCountdown() {
    try {
      const res = await fetch('/api/countdown');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.countdown || !data.countdown.is_active) return;

      const countdown = data.countdown;
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
        // Works page: inside coming soon card
        const comingSoonCard = document.querySelector('.octa-minimal-card, .octa-coming-wrapper, .octa-coming-soon-card');
        if (!comingSoonCard) return false;

        let cdContainer = document.getElementById('octa-live-countdown');
        if (!cdContainer) {
          cdContainer = document.createElement('div');
          cdContainer.id = 'octa-live-countdown';
          cdContainer.className = 'octa-cd-box';
          
          const actionWrap = comingSoonCard.querySelector('.octa-card-actions, .octa-action-wrap');
          if (actionWrap) {
            comingSoonCard.insertBefore(cdContainer, actionWrap);
          } else {
            comingSoonCard.appendChild(cdContainer);
          }
        }

        cdContainer.innerHTML = buildCountdownHtml(countdown.title);
        startCountdownLoop(targetDate);
        return true;
      } else {
        // Home page: inside Coming Soon Section card
        const comingSoonContent = document.querySelector('[data-framer-name="Coming Soon Content"], .framer-1wen0na');
        if (!comingSoonContent) return false;

        let homeCd = document.getElementById('octa-home-countdown');
        if (!homeCd) {
          homeCd = document.createElement('div');
          homeCd.id = 'octa-home-countdown';
          homeCd.className = 'octa-cd-box octa-cd-box-home';
          comingSoonContent.appendChild(homeCd);
        }

        homeCd.innerHTML = buildCountdownHtml(countdown.title);
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

  function buildCountdownHtml(title) {
    return `
      <div class="octa-cd-badge">
        <span class="octa-cd-dot"></span>
        <span>${escapeHtml(title || 'PLATFORM LAUNCH COUNTDOWN')}</span>
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
      const res = await fetch('/api/team');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.team) || data.team.length === 0) return;

      const team = data.team;

      function mountTeam() {
        // Target: Mount right after the Hero & Bio Sections container on Home Page
        const heroBioWrapper = document.querySelector('[data-framer-name="Hero & Bio Sections"], .framer-vhlkdt');
        const bioSection = document.getElementById('bio-section');
        const targetAnchor = heroBioWrapper || bioSection;

        if (!targetAnchor || !targetAnchor.parentNode) return false;

        let teamSection = document.getElementById('octa-dynamic-team-section');
        if (!teamSection) {
          teamSection = document.createElement('section');
          teamSection.id = 'octa-dynamic-team-section';
          teamSection.className = 'octa-team-showcase-section';
          targetAnchor.parentNode.insertBefore(teamSection, targetAnchor.nextSibling);
        }

        teamSection.innerHTML = `
          <div class="octa-team-inner">
            <div class="octa-team-header-row">
              <div class="octa-team-meta">
                <span class="octa-section-tag">/OUR PEOPLE</span>
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
                  let instaLink = instaRaw.startsWith('http') ? instaRaw : `https://instagram.com/${instaRaw.replace(/^@/, '')}`;
                  let handle = instaRaw.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '').replace(/\/$/, '');
                  instaHtml = `
                    <a href="${instaLink}" target="_blank" rel="noopener" class="octa-insta-chip" title="Instagram profile">
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
                  otherLinks.push(`<a href="${socials.github}" target="_blank" rel="noopener" class="octa-social-sublink">GitHub</a>`);
                }
                if (socials.linkedin) {
                  otherLinks.push(`<a href="${socials.linkedin}" target="_blank" rel="noopener" class="octa-social-sublink">LinkedIn</a>`);
                }
                if (socials.twitter) {
                  otherLinks.push(`<a href="${socials.twitter}" target="_blank" rel="noopener" class="octa-social-sublink">X / Twitter</a>`);
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
      const res = await fetch('/api/projects');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.projects)) return;

      const published = data.projects.filter(p => p.status === 'Published');
      if (published.length === 0) return;

      const isWorkPage = window.location.pathname.includes('work') || window.location.href.includes('work.html');

      function mountProjects() {
        let targetParent = null;
        let insertBeforeNode = null;

        if (isWorkPage) {
          const comingSoonCard = document.querySelector('.octa-coming-wrapper, .octa-minimal-card, .octa-coming-soon-card');
          if (!comingSoonCard || !comingSoonCard.parentNode) return false;
          targetParent = comingSoonCard.parentNode;
          insertBeforeNode = comingSoonCard.nextSibling;
        } else {
          // Home page: Mount after Coming Soon Section
          const comingSoonSec = document.querySelector('[data-framer-name="Coming Soon Section"], .framer-1koelmu');
          if (!comingSoonSec || !comingSoonSec.parentNode) return false;
          targetParent = comingSoonSec.parentNode;
          insertBeforeNode = comingSoonSec.nextSibling;
        }

        let projectsWrap = document.getElementById('octa-published-projects');
        if (!projectsWrap) {
          projectsWrap = document.createElement('div');
          projectsWrap.id = 'octa-published-projects';
          projectsWrap.className = 'octa-projects-wrap';
          targetParent.insertBefore(projectsWrap, insertBeforeNode);
        }

        projectsWrap.innerHTML = `
          <div class="octa-projects-header">
            <span class="octa-section-tag">/SELECTED WORK</span>
            <h3 class="octa-team-title">Featured Applications & Platforms</h3>
          </div>
          <div class="octa-projects-grid">
            ${published.map(p => `
              <div class="octa-project-card">
                ${p.image_url ? `<img src="${p.image_url}" class="octa-project-thumb" alt="${escapeHtml(p.title)}" onerror="this.style.display='none'">` : ''}
                <div class="octa-project-content">
                  <div class="octa-project-tag">${escapeHtml(p.category || 'Mobile & Web')}</div>
                  <h4 class="octa-project-name">${escapeHtml(p.title)}</h4>
                  <p class="octa-project-desc">${escapeHtml(p.description || '')}</p>
                  ${p.project_url ? `<a href="${p.project_url}" target="_blank" rel="noopener" class="octa-project-btn">Explore Project →</a>` : ''}
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

  // 5. ================= ACCESSIBLE FOOTER ADMIN LINK =================
  function initFooterAdminAccess() {
    function mountFooterAdmin() {
      // A) In /Connect links list right next to the contact email:
      const mailLink = document.querySelector('footer a[href^="mailto:"]') || document.querySelector('a[href^="mailto:"]');
      if (mailLink && !document.getElementById('octa-footer-admin-link')) {
        const linkWrapper = document.createElement('div');
        linkWrapper.id = 'octa-footer-admin-link';
        linkWrapper.className = 'octa-footer-admin-link-row';
        linkWrapper.innerHTML = `
          <a class="octa-footer-admin-portal-link" href="/admin" title="Open Octa Devs Admin Panel">
            <span class="octa-admin-pulse-dot"></span>
            <span>Admin Portal ↗</span>
          </a>
        `;
        if (mailLink.parentNode) {
          mailLink.parentNode.appendChild(linkWrapper);
        }
      }

      // B) Discrete bottom bar across entire footer attached to body:
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
        document.body.appendChild(bar);
      }

      return !!(document.getElementById('octa-footer-admin-link') || document.getElementById('octa-footer-bottom-bar'));
    }

    if (!mountFooterAdmin()) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (mountFooterAdmin() || attempts > 30) {
          clearInterval(interval);
        }
      }, 150);
    }
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
      margin: 22px 0 26px 0;
      padding: 20px 24px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      box-sizing: border-box;
      width: 100%;
      max-width: 480px;
    }
    .octa-cd-box-home {
      margin: 32px auto 0 auto;
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 26px 36px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.2);
    }
    .octa-cd-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #eb4d6d;
    }
    .octa-cd-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #eb4d6d;
      box-shadow: 0 0 8px #eb4d6d;
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
    }
    .octa-cd-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 10px 14px;
      min-width: 64px;
    }
    .octa-cd-num {
      font-family: "Archivo", sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #faf7f3;
      line-height: 1.1;
    }
    .octa-cd-lbl {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(250, 247, 243, 0.5);
      margin-top: 4px;
    }
    .octa-cd-sep {
      font-size: 20px;
      font-weight: 700;
      color: rgba(235, 77, 109, 0.7);
    }

    /* Full-Width Team Showcase Section on Home Page */
    .octa-team-showcase-section {
      width: 100%;
      background: #faf7f3;
      padding: 80px 24px;
      box-sizing: border-box;
      position: relative;
      z-index: 2;
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
      margin-bottom: 36px;
      border-bottom: 1px solid rgba(17, 17, 17, 0.08);
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
      letter-spacing: 0.06em;
      text-transform: uppercase;
      display: block;
      margin-bottom: 8px;
    }
    .octa-team-title {
      font-family: "Archivo", sans-serif;
      font-size: 32px;
      font-weight: 700;
      color: #111111;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 0;
    }
    .octa-team-subtext {
      font-family: "Inter", sans-serif;
      font-size: 15px;
      line-height: 1.5;
      color: rgba(17, 17, 17, 0.65);
      max-width: 360px;
      margin: 0;
    }
    .octa-team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }
    .octa-member-card {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 28px;
      color: #faf7f3;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
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
      transform: translateY(-4px);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
      border-color: rgba(235, 77, 109, 0.3);
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
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      overflow: hidden;
      color: #faf7f3;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    .octa-project-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
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
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
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

    /* Footer Admin Portal Link inside /Connect */
    .octa-footer-admin-link-row {
      margin-top: 14px;
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
    }
    .octa-footer-admin-portal-link:hover {
      color: #eb4d6d;
      transform: translateX(2px);
    }

    /* Bottom Sub-Bar across entire footer */
    .octa-footer-bottom-bar {
      width: 100%;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 24px;
      box-sizing: border-box;
      position: relative;
      z-index: 10;
      background: #111111;
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
