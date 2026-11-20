export function renderHairIconSVG(style: string, color: string): string {
  const faceBase = `
    <circle cx="30" cy="34" r="15.5" fill="#FFE0BD" stroke="#2C3E50" stroke-width="2.4"/>
    <ellipse cx="21.5" cy="37" rx="2.6" ry="1.5" fill="rgba(255,118,117,0.55)"/>
    <ellipse cx="38.5" cy="37" rx="2.6" ry="1.5" fill="rgba(255,118,117,0.55)"/>
    <circle cx="24.5" cy="34.5" r="2.2" fill="#2C3E50"/><circle cx="23.9" cy="33.8" r="0.8" fill="#FFF"/>
    <circle cx="35.5" cy="34.5" r="2.2" fill="#2C3E50"/><circle cx="34.9" cy="33.8" r="0.8" fill="#FFF"/>
    <path d="M27 39.5 Q30 42 33 39.5" fill="none" stroke="#C0392B" stroke-width="1.6" stroke-linecap="round"/>
  `;
  const shineArc = `<path d="M21 22 Q30 16 39 22" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2.2" stroke-linecap="round"/>`;

  if (style === 'spiky') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      ${faceBase}
      <path d="M14 31 C14 14, 46 14, 46 31 L43 10 L35 18 L30 6 L24 18 L17 10 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4" stroke-linejoin="round"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'sidepart') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      ${faceBase}
      <path d="M14 31 A16 16 0 0 1 46 28 Q39 21 33 25 Q22 29 14 31 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      <path d="M29 16 Q32 23 36 24" fill="none" stroke="#2C3E50" stroke-width="1.6"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'undercut') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      ${faceBase}
      <rect x="13" y="24" width="4" height="9" rx="2" fill="#2C3E50" opacity="0.35"/>
      <rect x="43" y="24" width="4" height="9" rx="2" fill="#2C3E50" opacity="0.35"/>
      <path d="M16 26 Q18 11 32 10 Q44 11 45 25 Q35 20 26 24 Q20 22 16 26 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'bob') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <path d="M11 34 Q10 15 30 15 Q50 15 49 34 Q49 47 41 47 L19 47 Q11 47 11 34 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      ${faceBase}
      <path d="M15 30 A15 15 0 0 1 45 30 Q39 27 34 30 Q30 27 26 30 Q21 27 15 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'curly') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <circle cx="15" cy="28" r="8" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      <circle cx="45" cy="28" r="8" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      <circle cx="20" cy="18" r="8.5" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      <circle cx="40" cy="18" r="8.5" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      <circle cx="30" cy="15" r="9" fill="${color}" stroke="#2C3E50" stroke-width="2.2"/>
      ${faceBase}
      <path d="M16 27 Q23 22 30 26 Q37 22 44 27 Q42 18 30 17 Q18 18 16 27 Z" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
    </svg>`;
  }
  if (style === 'long') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <rect x="10" y="18" width="40" height="36" rx="12" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      ${faceBase}
      <path d="M14.5 30 A15.5 15.5 0 0 1 45.5 30 Q38 25 30 29 Q22 25 14.5 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'wavy') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <path d="M12 24 Q8 32 12 40 Q8 48 14 54 L46 54 Q52 48 48 40 Q52 32 48 24 Q44 13 30 13 Q16 13 12 24 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      ${faceBase}
      <path d="M15 29 A15.5 15.5 0 0 1 45 29 Q35 23 30 28 Q23 24 15 29 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <circle cx="42" cy="24" r="3" fill="#FF6B6B" stroke="#2C3E50" stroke-width="1.2"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'pigtails') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <circle cx="10" cy="28" r="8.5" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      <circle cx="50" cy="28" r="8.5" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
      ${faceBase}
      <path d="M14.5 30 A15.5 15.5 0 0 1 45.5 30 Q37 25 30 28 Q23 25 14.5 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <circle cx="15" cy="25" r="3" fill="#FF6B6B" stroke="#2C3E50" stroke-width="1.3"/>
      <circle cx="45" cy="25" r="3" fill="#FF6B6B" stroke="#2C3E50" stroke-width="1.3"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'ponytail') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <path d="M32 10 Q48 8 50 28 Q47 36 42 33 Q42 20 32 16 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      ${faceBase}
      <path d="M14.5 30 A15.5 15.5 0 0 1 45.5 30 Q37 26 30 28 Q23 26 14.5 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <rect x="28" y="12" width="7" height="4.5" rx="2" fill="#FACC15" stroke="#2C3E50" stroke-width="1.4"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'bun') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <circle cx="17" cy="14" r="7.5" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <circle cx="43" cy="14" r="7.5" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <path d="M14 19 L22 17" stroke="#EC4899" stroke-width="3" stroke-linecap="round"/>
      <path d="M38 17 L46 19" stroke="#EC4899" stroke-width="3" stroke-linecap="round"/>
      ${faceBase}
      <path d="M14.5 30 A15.5 15.5 0 0 1 45.5 30 Q38 25 30 28 Q22 25 14.5 30 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      ${shineArc}
    </svg>`;
  }
  if (style === 'braids') {
    return `<svg width="50" height="50" viewBox="0 0 60 60">
      <circle cx="13" cy="36" r="4.5" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="12.5" cy="43" r="4.2" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="12" cy="50" r="3.5" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="47" cy="36" r="4.5" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="47.5" cy="43" r="4.2" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="48" cy="50" r="3.5" fill="${color}" stroke="#2C3E50" stroke-width="2"/>
      ${faceBase}
      <path d="M14.5 30 A15.5 15.5 0 0 1 45.5 30 L30 26 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.3"/>
      <circle cx="12.5" cy="46.5" r="2" fill="#38BDF8"/>
      <circle cx="47.5" cy="46.5" r="2" fill="#38BDF8"/>
      ${shineArc}
    </svg>`;
  }
  return `<svg width="50" height="50" viewBox="0 0 60 60">
    ${faceBase}
    <path d="M14 31 A16 16 0 0 1 46 31 Q39 26 30 29 Q21 26 14 31 Z" fill="${color}" stroke="#2C3E50" stroke-width="2.4"/>
    ${shineArc}
  </svg>`;
}

