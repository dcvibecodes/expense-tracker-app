const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUTPUT_DIR = path.join(__dirname, 'public');

function svg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0a0a"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="118" y="142" width="276" height="228" rx="42" stroke="#34d399" stroke-width="22"/>
    <path d="M168 206H344M168 306H344" stroke="#236c52" stroke-width="10" opacity="0.78"/>
  </g>
</svg>`;
}

const outputs = [
  ['favicon.svg', svg()],
  ['icon-192.png', svg(), 192],
  ['icon-512.png', svg(), 512],
  ['apple-touch-icon.png', svg(), 180],
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
