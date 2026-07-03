const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUTPUT_DIR = path.join(__dirname, 'public');

function svg({ dark = false, adaptive = false } = {}) {
  const bg = dark ? '#0a0a0a' : '#ffffff';
  const fg = dark ? '#f5f5f5' : '#1a1a1a';
  const faint = dark ? '#5c5c5c' : '#c8c8c8';
  const style = adaptive ? `
  <style>
    .bg { fill: #fff; }
    .fg { stroke: #1a1a1a; fill: none; }
    .fill { fill: #1a1a1a; }
    .faint { stroke: #c8c8c8; }
    @media (prefers-color-scheme: dark) {
      .bg { fill: #0a0a0a; }
      .fg { stroke: #f5f5f5; }
      .fill { fill: #f5f5f5; }
      .faint { stroke: #5c5c5c; }
    }
  </style>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${style}
  <rect class="bg" width="512" height="512" fill="${bg}"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect class="fg" x="118" y="142" width="276" height="228" rx="42" stroke="${fg}" stroke-width="22"/>
    <path class="faint" d="M168 206H344M168 306H344" stroke="${faint}" stroke-width="10" opacity="0.52"/>
    <circle class="fg" cx="256" cy="256" r="56" stroke="${fg}" stroke-width="18"/>
    <path class="fg" d="M276 228H248C228 228 222 256 248 256H264C290 256 284 284 262 284H236" stroke="${fg}" stroke-width="16"/>
    <path class="fg" d="M256 216V296" stroke="${fg}" stroke-width="14"/>
  </g>
</svg>`;
}

const outputs = [
  ['favicon.svg', svg({ adaptive: true })],
  ['icon-192.png', svg(), 192],
  ['icon-512.png', svg(), 512],
  ['apple-touch-icon.png', svg(), 180],
  ['icon-dark-192.png', svg({ dark: true }), 192],
  ['icon-dark-512.png', svg({ dark: true }), 512],
  ['apple-touch-icon-dark.png', svg({ dark: true }), 180],
  ['favicon-16.png', svg(), 16],
  ['favicon-32.png', svg(), 32],
];

async function generate() {
  for (const [name, source, size] of outputs) {
    const outPath = path.join(OUTPUT_DIR, name);
    if (!size) {
      fs.writeFileSync(outPath, source);
      console.log(`Generated ${name}`);
    } else {
      await sharp(Buffer.from(source)).resize(size, size).png().toFile(outPath);
      console.log(`Generated ${name} (${size}x${size})`);
    }
  }
}

generate().catch(err => {
  console.error('Error generating icons:', err.message);
  process.exit(1);
});
