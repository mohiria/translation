import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ASSETS_DIR = path.resolve('src/assets');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const icons = [
  { size: 16, name: 'icon' },
  { size: 48, name: 'icon' },
  { size: 128, name: 'icon' },
  { size: 16, name: 'icon-active' },
  { size: 48, name: 'icon-active' },
  { size: 128, name: 'icon-active' },
];

const getSvg = (isActive: boolean) => {
  // Modern Cyber Palette
  const onBgStart = '#3B82F6';     // Electric Blue
  const onBgEnd = '#6366F1';       // Indigo
  const offBgStart = '#CBD5E1';    // Light Silver
  const offBgEnd = '#94A3B8';      // Muted Gray
  
  const bg = isActive ? `url(#onGrad)` : `url(#offGrad)`;
  const symbolOpacity = isActive ? '1' : '0.6';
  const strokeColor = '#FFFFFF';

  return `
    <svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="onGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${onBgStart};" />
          <stop offset="100%" style="stop-color:${onBgEnd};" />
        </linearGradient>
        <linearGradient id="offGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${offBgStart};" />
          <stop offset="100%" style="stop-color:${offBgEnd};" />
        </linearGradient>
      </defs>
      
      <!-- Base Background -->
      <rect width="128" height="128" rx="36" fill="${bg}"/>
      
      <!-- Glass Texture -->
      <path d="M128 32C128 14.3269 113.673 0 96 0V128C113.673 128 128 113.673 128 96V32Z" fill="white" fill-opacity="0.06"/>
      
      <g style="opacity: ${symbolOpacity}">
        <!-- AI Sparkle - Moved to Top Center to avoid collision -->
        <path d="M64 16L67 24L76 27L67 30L64 38L61 30L52 27L61 24L64 16Z" fill="${strokeColor}" />

        <!-- Latin "A" - Moved Left -->
        <path d="M25 90L40 46H48L63 90M32 78H56" stroke="${strokeColor}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
        
        <!-- Chinese "文" - Moved Right -->
        <path d="M72 52H104M88 52V62C88 74 82 84 68 88M80 74C84 80 92 88 106 88" stroke="${strokeColor}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      
      ${isActive ? `
        <!-- Minimalist Active Status -->
        <circle cx="112" cy="16" r="8" fill="#FFFFFF" />
        <circle cx="112" cy="16" r="5" fill="${onBgStart}" />
      ` : ''}
    </svg>
  `;
};

async function generateIcons() {
  console.log('Generating icons in Arco Design style...');
  
  for (const { size, name } of icons) {
    const isActive = name.includes('active');
    const svg = getSvg(isActive);
    const fileName = `${name}-${size}.png`;
    const filePath = path.join(ASSETS_DIR, fileName);

    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(filePath);
    
    console.log(`✓ Generated ${fileName}`);
  }
  
  console.log('All icons generated successfully.');
}

generateIcons().catch(console.error);
