# Octa Devs — Website

A faithful, standalone reproduction of the official **Octa Devs** website ([cloudy-party-424179.framer.app](https://cloudy-party-424179.framer.app/)), including all frontend styling, responsive layouts, spring physics animations, custom typography, interactive microinteractions, and assets.

---

## Features Replicated

- **Custom Typography**: Includes full webfont sets for **Archivo**, **Inter**, and **Clash Grotesk** loaded locally from `framer_assets/`.
- **Floating Pill Navigation**:
  - Centered floating capsule bar.
  - Interactive 3-line hamburger menu transforming into an "X" with spring transitions.
  - Collapsible drawer menu with staggered entrance animations.
  - Signature rolling-text hover microinteractions on links.
- **Hero Section**:
  - High-impact display typography (`BUILDING APPS`).
  - Metadata badges (`©2026`, `/BUILDING SINCE 2026`).
  - Sticky parallax holographic 3D avatar element with dynamic scroll perspective.
- **Bio Section**:
  - Agency profile for founders **Aarav Sharma** & **Akshansh Sinha**.
  - Philosophy & positioning copy.
  - "Start a Project" pill button with rolling text hover and spring arrow icon.
- **Quote Section**:
  - Scroll-fill scrub animation: text transitions dynamically from muted to dark as you scroll down the page.
- **Services Section**:
  - Service cards featuring:
    1. **Mobile App Development** (iOS & Android, React Native, App Store Launch)
    2. **Web App Development** (Product Platforms, Dashboards, Scalable Systems)
    3. **UI/UX Design** (Product Strategy, User Flows, Interface Design)
    4. **MVP Development** (Rapid Prototyping, Validation, Growth Ready)
- **Coming Soon Teaser**:
  - "Big things are coming." status announcement.
- **Contact Section**:
  - Contact form with Name, Email, and Project inquiry inputs.
  - Social media links (Instagram, Facebook, etc.).
- **Footer**:
  - Dark contrast footer with Quick Links (`/Explore`), Contact (`/Connect`), and giant watermark typography (`OCTA DEVS`).
- **Pages Included**:
  - `index.html` (Main Landing Page)
  - `work.html` (Projects / Work Showcase)
  - `blog.html` (Articles / Insights)
- **Offline & Standalone**:
  - All 108 assets (62 webfonts, 20 PNGs, 25 modules, search index) are packaged locally in `framer_assets/`.
  - Zero external CDN dependencies for rendering.

---

## How to Run

### Option 1: Using Node.js (Recommended)

1. Open your terminal in this directory (`d:\WEBSITES\OCTA DEVS`).
2. Run:
   ```bash
   npm start
   ```
   *(or `node server.js`)*
3. Open your browser and navigate to:
   ```
   http://localhost:3000/
   ```

### Option 2: Any Static Web Server

You can also serve this directory using any static file server:
- Python: `python -m http.server 3000`
- VS Code Live Server extension
- Caddy / Nginx / Apache