export function renderShirtIconSVG(opt: { color: string; pattern: string }): string {
  let detail = '';
  if (opt.pattern === 'collar') {
    detail = `<polygon points="24,14 30,22 36,14" fill="#FFFFFF" stroke="#2C3E50" stroke-width="1.5"/>`;
  } else if (opt.pattern === 'stripe') {
    detail = `<rect x="17" y="27" width="26" height="5" fill="rgba(255,255,255,0.75)"/>`;
  } else if (opt.pattern === 'star') {
    detail = `<text x="30" y="34" font-size="13" text-anchor="middle" fill="#FFE66D">★</text>`;
  } else if (opt.pattern === 'heart') {
    detail = `<text x="30" y="34" font-size="13" text-anchor="middle" fill="#FFCDD2">♥</text>`;
  } else if (opt.pattern === 'vest') {
    detail = `<polygon points="24,14 30,32 36,14" fill="#FFFFFF" stroke="#2C3E50" stroke-width="1.5"/><line x1="30" y1="32" x2="30" y2="46" stroke="#2C3E50" stroke-width="2"/>`;
  }
  return `<svg width="46" height="46" viewBox="0 0 60 60">
    <path d="M18 14 L8 22 L13 30 L17 26 L17 46 L43 46 L43 26 L47 30 L52 22 L42 14 L36 14 Q30 20 24 14 Z" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
    ${detail}
  </svg>`;
}

