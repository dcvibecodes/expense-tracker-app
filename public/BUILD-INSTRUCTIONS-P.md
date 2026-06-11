# Portfolio Tracker+ — Favicon & App Icon Setup

## Overview
Adds a proper favicon and Apple touch icon so when saved to iPhone home screen from Safari, the app shows a custom icon (dark background with portfolio growth chart and blue "+" badge) instead of the generic letter "P".

---

## Files to Create/Update

### 1. CREATE: `public/favicon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" rx="92" fill="#1a1a2e"/>
  
  <!-- Chart area background — 320x320 centered at 256,256 -->
  <rect x="96" y="96" width="320" height="320" rx="20" fill="#1e3a5f"/>
  <rect x="96" y="96" width="320" height="320" rx="20" fill="none" stroke="#2563eb" stroke-width="4"/>
  
  <!-- Grid lines (subtle) -->
  <line x1="120" y1="176" x2="392" y2="176" stroke="#2563eb" stroke-width="1" opacity="0.3"/>
  <line x1="120" y1="256" x2="392" y2="256" stroke="#2563eb" stroke-width="1" opacity="0.3"/>
  <line x1="120" y1="336" x2="392" y2="336" stroke="#2563eb" stroke-width="1" opacity="0.3"/>
  
  <!-- Growth line (upward trend) -->
  <polyline points="130,360 175,320 225,335 275,265 330,220 385,150" 
            fill="none" stroke="#60a5fa" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- Gradient fill under the line -->
  <polygon points="130,360 175,320 225,335 275,265 330,220 385,150 385,390 130,390" 
           fill="#3b82f6" opacity="0.2"/>
  
  <!-- Data points -->
  <circle cx="130" cy="360" r="6" fill="#93c5fd"/>
  <circle cx="175" cy="320" r="6" fill="#93c5fd"/>
  <circle cx="225" cy="335" r="6" fill="#93c5fd"/>
  <circle cx="275" cy="265" r="6" fill="#93c5fd"/>
  <circle cx="330" cy="220" r="6" fill="#93c5fd"/>
  <circle cx="385" cy="150" r="8" fill="#60a5fa" stroke="#ffffff" stroke-width="3"/>
  
  <!-- Plus badge bottom-right (matching expense tracker style) -->
  <circle cx="400" cy="400" r="52" fill="#3b82f6"/>
  <circle cx="400" cy="400" r="52" fill="none" stroke="#1a1a2e" stroke-width="8"/>
  <line x1="400" y1="375" x2="400" y2="425" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
  <line x1="375" y1="400" x2="425" y2="400" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
