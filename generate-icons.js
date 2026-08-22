const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUTPUT_DIR = path.join(__dirname, 'public');

function svg() {
  // Enhanced ledger-paper icon (scaled from the 32x32 reference to 512x512)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#12110F"/>
  <rect x="112" y="136" width="288" height="38.4" rx="19.2" fill="#E8E4D9"/>
  <rect x="112" y="236.8" width="192" height="38.4" rx="19.2" fill="#E8E4D9"/>
  <rect x="112" y="337.6" width="240" height="38.4" rx="19.2" fill="#8FAF98"/>
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
