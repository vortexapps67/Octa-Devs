/**
 * Octa Devs Dynamic Features
 * - Contact Form to Discord Webhook
 * - Real-Time Launch Countdown Widget
 * - Dynamic Team Members Showcase
 * - Dynamic Projects Portfolio
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

      // Find suitable container:
      // A) In work.html: look for .octa-coming-soon-card or #countdown-container
      // B) Or create a dedicated floating countdown banner
      renderCountdownWidget(countdown, targetDate);
    } catch (e) {
      console.warn('Countdown init error:', e);
    }
  }

  function renderCountdownWidget(countdown, targetDate) {
    const isWorkPage = window.location.pathname.includes('work') || window.location.href.includes('work.html');
    
    function tryMount() {
      if (isWorkPage) {
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

        cdContainer.innerHTML = `
          <div class="octa-cd-badge">
            <span class="octa-cd-dot"></span>
            <span>${escapeHtml(countdown.title || 'LAUNCH COUNTDOWN')}</span>
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

        startCountdownLoop(targetDate);
        return true;
      } else {
        const homeMount = document.getElementById('home-countdown-mount');
        if (homeMount) {
          homeMount.innerHTML = `
            <div class="octa-cd-banner">
              <div class="octa-cd-banner-inner">
                <span class="octa-cd-dot"></span>
                <span style="font-weight:600; font-size:13px; text-transform:uppercase; letter-spacing:0.04em;">${escapeHtml(countdown.title || 'Platform Launch')}</span>
                <span class="octa-cd-banner-ticker" id="cd-banner-ticker">Loading...</span>
              </div>
            </div>
          `;
          startBannerTicker(targetDate);
          return true;
        }
        return false;
      }
    }

    if (!tryMount()) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (tryMount() || attempts > 25) {
          clearInterval(interval);
        }
      }, 150);
    }
  }

  function startCountdownLoop(targetDate) {
    if (countdownTimerId) clearInterval(countdownTimerId);

    function tick() {
      const now = Date.now();
      const diff = targetDate - now;

      const dEl = document.getElementById('cd-days');
      const hEl = document.getElementById('cd-hours');
      const mEl = document.getElementById('cd-mins');
      const sEl = document.getElementById('cd-secs');

      if (!dEl || !hEl || !mEl || !sEl) return;

      if (diff <= 0) {
        dEl.textContent = '00';
        hEl.textContent = '00';
        mEl.textContent = '00';
        sEl.textContent = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      dEl.textContent = String(days).padStart(2, '0');
      hEl.textContent = String(hours).padStart(2, '0');
      mEl.textContent = String(mins).padStart(2, '0');
      sEl.textContent = String(secs).padStart(2, '0');
    }

    tick();
    countdownTimerId = setInterval(tick, 1000);
  }

  function startBannerTicker(targetDate) {
    function tick() {
      const el = document.getElementById('cd-banner-ticker');
      if (!el) return;
      const diff = targetDate - Date.now();
      if (diff <= 0) {
        el.textContent = 'Launch Live Now!';
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      el.textContent = `${days}d ${hours}h ${mins}m ${secs}s`;
    }
    tick();
    setInterval(tick, 1000);
  }

  // 3. ================= DYNAMIC TEAM MEMBERS =================
  async function initTeamMembers() {
    const bioSection = document.getElementById('bio-section');
    if (!bioSection) return;

    try {
      const res = await fetch('/api/team');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.team) || data.team.length === 0) return;

      const team = data.team;

      // Check if team grid container exists or append below bio section
      let teamContainer = document.getElementById('octa-dynamic-team');
      if (!teamContainer) {
        teamContainer = document.createElement('div');
        teamContainer.id = 'octa-dynamic-team';
        teamContainer.className = 'octa-team-grid-wrap';
        bioSection.appendChild(teamContainer);
      }

      teamContainer.innerHTML = `
        <div class="octa-team-header">
          <span class="octa-section-tag">/OUR PEOPLE</span>
          <h3 class="octa-team-title">Engineers & Product Designers</h3>
        </div>
        <div class="octa-team-grid">
          ${team.map(m => {
            const initials = m.name ? m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'OD';
            const avatarHtml = m.avatar_url
              ? `<img src="${m.avatar_url}" class="octa-member-avatar" alt="${escapeHtml(m.name)}" onerror="this.outerHTML='<div class=\\'octa-member-avatar octa-initials\\'>${initials}</div>'">`
              : `<div class="octa-member-avatar octa-initials">${initials}</div>`;

            const socials = m.socials || {};
            const socialLinks = [];
            if (socials.instagram) {
              let instaUrl = socials.instagram;
              if (!instaUrl.startsWith('http://') && !instaUrl.startsWith('https://')) {
                instaUrl = 'https://instagram.com/' + instaUrl.replace(/^@/, '');
              }
              socialLinks.push(`<a href="${instaUrl}" target="_blank" rel="noopener" class="octa-social-link">Instagram</a>`);
            }
            if (socials.github) socialLinks.push(`<a href="${socials.github}" target="_blank" rel="noopener" class="octa-social-link">GitHub</a>`);
            if (socials.linkedin) socialLinks.push(`<a href="${socials.linkedin}" target="_blank" rel="noopener" class="octa-social-link">LinkedIn</a>`);
            if (socials.twitter) socialLinks.push(`<a href="${socials.twitter}" target="_blank" rel="noopener" class="octa-social-link">X / Twitter</a>`);

            return `
              <div class="octa-member-card">
                <div class="octa-member-top">
                  ${avatarHtml}
                  <div>
                    <h4 class="octa-member-name">${escapeHtml(m.name)}</h4>
                    <p class="octa-member-role">${escapeHtml(m.role || 'Founding Member')}</p>
                  </div>
                </div>
                ${m.bio ? `<p class="octa-member-bio">${escapeHtml(m.bio)}</p>` : ''}
                ${socialLinks.length ? `<div class="octa-member-socials">${socialLinks.join(' · ')}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (e) {
      console.warn('Team fetch error:', e);
    }
  }

  // 4. ================= DYNAMIC PROJECTS =================
  async function initPublishedProjects() {
    const isWorkPage = window.location.pathname.includes('work') || window.location.href.includes('work.html');
    if (!isWorkPage) return;

    try {
      const res = await fetch('/api/projects');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.projects)) return;

      const published = data.projects.filter(p => p.status === 'Published');
      if (published.length === 0) return;

      function mountProjects() {
        // Inject below the Coming Soon card wrapper
        const comingSoonCard = document.querySelector('.octa-coming-wrapper, .octa-minimal-card, .octa-coming-soon-card');
        if (!comingSoonCard || !comingSoonCard.parentNode) return false;

        let projectsWrap = document.getElementById('octa-published-projects');
        if (!projectsWrap) {
          projectsWrap = document.createElement('div');
          projectsWrap.id = 'octa-published-projects';
          projectsWrap.className = 'octa-projects-wrap';
          comingSoonCard.parentNode.insertBefore(projectsWrap, comingSoonCard.nextSibling);
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
          if (mountProjects() || attempts > 25) {
            clearInterval(interval);
          }
        }, 150);
      }
    } catch (e) {
      console.warn('Projects fetch error:', e);
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

    /* Countdown Widget inside Coming Soon card */
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

    /* Team Members Section */
    .octa-team-grid-wrap {
      width: 100%;
      max-width: 1200px;
      margin: 40px auto 0 auto;
      padding: 0 20px;
      box-sizing: border-box;
    }
    .octa-team-header {
      margin-bottom: 24px;
      text-align: left;
    }
    .octa-section-tag {
      font-family: "Archivo", sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #eb4d6d;
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 6px;
    }
    .octa-team-title {
      font-family: "Archivo", sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #111111;
      letter-spacing: -0.02em;
    }
    .octa-team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .octa-member-card {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 24px;
      color: #faf7f3;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .octa-member-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.25);
    }
    .octa-member-top {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 14px;
    }
    .octa-member-avatar {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      object-fit: cover;
      background: #222226;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .octa-member-avatar.octa-initials {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Archivo", sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #eb4d6d;
    }
    .octa-member-name {
      font-family: "Archivo", sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #faf7f3;
    }
    .octa-member-role {
      font-size: 13px;
      color: rgba(250, 247, 243, 0.6);
      margin-top: 2px;
    }
    .octa-member-bio {
      font-size: 13.5px;
      line-height: 1.55;
      color: rgba(250, 247, 243, 0.7);
      margin-bottom: 16px;
    }
    .octa-member-socials {
      font-size: 12px;
      color: #eb4d6d;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 12px;
    }
    .octa-social-link {
      color: #eb4d6d;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;
    }
    .octa-social-link:hover {
      color: #ffffff;
      text-decoration: underline;
    }

    /* Projects Wrap on Works page */
    .octa-projects-wrap {
      width: 100%;
      max-width: 1100px;
      margin: 48px auto;
      padding: 0 24px;
      box-sizing: border-box;
    }
    .octa-projects-header {
      margin-bottom: 24px;
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