</svg>
```

---

### 2. CREATE: `public/manifest.json`

```json
{
  "name": "Portfolio Tracker+",
  "short_name": "Portfolio+",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

---

### 3. UPDATE: `public/index.html` — Replace the `<head>` section

Find this in the current `<head>`:
```html
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <title>Portfolio Tracker+</title>
    <link rel="stylesheet" href="/style.css" />
```

Replace with:
```html
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

    <!-- Apple Touch Icon (iPhone home screen) -->
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

    <!-- PWA manifest -->
    <link rel="manifest" href="/manifest.json" />

    <!-- iOS PWA meta tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Portfolio+" />
    <meta name="theme-color" content="#1a1a2e" />

    <title>Portfolio Tracker+</title>
    <link rel="stylesheet" href="/style.css" />
```

---

### 4. CREATE: `public/generate-icons.html`

This is a self-contained HTML file that generates all PNG icons in-browser. **Open this file in any browser on computer B, click "Download All Icons", then place the PNGs in the `public/` folder.**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Generate Portfolio Tracker+ Icons</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #1e293b; }
    .icon-preview { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
    .icon-item { text-align: center; }
    .icon-item canvas { border: 1px solid #e2e8f0; border-radius: 8px; }
    .icon-item p { margin-top: 8px; font-size: 14px; color: #64748b; }
    button { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; margin: 8px; }
    button:hover { background: #2563eb; }
    .instructions { background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .instructions li { margin: 8px 0; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <h1>Portfolio Tracker+ Icon Generator</h1>
  <p>Click the buttons below to download the generated PNG icons.</p>
  
  <div class="icon-preview" id="previews"></div>
  
  <div>
    <button onclick="downloadAll()">Download All Icons</button>
  </div>

  <div class="instructions">
    <h3>After downloading:</h3>
    <ol>
      <li>Place all downloaded PNG files in the <code>public/</code> folder</li>
      <li>The HTML already references these files</li>
      <li>Deploy and add to home screen from Safari</li>
    </ol>
  </div>

  <script>
    const sizes = [
      { name: 'apple-touch-icon.png', size: 180, label: 'Apple Touch Icon (180x180)' },
      { name: 'favicon-32x32.png', size: 32, label: 'Favicon 32x32' },
      { name: 'favicon-16x16.png', size: 16, label: 'Favicon 16x16' },
      { name: 'icon-192.png', size: 192, label: 'PWA Icon 192x192' },
      { name: 'icon-512.png', size: 512, label: 'PWA Icon 512x512' },
    ];

    function drawIcon(canvas, size) {
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size;
      const s = size / 512; // scale factor

      // Background rounded rect
      const radius = 92 * s;
      ctx.beginPath();
      roundedRect(ctx, 0, 0, size, size, radius);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();

      // Chart area background — 320x320 centered
      const chartR = 20 * s;
      ctx.beginPath();
      roundedRect(ctx, 96*s, 96*s, 320*s, 320*s, chartR);
      ctx.fillStyle = '#1e3a5f';
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 4 * s;
      ctx.stroke();

      // Grid lines
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1 * s;
      ctx.globalAlpha = 0.3;
      [176, 256, 336].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(120*s, y*s);
        ctx.lineTo(392*s, y*s);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Growth line
      const points = [[130,360],[175,320],[225,335],[275,265],[330,220],[385,150]];
      ctx.beginPath();
      ctx.moveTo(points[0][0]*s, points[0][1]*s);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0]*s, points[i][1]*s);
      }
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 8 * s;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Gradient fill under line
      ctx.beginPath();
      ctx.moveTo(points[0][0]*s, points[0][1]*s);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0]*s, points[i][1]*s);
      }
      ctx.lineTo(385*s, 390*s);
      ctx.lineTo(130*s, 390*s);
      ctx.closePath();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fill();

      // Data points
      points.forEach((p, i) => {
        ctx.beginPath();
        if (i === points.length - 1) {
          ctx.arc(p[0]*s, p[1]*s, 8*s, 0, Math.PI*2);
          ctx.fillStyle = '#60a5fa';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3*s;
          ctx.stroke();
        } else {
          ctx.arc(p[0]*s, p[1]*s, 6*s, 0, Math.PI*2);
          ctx.fillStyle = '#93c5fd';
          ctx.fill();
        }
      });

      // Plus badge (bottom-right)
      ctx.beginPath();
      ctx.arc(400*s, 400*s, 52*s, 0, Math.PI*2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 8*s;
      ctx.stroke();

      // Plus sign in badge
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10*s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(400*s, 375*s);
      ctx.lineTo(400*s, 425*s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(375*s, 400*s);
      ctx.lineTo(425*s, 400*s);
      ctx.stroke();
    }

    function roundedRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function downloadCanvas(canvas, filename) {
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

    function downloadAll() {
      sizes.forEach(({ name, size }) => {
        const canvas = document.createElement('canvas');
        drawIcon(canvas, size);
        downloadCanvas(canvas, name);
      });
    }

    // Render previews
    const container = document.getElementById('previews');
    sizes.forEach(({ name, size, label }) => {
      const div = document.createElement('div');
      div.className = 'icon-item';
      
      const canvas = document.createElement('canvas');
      const displaySize = Math.min(size, 180);
      canvas.style.width = displaySize + 'px';
      canvas.style.height = displaySize + 'px';
      drawIcon(canvas, size);
      
      const p = document.createElement('p');
      p.textContent = label;
      
      const btn = document.createElement('button');
      btn.textContent = 'Download';
      btn.style.fontSize = '12px';
      btn.style.padding = '6px 12px';
      btn.onclick = () => downloadCanvas(canvas, name);
      
      div.appendChild(canvas);
      div.appendChild(p);
      div.appendChild(btn);
      container.appendChild(div);
    });
  </script>
</body>
</html>
```

---

## Steps on Computer B

1. **Create the files** — Copy the code above into the respective file paths under your `portfolio-tracker` project.

2. **Generate PNG icons:**
   - Open `public/generate-icons.html` by double-clicking it in your file explorer (no server needed)
   - Click **"Download All Icons"**
   - Move the 5 downloaded PNG files into the `public/` folder:
     - `apple-touch-icon.png` (180×180) — this is what shows on iPhone home screen
     - `favicon-32x32.png`
     - `favicon-16x16.png`
     - `icon-192.png`
     - `icon-512.png`

3. **Verify** — Run the app (`node server.js`) and check:
   - Browser tab shows the new favicon (chart with + badge)
   - On iPhone Safari: tap Share → Add to Home Screen → the icon should show the portfolio chart icon

4. **Commit & push:**
   ```bash
   git add public/favicon.svg public/manifest.json public/generate-icons.html public/apple-touch-icon.png public/favicon-32x32.png public/favicon-16x16.png public/icon-192.png public/icon-512.png public/index.html
   git commit -m "Add favicon and Apple touch icon for home screen"
   git push
   ```

---

## Icon Design Description
- Dark navy background (`#1a1a2e`) matching the expense tracker style
- Large centered square chart area (`#1e3a5f`) with subtle blue grid lines
- Upward-trending growth line with data points (light blue)
- Blue "+" badge in the bottom-right corner with white plus sign
- Rounded corners on the outer shape for iOS icon mask compatibility

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `public/favicon.svg` | Create | SVG icon (used as browser favicon) |
| `public/manifest.json` | Create | PWA manifest for home screen install |
| `public/generate-icons.html` | Create | PNG generator (open in browser) |
| `public/index.html` | Update | Add icon/meta tags in `<head>` |
| `public/apple-touch-icon.png` | Generate | iPhone home screen icon |
| `public/favicon-32x32.png` | Generate | Browser tab icon |
| `public/favicon-16x16.png` | Generate | Small browser icon |
| `public/icon-192.png` | Generate | PWA icon |
| `public/icon-512.png` | Generate | PWA splash icon |