export function renderPantsIconSVG(opt: { color: string; style: string }): string {
  if (opt.style === 'skirt') {
    return `<svg width="46" height="46" viewBox="0 0 60 60">
      <polygon points="20,14 40,14 48,44 12,44" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="20" y="14" width="20" height="5" fill="rgba(255,255,255,0.3)" stroke="#2C3E50" stroke-width="2"/>
      <line x1="25" y1="20" x2="22" y2="44" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>
      <line x1="35" y1="20" x2="38" y2="44" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>
    </svg>`;
  }
  if (opt.style === 'shorts') {
    return `<svg width="46" height="46" viewBox="0 0 60 60">
      <path d="M18 14 L42 14 L45 34 L32 34 L30 25 L28 34 L15 34 Z" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="18" y="14" width="24" height="5" fill="rgba(255,255,255,0.25)" stroke="#2C3E50" stroke-width="2"/>
    </svg>`;
  }
  return `<svg width="46" height="46" viewBox="0 0 60 60">
    <path d="M18 14 L42 14 L44 48 L33 48 L30 27 L27 48 L16 48 Z" fill="${opt.color}" stroke="#2C3E50" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="18" y="14" width="24" height="5" fill="rgba(255,255,255,0.25)" stroke="#2C3E50" stroke-width="2"/>
  </svg>`;
}

export function renderFashionItemPreviewMini(item: {
  sub?: string;
  shirtColor?: string;
  shirtPattern?: string;
  pantsColor?: string;
  pantsStyle?: string;
  icon?: string;
}): string {
  if (item.sub === 'set' && item.shirtColor && item.shirtPattern && item.pantsColor && item.pantsStyle) {
    return `
      <div style="display:flex; align-items:center; gap:2px; background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:8px; padding:3px 5px; flex-shrink:0;">
        ${renderShirtIconSVG({ color: item.shirtColor, pattern: item.shirtPattern }).replace('width="46" height="46"', 'width="36" height="36"')}
        ${renderPantsIconSVG({ color: item.pantsColor, style: item.pantsStyle }).replace('width="46" height="46"', 'width="36" height="36"')}
      </div>
    `;
  }
  if (item.sub === 'shirt' && item.shirtColor && item.shirtPattern) {
    return `
      <div style="width:50px; height:50px; display:flex; align-items:center; justify-content:center; background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:8px; flex-shrink:0;">
        ${renderShirtIconSVG({ color: item.shirtColor, pattern: item.shirtPattern }).replace('width="46" height="46"', 'width="42" height="42"')}
      </div>
    `;
  }
  if (item.sub === 'pants' && item.pantsColor && item.pantsStyle) {
    return `
      <div style="width:50px; height:50px; display:flex; align-items:center; justify-content:center; background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:8px; flex-shrink:0;">
        ${renderPantsIconSVG({ color: item.pantsColor, style: item.pantsStyle }).replace('width="46" height="46"', 'width="42" height="42"')}
      </div>
    `;
  }
  return `
    <div style="width:48px; height:48px; display:flex; align-items:center; justify-content:center; font-size:30px; background:#F8F9F9; border:1.5px solid #D5D8DC; border-radius:8px; flex-shrink:0;">
      ${item.icon || '🎁'}
    </div>
  `;
}

