/**
 * Generate app icons directly from favicon.svg
 * Run: npm install sharp --save-dev && node generate-icons.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const INPUT_SVG = path.join(__dirname, 'public', 'favicon.svg');
const OUTPUT_DIR = path.join(__dirname, 'public');

const sizes = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

async function generateIcons() {
  if (!fs.existsSync(INPUT_SVG)) {
    console.error(`Error: Could not find base SVG at ${INPUT_SVG}`);
    return;
  }

  console.log('Rendering PNGs from favicon.svg...\n');

  for (const { name, size } of sizes) {
    const outPath = path.join(OUTPUT_DIR, name);
    
    await sharp(INPUT_SVG)
      .resize(size, size)
      .toFile(outPath);
      
    console.log(`Generated: ${name} (${size}x${size})`);
  }

  console.log('\nDone! All icons match your favicon.svg perfectly.');
}

generateIcons().catch(err => console.error('Generation failed:', err));