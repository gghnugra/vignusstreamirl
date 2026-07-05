# UI/UX Design Specification: Vignus IRL Studio

## 1. Design System & Global Styles
*To the Antigravity Agent: Strictly use Vanilla CSS (no Tailwind/Bootstrap). Implement these variables in the `:root` pseudo-class.*

**Color Palette (Dark Broadcast Theme):**
- `--bg-base`: `#0F172A` (Deep Slate - Main Background)
- `--bg-panel`: `#1E293B` (Dark Slate - Sidebar & Cards)
- `--bg-panel-hover`: `#334155`
- `--accent-primary`: `#3B82F6` (Vignus Blue - Buttons, Active States)
- `--accent-hover`: `#2563EB`
- `--text-main`: `#F8FAFC`
- `--text-muted`: `#94A3B8`
- `--status-live`: `#10B981` (Green - Connected)
- `--status-warn`: `#F59E0B` (Yellow - Reconnecting)
- `--status-error`: `#EF4444` (Red - Disconnected)
- `--pro-gold`: `#F59E0B` (Gold for Premium badges)

**Typography:**
- Font Family: `system-ui, -apple-system, sans-serif`
- Base Size: `14px`

**Global Reset:**
- `box-sizing: border-box`, `margin: 0`, `padding: 0`.
- Prevent user selection on UI elements: `user-select: none`.

---

## 2. DOM Structure & Layout Hierarchies

The application consists of two main states/screens managed via JavaScript DOM manipulation (hiding/showing wrappers).

### View A: Authentication Screen (`#auth-view`)
- **Layout:** Flexbox, perfectly centered (`align-items: center`, `justify-content: center`), full height `100vh`.
- **Card (`.auth-card`):** Width ~350px, `--bg-panel`, rounded corners (`8px`), subtle shadow.
- **Content:**
  - Logo/Title: "Vignus IRL Studio".
  - Toggle Tabs: "Login" / "Register".
  - Inputs: Email, Password.
  - Button: Full-width, `--accent-primary`.
  - Error Message Container (hidden by default, red text).

### View B: Main Dashboard (`#dashboard-view`)
- **Layout:** CSS Grid or Flexbox. Total height `100vh`, `overflow: hidden`.
  - **Left Sidebar (`#sidebar`):** Fixed width `300px`, background `--bg-panel`, `border-right: 1px solid #334155`.
  - **Main Content (`#main-content`):** Flex-grow `1`, background `--bg-base`, `display: flex`, `flex-direction: column`.

---

## 3. Component Details

### 3.1. Left Sidebar Components
- **User Profile Header:** Displays User Email and an active Badge (e.g., `<span class="badge badge-free">FREE TIER</span>` or `<span class="badge badge-pro">PRO TIER</span>`).
- **Ingest Credentials Panel:**
  - Title: "SRT Ingest Info".
  - Read-only input field: `srt://[TAILSCALE_IP]:8890`. Include a "Copy" icon button.
  - List of valid Stream IDs: `publish:cam1` to `publish:cam5`.
- **OBS Output Generator:**
  - Dropdown to select Camera (Cam 1 - Cam 5).
  - Read-only output URL field.
  - "Copy URL" button.
- **Upgrade Banner (`#upsell-banner`):** Displayed only for Free users. Gradient background, text "Unlock 5 Cameras & Overlays", upgrade button.

### 3.2. Main Video Grid (`#video-grid`)
- **Container:** Lives inside `#main-content`. `padding: 1rem`, `display: grid`, `gap: 1rem`.
- **Grid Logic (JS Controlled):**
  - 1 Camera: `grid-template-columns: 1fr;`
  - 2 Cameras: `grid-template-columns: 1fr 1fr;`
  - 3-4 Cameras: `grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;`
  - 5 Cameras: Top row 2 columns, bottom row 3 columns (or similar auto-fit logic).
  
- **Video Card (`.video-card`):**
  - `position: relative`, `background: #000`, `border-radius: 8px`, `overflow: hidden`, `aspect-ratio: 16/9`.
  - `<video>` element: `width: 100%`, `height: 100%`, `object-fit: contain`.
  
- **Video Overlays (Inside `.video-card`):**
  - **Top-Left (Status):** A glowing dot (`.status-dot`) + text (e.g., "LIVE - CAM 1").
  - **Top-Right (Audio):** A semi-transparent Mute/Unmute toggle button.
  - **Bottom-Left (Stats):** `.stats-overlay` container. Black background with `0.6` opacity. Small monospace font. Format: `1080p60 | 3.5 Mbps | 120ms`.

---

## 4. Freemium UI States (Agent Logic)

*To the Antigravity Agent: Implement the following CSS classes and JS logic to handle Freemium restrictions visually.*

**Class `.pro-locked`:**
- Apply to UI elements that Free users cannot use (e.g., Cam 2-5 select options, Overlay settings).
- **Styles:** `opacity: 0.5`, `pointer-events: none`, `filter: grayscale(100%)`.
- **Decorator:** Use a CSS `::after` pseudo-element to add a small gold "PRO" lock icon or badge over the locked elements.

**JavaScript UI Init Logic:**
- If `user.tier === 'free'`:
  - Render only `cam1` in the `#video-grid`.
  - Add `.pro-locked` to the OBS URL generator for cameras 2-5.
  - Show the `#upsell-banner` in the sidebar.
- If `user.tier === 'pro'`:
  - Render "Add Camera" button or dynamic slots up to 5 in the grid.
  - Remove all `.pro-locked` classes.
  - Hide the `#upsell-banner`.

---

## 5. View C: The OBS Widget (`obs-widget.html`)
*This file is entirely separate from the main dashboard.*
- **UI:** Strictly **NO UI**. No background colors, no controls, no borders.
- **CSS:**
  
```css
  html, body {
      margin: 0; padding: 0;
      width: 100vw; height: 100vh;
      background-color: transparent !important;
      overflow: hidden;
  }
  video {
      width: 100%; height: 100%;
      object-fit: cover; /* Ensures no black bars in OBS */
  }