export function renderItemIllustrationSVG(
  itemId: string,
  size: number,
  findCatalogItem: (id: string) => any
): string {
  if (itemId === 'd_pc') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <rect x="8" y="36" width="48" height="5" rx="2" fill="#A04000" stroke="#2C3E50" stroke-width="2"/>
      <rect x="11" y="41" width="5" height="17" fill="#7E5109" stroke="#2C3E50" stroke-width="2"/>
      <rect x="48" y="41" width="5" height="17" fill="#7E5109" stroke="#2C3E50" stroke-width="2"/>
      <rect x="20" y="13" width="24" height="17" rx="2" fill="#2C3E50" stroke="#1A252F" stroke-width="2"/>
      <rect x="22" y="15" width="20" height="12" fill="#5DADE2"/>
      <rect x="29" y="30" width="6" height="6" fill="#7F8C8D" stroke="#2C3E50" stroke-width="1.5"/>
      <rect x="46" y="21" width="8" height="15" rx="1" fill="#34495E" stroke="#2C3E50" stroke-width="1.5"/>
      <circle cx="50" cy="25" r="1.2" fill="#2ECC71"/>
      <rect x="22" y="33" width="16" height="3" rx="1" fill="#ECF0F1" stroke="#2C3E50" stroke-width="1"/>
      <rect x="25" y="44" width="14" height="12" rx="3" fill="#E74C3C" stroke="#2C3E50" stroke-width="1.8"/>
    </svg>`;
  }
  if (itemId === 'd_plant') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <polygon points="22,38 42,38 39,56 25,56" fill="#E67E22" stroke="#2C3E50" stroke-width="2.2"/>
      <ellipse cx="32" cy="24" rx="10" ry="14" fill="#27AE60" stroke="#2C3E50" stroke-width="2"/>
      <ellipse cx="21" cy="28" rx="9" ry="7" transform="rotate(-25 21 28)" fill="#2ECC71" stroke="#2C3E50" stroke-width="2"/>
      <ellipse cx="43" cy="28" rx="9" ry="7" transform="rotate(25 43 28)" fill="#2ECC71" stroke="#2C3E50" stroke-width="2"/>
    </svg>`;
  }
  if (itemId === 'd_bookshelf') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <rect x="14" y="10" width="36" height="46" rx="3" fill="#A04000" stroke="#2C3E50" stroke-width="2.2"/>
      <rect x="18" y="14" width="28" height="12" fill="#FAD7A0"/>
      <rect x="18" y="29" width="28" height="12" fill="#FAD7A0"/>
      <rect x="18" y="44" width="28" height="9" fill="#FAD7A0"/>
      <rect x="20" y="16" width="5" height="10" fill="#E74C3C"/>
      <rect x="26" y="17" width="5" height="9" fill="#3498DB"/>
      <rect x="32" y="15" width="5" height="11" fill="#F1C40F"/>
      <rect x="21" y="31" width="6" height="10" fill="#9B59B6"/>
      <rect x="28" y="32" width="5" height="9" fill="#2ECC71"/>
    </svg>`;
  }
  if (itemId === 'd_bear') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <circle cx="21" cy="16" r="6" fill="#A0522D" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="43" cy="16" r="6" fill="#A0522D" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="32" cy="24" r="12" fill="#CD853F" stroke="#2C3E50" stroke-width="2.2"/>
      <ellipse cx="32" cy="43" rx="14" ry="13" fill="#CD853F" stroke="#2C3E50" stroke-width="2.2"/>
      <ellipse cx="32" cy="43" rx="8" ry="8" fill="#F5DEB3"/>
      <circle cx="28" cy="22" r="1.8" fill="#2C3E50"/><circle cx="36" cy="22" r="1.8" fill="#2C3E50"/>
      <ellipse cx="32" cy="26" rx="4" ry="3" fill="#F5DEB3"/>
      <circle cx="32" cy="25" r="1.8" fill="#2C3E50"/>
    </svg>`;
  }
  if (itemId === 'd_guitar') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <rect x="30" y="8" width="4" height="24" fill="#5D4037" stroke="#2C3E50" stroke-width="1.8"/>
      <circle cx="32" cy="34" r="9" fill="#E67E22" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="32" cy="46" r="12" fill="#E67E22" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="32" cy="42" r="4" fill="#3E2723"/>
    </svg>`;
  }
  if (itemId === 'd_aquarium') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64">
      <rect x="12" y="18" width="40" height="32" rx="4" fill="#AED6F1" stroke="#2C3E50" stroke-width="2.4"/>
      <rect x="12" y="15" width="40" height="5" fill="#2C3E50"/>
      <path d="M18 48 Q20 36 18 30" stroke="#27AE60" stroke-width="3" fill="none"/>
      <path d="M44 48 Q42 35 45 28" stroke="#27AE60" stroke-width="3" fill="none"/>
      <ellipse cx="31" cy="34" rx="7" ry="4" fill="#F39C12" stroke="#2C3E50" stroke-width="1.5"/>
      <polygon points="38,34 43,30 43,38" fill="#F39C12" stroke="#2C3E50" stroke-width="1.5"/>
    </svg>`;
  }
  const item = findCatalogItem(itemId);
  if (item && item.svgMarkup) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" style="overflow:visible;">${item.svgMarkup}</svg>`;
  }
  return `<div style="font-size:${Math.round(size * 0.65)}px; line-height:${size}px; text-align:center;">${item ? item.icon : '📦'}</div>`;
}
