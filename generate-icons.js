/**
 * Generate app icons for Expense Tracker+
 * Run: npm install canvas --save-dev && node generate-icons.js
 * After generating, you can uninstall canvas: npm uninstall canvas
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'public');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;

  // Background rounded square
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  roundRect(ctx, 0, 0, s, s, s * 0.18);
  ctx.fill();

  // Content area background
  const areaSize = s * 0.625;
  const areaX = (s - areaSize) / 2;
  const areaY = (s - areaSize) / 2;
  const areaR = s * 0.039;

  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  roundRect(ctx, areaX, areaY, areaSize, areaSize, areaR);
  ctx.fill();
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = Math.max(1, s * 0.008);
  ctx.stroke();

  const cx = s / 2;
  const cy = s / 2;

  // Back banknote
  const backW = s * 0.469;
  const backH = s * 0.273;
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  roundRect(ctx, cx - backW / 2, cy - backH / 2 + s * 0.02, backW, backH, s * 0.027);
  ctx.fill();
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = Math.max(0.5, s * 0.006);
  ctx.stroke();

  // Front banknote
  const noteW = s * 0.430;
  const noteH = s * 0.254;
  const noteX = cx - noteW / 2;
  const noteY = cy - noteH / 2 - s * 0.01;

  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  roundRect(ctx, noteX, noteY, noteW, noteH, s * 0.027);
  ctx.fill();
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = Math.max(1, s * 0.008);
  ctx.stroke();

  // Inner decorative border
  const inM = s * 0.039;
  ctx.beginPath();
  roundRect(ctx, noteX + inM, noteY + inM, noteW - inM * 2, noteH - inM * 2, s * 0.016);
  ctx.strokeStyle = '#bbf7d0';
  ctx.lineWidth = Math.max(0.5, s * 0.005);
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Center circle
  const circR = s * 0.0625;
  const circY = noteY + noteH / 2;
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(cx, circY, circR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = Math.max(0.5, s * 0.006);
  ctx.stroke();

  // Abstract lines inside circle
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = Math.max(1, s * 0.01);
  ctx.lineCap = 'round';
  const lsp = s * 0.023;

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.025, circY - lsp);
  ctx.lineTo(cx + s * 0.025, circY - lsp);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.033, circY);
  ctx.lineTo(cx + s * 0.033, circY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.025, circY + lsp);
  ctx.lineTo(cx + s * 0.025, circY + lsp);
  ctx.stroke();

  // Corner ornaments
  const ornR = s * 0.012;
  ctx.strokeStyle = '#bbf7d0';
  ctx.lineWidth = Math.max(0.5, s * 0.004);
  ctx.globalAlpha = 0.4;

  [
    [noteX + inM, noteY + inM],
    [noteX + noteW - inM, noteY + inM],
    [noteX + inM, noteY + noteH - inM],
    [noteX + noteW - inM, noteY + noteH - inM]
  ].forEach(([ox, oy]) => {
    ctx.beginPath();
    ctx.arc(ox, oy, ornR, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.globalAlpha = 1;

  // Plus badge bottom-right
  const badgeX = s * 0.781;
  const badgeY = s * 0.781;
  const badgeR = s * 0.102;

  // Border cutout
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR + s * 0.016, 0, Math.PI * 2);
  ctx.fill();

  // Badge
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  ctx.fill();

  // Plus sign
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  ctx.lineCap = 'round';
  const pLen = badgeR * 0.48;

  ctx.beginPath();
  ctx.moveTo(badgeX, badgeY - pLen);
  ctx.lineTo(badgeX, badgeY + pLen);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(badgeX - pLen, badgeY);
  ctx.lineTo(badgeX + pLen, badgeY);
  ctx.stroke();

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

const sizes = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

for (const { name, size } of sizes) {
  const canvas = drawIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const outPath = path.join(OUTPUT_DIR, name);
  fs.writeFileSync(outPath, buffer);
  console.log(`Generated: ${name} (${size}x${size})`);
}

console.log('\nDone! All icons generated in public/');