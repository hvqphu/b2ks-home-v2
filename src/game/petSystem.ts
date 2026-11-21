import {
  Member,
  OwnedPet,
  PetAccessoryDef,
  PetGender,
  PetSpeciesDef,
  PetStage,
  PetVariantDef,
  PetVariantId
} from '../types/b2ks';
import {
  PET_ACCESSORY_CATALOG,
  PET_FOOD_CATALOG,
  PET_SPECIES,
  PET_VARIANT_DEFS
} from './constants';

export function getPetSpecies(speciesId: string): PetSpeciesDef {
  return PET_SPECIES.find((s) => s.id === speciesId) || PET_SPECIES[0];
}

export function getPetVariantDef(variant?: PetVariantId | null): PetVariantDef {
  return PET_VARIANT_DEFS.find((v) => v.id === variant) || PET_VARIANT_DEFS[0];
}

export function getPetAccessoryDef(accId?: string | null): PetAccessoryDef | null {
  if (!accId) return null;
  return PET_ACCESSORY_CATALOG.find((a) => a.id === accId) || null;
}

export function rollPetHatchTraits(): { gender: PetGender; variant: PetVariantId } {
  const gender: PetGender = Math.random() < 0.5 ? 'male' : 'female';
  const roll = Math.random() * 100;
  let acc = 0;
  let variant: PetVariantId = 'classic';
  for (const def of PET_VARIANT_DEFS) {
    acc += def.chancePercent;
    if (roll <= acc) {
      variant = def.id;
      break;
    }
  }
  return { gender, variant };
}

export function getPetResolvedColors(
  sp: PetSpeciesDef,
  variant?: PetVariantId | null
): { primary: string; accent: string; auraColor: string; isRare: boolean } {
  switch (variant) {
    case 'pastel':
      return { primary: sp.id === 'pet_panda' ? '#334155' : sp.primaryColor, accent: '#FBCFE8', auraColor: '#EC4899', isRare: true };
    case 'royal':
      return { primary: sp.id === 'pet_panda' ? '#312E81' : sp.primaryColor, accent: '#DDD6FE', auraColor: '#7C3AED', isRare: true };
    case 'cosmic':
      return { primary: sp.id === 'pet_panda' ? '#0F172A' : sp.primaryColor, accent: '#A5F3FC', auraColor: '#0EA5E9', isRare: true };
    case 'golden':
      return { primary: '#F59E0B', accent: '#FEF08A', auraColor: '#FACC15', isRare: true };
    default:
      return { primary: sp.primaryColor, accent: sp.accentColor, auraColor: sp.primaryColor, isRare: false };
  }
}

export function getPetLevelFromXp(xp: number): number {
  return Math.max(1, 1 + Math.floor(Math.max(0, xp) / 55));
}

export function computePetStageFromXp(species: PetSpeciesDef, xp: number, hatched: boolean): PetStage {
  if (!hatched) return 0;
  let stage: PetStage = 1;
  for (const st of species.stages) {
    if (st.stage >= 1 && xp >= st.minXp) {
      stage = st.stage;
    }
  }
  return stage;
}

export function getNextStageRequirement(species: PetSpeciesDef, currentStage: PetStage): { nextStageTitle: string; minXp: number } | null {
  const next = species.stages.find((s) => s.stage === currentStage + 1);
  if (!next) return null;
  return { nextStageTitle: next.title, minXp: next.minXp };
}

export function getActivePet(member: Member | null | undefined): OwnedPet | null {
  if (!member || !Array.isArray(member.pets) || member.pets.length === 0) return null;
  if (member.activePetId === 'none') return null;
  if (member.activePetId) {
    const found = member.pets.find((p) => p.id === member.activePetId);
    if (found) return found;
  }
  return member.pets.find((p) => p.hatched) || member.pets[0] || null;
}

export function getMemberPetBonuses(member: Member | null | undefined): {
  pet: OwnedPet | null;
  species: PetSpeciesDef | null;
  stageTitle: string;
  speedBonus: number;
  starBonus: number;
  isHungry: boolean;
} {
  const pet = getActivePet(member);
  if (!pet) {
    return { pet: null, species: null, stageTitle: '', speedBonus: 0, starBonus: 0, isHungry: false };
  }
  const species = getPetSpecies(pet.speciesId);
  const stageDef = species.stages.find((s) => s.stage === pet.stage) || species.stages[0];
  if (!pet.hatched) {
    return {
      pet,
      species,
      stageTitle: `${stageDef.title} (${Math.round(pet.hatchProgress)}%)`,
      speedBonus: 0,
      starBonus: 0,
      isHungry: false
    };
  }
  const isHungry = Math.round(pet.hunger ?? 100) <= 0;
  return {
    pet,
    species,
    stageTitle: isHungry ? `${stageDef.title} (❗ Đói)` : stageDef.title,
    speedBonus: isHungry ? 0 : stageDef.speedBonus,
    starBonus: isHungry ? 0 : stageDef.starBonus,
    isHungry
  };
}

export function getPetStageBadgeLabel(stage: PetStage): string {
  if (stage === 0) return '🥚 Trứng';
  if (stage === 1) return '🐣 Thú Non';
  if (stage === 2) return '✨ Trưởng Thành';
  if (stage === 3) return '🔥 Siêu Thú';
  return '👑 Thần Thoại';
}

export function getPetFoodDef(foodId: string) {
  return PET_FOOD_CATALOG.find((f) => f.id === foodId) || PET_FOOD_CATALOG[0];
}

function renderAccessorySVG(accId: string | null, cx: number, neckY: number, eyeY: number, topY: number): string {
  if (!accId) return '';
  if (accId === 'pacc_bow') {
    return `<g transform="translate(${cx},${topY + 2})"><polygon points="0,0 -8,-5 -7,4" fill="#EC4899" stroke="#2C3E50" stroke-width="1.5"/><polygon points="0,0 8,-5 7,4" fill="#EC4899" stroke="#2C3E50" stroke-width="1.5"/><circle cx="0" cy="0" r="2.6" fill="#FDE047" stroke="#2C3E50" stroke-width="1.3"/></g>`;
  }
  if (accId === 'pacc_bell') {
    return `<path d="M${cx - 12} ${neckY} Q${cx} ${neckY + 5} ${cx + 12} ${neckY}" fill="none" stroke="#EF4444" stroke-width="3.6" stroke-linecap="round"/><circle cx="${cx}" cy="${neckY + 5}" r="4.2" fill="#FACC15" stroke="#2C3E50" stroke-width="1.6"/>`;
  }
  if (accId === 'pacc_glasses') {
    return `<rect x="${cx - 14}" y="${eyeY - 4}" width="11.5" height="7.5" rx="2.5" fill="#0F172A" stroke="#FACC15" stroke-width="1.5"/><rect x="${cx + 2.5}" y="${eyeY - 4}" width="11.5" height="7.5" rx="2.5" fill="#0F172A" stroke="#FACC15" stroke-width="1.5"/><line x1="${cx - 2.5}" y1="${eyeY - 1}" x2="${cx + 2.5}" y2="${eyeY - 1}" stroke="#FACC15" stroke-width="1.8"/>`;
  }
  if (accId === 'pacc_scarf') {
    return `<path d="M${cx - 14} ${neckY} Q${cx} ${neckY + 6} ${cx + 14} ${neckY} L${cx + 12} ${neckY + 6} Q${cx} ${neckY + 11} ${cx - 12} ${neckY + 6} Z" fill="#EF4444" stroke="#2C3E50" stroke-width="1.5"/><path d="M${cx + 3} ${neckY + 4} L${cx + 10} ${neckY + 16} L${cx + 2} ${neckY + 17} Z" fill="#DC2626" stroke="#2C3E50" stroke-width="1.4"/>`;
  }
  if (accId === 'pacc_wizard') {
    return `<g transform="translate(${cx},${topY + 3})"><ellipse cx="0" cy="0" rx="15" ry="3.8" fill="#4F46E5" stroke="#2C3E50" stroke-width="1.6"/><polygon points="-10,0 0,-16 10,0" fill="#6366F1" stroke="#2C3E50" stroke-width="1.6"/><text x="0" y="-4" font-size="7" text-anchor="middle" fill="#FACC15">★</text></g>`;
  }
  if (accId === 'pacc_crown') {
    return `<polygon points="${cx - 9},${topY + 4} ${cx - 6},${topY - 6} ${cx},${topY} ${cx + 6},${topY - 6} ${cx + 9},${topY + 4}" fill="#FACC15" stroke="#2C3E50" stroke-width="1.8"/>`;
  }
  return '';
}

/**
 * Distinct, unmistakable SVG artwork per species (10 species) + Evolution Stage (0..4) + Variant + Gender + Accessory
 */
export function renderPetArtSVG(
  speciesId: string,
  stage: PetStage,
  size = 64,
  opts?: { variant?: PetVariantId | null; gender?: PetGender | null; accessoryId?: string | null }
): string {
  const sp = getPetSpecies(speciesId);
  const resolved = getPetResolvedColors(sp, opts?.variant);
  const c1 = resolved.primary;
  const c2 = resolved.accent;
  const auraColor = resolved.auraColor;

  if (stage === 0) {
    const gradId = `eggG_${speciesId}_${opts?.variant || 'classic'}`;
    let eggPattern = `<path d="M23 38 Q32 32 40 39 T57 38" fill="none" stroke="${c1}" stroke-width="3.5" stroke-linecap="round"/>`;
    if (speciesId === 'pet_dragon') {
      eggPattern = `<path d="M24 34 L32 28 L40 35 L48 28 L56 34 M26 48 L35 42 L45 49 L54 43" fill="none" stroke="#B91C1C" stroke-width="3" stroke-linejoin="round"/>`;
    } else if (speciesId === 'pet_phoenix') {
      eggPattern = `<path d="M40 16 Q50 28 40 42 Q30 52 40 64" fill="none" stroke="#F59E0B" stroke-width="4" stroke-linecap="round"/><path d="M24 38 Q40 24 56 38" fill="none" stroke="#DC2626" stroke-width="3"/>`;
    } else if (speciesId === 'pet_unicorn') {
      eggPattern = `<path d="M22 33 Q40 26 58 33" fill="none" stroke="#EC4899" stroke-width="3.5"/><path d="M21 43 Q40 36 59 43" fill="none" stroke="#38BDF8" stroke-width="3.5"/><path d="M23 53 Q40 46 57 53" fill="none" stroke="#FACC15" stroke-width="3.5"/>`;
    } else if (speciesId === 'pet_panda') {
      eggPattern = `<circle cx="32" cy="34" r="5.5" fill="#0F172A"/><circle cx="49" cy="46" r="6" fill="#0F172A"/><path d="M22 52 Q40 47 58 52" fill="none" stroke="#16A34A" stroke-width="3.5"/>`;
    } else if (speciesId === 'pet_owl' || speciesId === 'pet_penguin') {
      eggPattern = `<polygon points="40,24 44,32 40,40 36,32" fill="#38BDF8" stroke="#0369A1" stroke-width="1.5"/><circle cx="30" cy="48" r="3.5" fill="#0284C7" opacity="0.65"/><circle cx="50" cy="48" r="3.5" fill="#0284C7" opacity="0.65"/>`;
    } else if (speciesId === 'pet_fox') {
      eggPattern = `<path d="M22 44 Q33 26 42 40 Q51 24 58 42" fill="none" stroke="#EA580C" stroke-width="3.5" stroke-linecap="round"/>`;
    }
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="${gradId}" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#FFFFFF"/>
            <stop offset="55%" stop-color="${c2}"/>
            <stop offset="100%" stop-color="${c1}"/>
          </radialGradient>
        </defs>
        <ellipse cx="40" cy="68" rx="18" ry="5" fill="rgba(0,0,0,0.16)"/>
        <path d="M40 12 C56 12, 62 34, 60 50 C58 64, 50 68, 40 68 C30 68, 22 64, 20 50 C18 34, 24 12, 40 12 Z"
          fill="url(#${gradId})" stroke="#2C3E50" stroke-width="3"/>
        ${eggPattern}
        <circle cx="33" cy="24" r="4" fill="#FFF" opacity="0.78"/>
      </svg>
    `;
  }

  const accId = opts?.accessoryId || null;
  const stageScale = stage === 1 ? 0.88 : stage === 2 ? 0.96 : stage === 3 ? 1.03 : 1.08;
  const hasAura = stage >= 2 || resolved.isRare;
  const auraRing = hasAura
    ? `<circle cx="40" cy="42" r="${stage >= 4 ? 36 : 33}" fill="none" stroke="${auraColor}" stroke-width="${stage >= 3 ? 2.6 : 1.8}" stroke-dasharray="${stage >= 4 ? '6 3' : '4 4'}" opacity="0.8"/>`
    : '';
  const stageStars =
    stage >= 3
      ? `<text x="11" y="21" font-size="9" fill="#FACC15">✦</text><text x="64" y="21" font-size="9" fill="#FACC15">✦</text>`
      : '';
  const crownSvg =
    stage >= 4 && accId !== 'pacc_crown'
      ? `<polygon points="31,15 34,6 40,11 46,6 49,15" fill="#FACC15" stroke="#2C3E50" stroke-width="1.8"/>`
      : '';
  const lashSvg = (lx: number, rx: number, y: number) =>
    opts?.gender === 'female'
      ? `<line x1="${lx - 3}" y1="${y - 2}" x2="${lx}" y2="${y}" stroke="#2C3E50" stroke-width="1.5" stroke-linecap="round"/><line x1="${rx + 3}" y1="${y - 2}" x2="${rx}" y2="${y}" stroke="#2C3E50" stroke-width="1.5" stroke-linecap="round"/>`
      : '';

  let art = '';

  if (speciesId === 'pet_corgi') {
    // Long horizontal loaf-dog body + 4 stubby legs + white chest blaze + perked wide ears
    const collar = stage >= 2 ? `<path d="M35 38 L52 46" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/><circle cx="46" cy="45" r="3" fill="#FACC15" stroke="#2C3E50" stroke-width="1.2"/>` : '';
    const wings = stage >= 3 ? `<path d="M22 44 Q8 31 12 22 Q24 28 32 40 Z" fill="${c2}" stroke="#2C3E50" stroke-width="2"/><path d="M48 42 Q66 28 64 20 Q52 26 42 38 Z" fill="${c2}" stroke="#2C3E50" stroke-width="2"/>` : '';
    art = `
      ${wings}
      <!-- Fluffy Corgi Pom Tail -->
      <circle cx="15" cy="49" r="5.5" fill="#FFF" stroke="#2C3E50" stroke-width="2.2"/>
      <!-- Stubby Back & Front Legs -->
      <rect x="20" y="57" width="6.5" height="10" rx="3" fill="#FFF" stroke="#2C3E50" stroke-width="2.2"/>
      <rect x="30" y="58" width="6.5" height="9.5" rx="3" fill="${c1}" stroke="#2C3E50" stroke-width="2.2"/>
      <rect x="43" y="58" width="6.5" height="9.5" rx="3" fill="#FFF" stroke="#2C3E50" stroke-width="2.2"/>
      <rect x="52" y="57" width="6.5" height="10" rx="3" fill="${c1}" stroke="#2C3E50" stroke-width="2.2"/>
      <!-- Long Loaf Body -->
      <ellipse cx="37" cy="50" rx="21" ry="12.5" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <ellipse cx="47" cy="52" rx="9" ry="9" fill="#FFFFFF"/>
      ${collar}
      <!-- Wide Perked Ears -->
      <polygon points="35,28 28,11 43,21" fill="${c1}" stroke="#2C3E50" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="59,28 66,11 51,21" fill="${c1}" stroke="#2C3E50" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="35,24 31,14 40,21" fill="#FBCFE8"/>
      <polygon points="59,24 63,14 54,21" fill="#FBCFE8"/>
      <!-- Head -->
      <circle cx="47" cy="31" r="14.5" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <!-- White Blaze & Snout -->
      <ellipse cx="47" cy="25" rx="2.8" ry="6" fill="#FFF"/>
      <ellipse cx="48" cy="36" rx="9" ry="6" fill="#FFF" stroke="#2C3E50" stroke-width="1.6"/>
      <ellipse cx="49" cy="33.5" rx="3" ry="2.1" fill="#1E293B"/>
      <path d="M47 38 Q49 42 52 38" fill="#FB7185" stroke="#2C3E50" stroke-width="1.2"/>
      <circle cx="41" cy="29" r="2.6" fill="#1E293B"/><circle cx="53.5" cy="29" r="2.6" fill="#1E293B"/>
      <circle cx="41.8" cy="28" r="0.9" fill="#FFF"/><circle cx="54.3" cy="28" r="0.9" fill="#FFF"/>
      ${lashSvg(41, 53.5, 29)}
      ${renderAccessorySVG(accId, 47, 42, 29, 14)}
    `;
  } else if (speciesId === 'pet_kitty') {
    // Slender sitting cat with curved S-tail, forehead stripes, whiskers & butterfly fairy wings on Stage 3+
    const wings = stage >= 3 ? `<ellipse cx="17" cy="42" rx="11" ry="6.5" transform="rotate(-25 17 42)" fill="#F9A8D4" stroke="#2C3E50" stroke-width="2"/><ellipse cx="63" cy="42" rx="11" ry="6.5" transform="rotate(25 63 42)" fill="#F9A8D4" stroke="#2C3E50" stroke-width="2"/>` : '';
    art = `
      ${wings}
      <path d="M51 58 Q69 52 66 34 Q63 26 57 31" fill="none" stroke="${c1}" stroke-width="5" stroke-linecap="round"/>
      <!-- Sleek Cat Body -->
      <path d="M27 63 C25 46, 30 39, 40 39 C50 39, 55 46, 53 63 Z" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <ellipse cx="40" cy="54" rx="7.5" ry="9" fill="#FFF"/>
      <!-- Dainty Front Paws -->
      <ellipse cx="33" cy="63" rx="4.5" ry="3.2" fill="#FFF" stroke="#2C3E50" stroke-width="2"/>
      <ellipse cx="47" cy="63" rx="4.5" ry="3.2" fill="#FFF" stroke="#2C3E50" stroke-width="2"/>
      <!-- Cat Ears -->
      <polygon points="24,26 21,9 35,19" fill="${c1}" stroke="#2C3E50" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="56,26 59,9 45,19" fill="${c1}" stroke="#2C3E50" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="25,22 23,13 32,19" fill="#FBCFE8"/><polygon points="55,22 57,13 48,19" fill="#FBCFE8"/>
      <!-- Cat Head -->
      <ellipse cx="40" cy="30" rx="16.5" ry="14" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <!-- Forehead Jewel/Stripes -->
      ${stage >= 2 ? `<polygon points="40,18 37,22 40,25 43,22" fill="#FDE047" stroke="#2C3E50" stroke-width="1.2"/>` : `<path d="M36 18 L36 22 M40 17 L40 23 M44 18 L44 22" stroke="#9D174D" stroke-width="2" stroke-linecap="round"/>`}
      <circle cx="33" cy="30" r="3" fill="#1E293B"/><circle cx="47" cy="30" r="3" fill="#1E293B"/>
      <circle cx="33.8" cy="29" r="1" fill="#FFF"/><circle cx="47.8" cy="29" r="1" fill="#FFF"/>
      <polygon points="40,35 37.5,32.5 42.5,32.5" fill="#F43F5E"/>
      <line x1="18" y1="31" x2="28" y2="33" stroke="#2C3E50" stroke-width="1.5"/><line x1="18" y1="35" x2="28" y2="35" stroke="#2C3E50" stroke-width="1.5"/>
      <line x1="62" y1="31" x2="52" y2="33" stroke="#2C3E50" stroke-width="1.5"/><line x1="62" y1="35" x2="52" y2="35" stroke="#2C3E50" stroke-width="1.5"/>
      ${stage >= 2 && accId !== 'pacc_bell' && accId !== 'pacc_scarf' ? `<path d="M29 41 Q40 45 51 41" fill="none" stroke="#FACC15" stroke-width="3.5" stroke-linecap="round"/><circle cx="40" cy="44" r="3.2" fill="#FACC15" stroke="#2C3E50" stroke-width="1.4"/>` : ''}
      ${lashSvg(33, 47, 30)}
      ${renderAccessorySVG(accId, 40, 41, 30, 14)}
    `;
  } else if (speciesId === 'pet_owl') {
    // Iconic rounded feathery Owl torso + giant spectacle eye rings + spread feathered wings + orange talons
    const wingSpan = stage >= 3 ? 15 : 10;
    art = `
      <!-- Spread Feathered Wings -->
      <ellipse cx="${22 - (wingSpan - 10) * 0.6}" cy="44" rx="${wingSpan}" ry="7" transform="rotate(-30 22 44)" fill="${c1}" stroke="#2C3E50" stroke-width="2.4"/>
      <ellipse cx="${58 + (wingSpan - 10) * 0.6}" cy="44" rx="${wingSpan}" ry="7" transform="rotate(30 58 44)" fill="${c1}" stroke="#2C3E50" stroke-width="2.4"/>
      <!-- Orange Talons -->
      <path d="M31 62 L27 67 M31 62 L31 67 M31 62 L35 67" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
      <path d="M49 62 L45 67 M49 62 L49 67 M49 62 L53 67" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
      <!-- Feathered Tuft Ears -->
      <polygon points="24,25 16,12 31,20" fill="${c1}" stroke="#2C3E50" stroke-width="2.2"/>
      <polygon points="56,25 64,12 49,20" fill="${c1}" stroke="#2C3E50" stroke-width="2.2"/>
      <!-- One-piece Snowy Owl Body -->
      <ellipse cx="40" cy="41" rx="19" ry="22" fill="${c1}" stroke="#2C3E50" stroke-width="2.6"/>
      <!-- Cream Speckled Belly -->
      <ellipse cx="40" cy="50" rx="12" ry="12" fill="#FFF"/>
      <path d="M34 46 Q37 49 40 46 Q43 49 46 46 M35 53 Q40 56 45 53" fill="none" stroke="${c1}" stroke-width="1.8" stroke-linecap="round"/>
      <!-- Huge Owl Face Discs -->
      <circle cx="32.5" cy="30" r="8.5" fill="#FFF" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="47.5" cy="30" r="8.5" fill="#FFF" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="33" cy="30" r="3.6" fill="#0F172A"/><circle cx="47" cy="30" r="3.6" fill="#0F172A"/>
      <circle cx="34" cy="29" r="1.3" fill="#FFF"/><circle cx="48" cy="29" r="1.3" fill="#FFF"/>
      ${stage >= 2 && accId !== 'pacc_glasses' ? `<circle cx="32.5" cy="30" r="9.5" fill="none" stroke="#F59E0B" stroke-width="1.8"/><circle cx="47.5" cy="30" r="9.5" fill="none" stroke="#F59E0B" stroke-width="1.8"/>` : ''}
      <polygon points="40,39 36,33 44,33" fill="#F59E0B" stroke="#2C3E50" stroke-width="1.8"/>
      ${lashSvg(32.5, 47.5, 30)}
      ${renderAccessorySVG(accId, 40, 41, 30, 15)}
    `;
  } else if (speciesId === 'pet_unicorn') {
    // Equine silhouette + rainbow flowing mane/tail + golden spiraled horn + feathered hooves + Pegasus wings on Stage 3+
    const wings = stage >= 3 ? `<path d="M27 42 Q7 25 14 16 Q26 24 35 37 Z" fill="#FFF" stroke="#8B5CF6" stroke-width="2.2"/><path d="M51 42 Q71 25 64 16 Q52 24 43 37 Z" fill="#FFF" stroke="#8B5CF6" stroke-width="2.2"/>` : '';
    art = `
      ${wings}
      <!-- Rainbow Flowing Tail -->
      <path d="M22 50 Q8 46 10 60" fill="none" stroke="#EC4899" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M22 53 Q10 54 14 64" fill="none" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round"/>
      <!-- Hooved Legs -->
      <rect x="24" y="55" width="5.5" height="12" rx="2.5" fill="${c2}" stroke="#2C3E50" stroke-width="2"/>
      <rect x="33" y="56" width="5.5" height="11" rx="2.5" fill="${c2}" stroke="#2C3E50" stroke-width="2"/>
      <rect x="44" y="56" width="5.5" height="11" rx="2.5" fill="${c2}" stroke="#2C3E50" stroke-width="2"/>
      <rect x="24" y="64" width="5.5" height="3.5" fill="#FACC15"/><rect x="33" y="64" width="5.5" height="3.5" fill="#FACC15"/><rect x="44" y="64" width="5.5" height="3.5" fill="#FACC15"/>
      <!-- Equine Body & Neck -->
      <ellipse cx="36" cy="51" rx="16" ry="11" fill="${c2}" stroke="${c1}" stroke-width="2.4"/>
      <path d="M36 46 Q42 32 45 27 L52 33 Q47 46 42 52 Z" fill="${c2}" stroke="${c1}" stroke-width="2.2"/>
      <!-- Rainbow Mane -->
      <path d="M40 23 Q31 28 33 41" fill="none" stroke="#EC4899" stroke-width="5" stroke-linecap="round"/>
      <path d="M38 27 Q30 33 32 44" fill="none" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round"/>
      <!-- Spiral Golden Horn -->
      <polygon points="48,4 43,19 52,19" fill="#FACC15" stroke="#2C3E50" stroke-width="2"/>
      <line x1="45" y1="14" x2="50" y2="12" stroke="#D97706" stroke-width="1.5"/>
      <!-- Equine Head & Snout -->
      <ellipse cx="48" cy="26" rx="12" ry="10.5" fill="${c2}" stroke="${c1}" stroke-width="2.4"/>
      <ellipse cx="56" cy="29" rx="7.5" ry="5.5" fill="#FDE68A" stroke="#2C3E50" stroke-width="1.8"/>
      <circle cx="59" cy="28" r="1.4" fill="#78350F"/>
      <circle cx="46" cy="24" r="2.7" fill="#1E293B"/><circle cx="46.8" cy="23" r="1" fill="#FFF"/>
      ${renderAccessorySVG(accId, 48, 37, 24, 14)}
    `;
  } else if (speciesId === 'pet_bunny') {
    // Plump puff bunny + huge signature tall/floppy ears + big round puff tail + pink tummy
    const wings = stage >= 3 ? `<ellipse cx="18" cy="46" rx="9" ry="5" transform="rotate(-20 18 46)" fill="#FFF" stroke="#EC4899" stroke-width="2"/><ellipse cx="62" cy="46" rx="9" ry="5" transform="rotate(20 62 46)" fill="#FFF" stroke="#EC4899" stroke-width="2"/>` : '';
    art = `
      ${wings}
      <circle cx="57" cy="57" r="7" fill="#FFF" stroke="#2C3E50" stroke-width="2.2"/>
      <!-- Long Signature Ears -->
      <ellipse cx="30" cy="15" rx="5.8" ry="14" transform="rotate(-14 30 15)" fill="${c1}" stroke="#2C3E50" stroke-width="2.4"/>
      <ellipse cx="50" cy="15" rx="5.8" ry="14" transform="rotate(14 50 15)" fill="${c1}" stroke="#2C3E50" stroke-width="2.4"/>
      <ellipse cx="30" cy="16" rx="2.8" ry="9" transform="rotate(-14 30 16)" fill="#FBCFE8"/>
      <ellipse cx="50" cy="16" rx="2.8" ry="9" transform="rotate(14 50 16)" fill="#FBCFE8"/>
      <!-- Plump Body -->
      <ellipse cx="40" cy="54" rx="16" ry="13.5" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <ellipse cx="40" cy="56" rx="10" ry="9" fill="#FFF"/>
      <!-- Bunny Feet -->
      <ellipse cx="30" cy="65" rx="6.5" ry="3.5" fill="#FFF" stroke="#2C3E50" stroke-width="2"/>
      <ellipse cx="50" cy="65" rx="6.5" ry="3.5" fill="#FFF" stroke="#2C3E50" stroke-width="2"/>
      <!-- Chubby Head -->
      <ellipse cx="40" cy="36" rx="16" ry="13.5" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <ellipse cx="29" cy="39" rx="3.5" ry="2.2" fill="#FDA4AF" opacity="0.8"/>
      <ellipse cx="51" cy="39" rx="3.5" ry="2.2" fill="#FDA4AF" opacity="0.8"/>
      <circle cx="33.5" cy="34" r="2.9" fill="#1E293B"/><circle cx="46.5" cy="34" r="2.9" fill="#1E293B"/>
      <circle cx="34.3" cy="33" r="1" fill="#FFF"/><circle cx="47.3" cy="33" r="1" fill="#FFF"/>
      <polygon points="40,39 37.5,36.5 42.5,36.5" fill="#F43F5E"/>
      <rect x="38.2" y="40.5" width="3.6" height="3" rx="0.8" fill="#FFF" stroke="#2C3E50" stroke-width="1"/>
      ${stage >= 2 && accId !== 'pacc_bow' ? `<polygon points="40,24 33,19 34,27" fill="#FACC15" stroke="#2C3E50" stroke-width="1.3"/><polygon points="40,24 47,19 46,27" fill="#FACC15" stroke="#2C3E50" stroke-width="1.3"/>` : ''}
      ${lashSvg(33.5, 46.5, 34)}
      ${renderAccessorySVG(accId, 40, 46, 34, 20)}
    `;
  } else if (speciesId === 'pet_penguin') {
    // Tuxedo Penguin: dark navy/blue back, snow white heart belly, flippers, orange feet & beak
    const cape = stage >= 3 ? `<path d="M24 38 L14 62 L66 62 L56 38 Z" fill="#1D4ED8" stroke="#2C3E50" stroke-width="2" opacity="0.85"/>` : '';
    art = `
      ${cape}
      <!-- Orange Webbed Feet -->
      <ellipse cx="31" cy="64" rx="7.5" ry="3.8" fill="#F59E0B" stroke="#2C3E50" stroke-width="2"/>
      <ellipse cx="49" cy="64" rx="7.5" ry="3.8" fill="#F59E0B" stroke="#2C3E50" stroke-width="2"/>
      <!-- Flipper Arms -->
      <ellipse cx="19" cy="48" rx="5.5" ry="12" transform="rotate(24 19 48)" fill="${c1}" stroke="#2C3E50" stroke-width="2.4"/>
      <ellipse cx="61" cy="48" rx="5.5" ry="12" transform="rotate(-24 61 48)" fill="${c1}" stroke="#2C3E50" stroke-width="2.4"/>
      <!-- Upright Penguin Egg Silhouette -->
      <ellipse cx="40" cy="42" rx="18" ry="23" fill="${c1}" stroke="#2C3E50" stroke-width="2.6"/>
      <!-- Tuxedo White Face & Belly -->
      <ellipse cx="40" cy="49" rx="12.5" ry="14" fill="#FFFFFF"/>
      <circle cx="34" cy="29" r="6.5" fill="#FFFFFF"/>
      <circle cx="46" cy="29" r="6.5" fill="#FFFFFF"/>
      <circle cx="34" cy="29" r="2.8" fill="#0F172A"/><circle cx="46" cy="29" r="2.8" fill="#0F172A"/>
      <circle cx="34.8" cy="28" r="1" fill="#FFF"/><circle cx="46.8" cy="28" r="1" fill="#FFF"/>
      <polygon points="40,38 35,32 45,32" fill="#F59E0B" stroke="#2C3E50" stroke-width="1.6"/>
      ${stage >= 2 && accId !== 'pacc_scarf' ? `<path d="M26 39 Q40 44 54 39 L52 44 Q40 48 28 44 Z" fill="#EF4444" stroke="#2C3E50" stroke-width="1.4"/>` : ''}
      ${lashSvg(34, 46, 29)}
      ${renderAccessorySVG(accId, 40, 40, 29, 16)}
    `;
  } else if (speciesId === 'pet_panda') {
    // Classic Black & White Panda + black arm/shoulder saddle + eye patches + green bamboo sprig
    const auraFlame = stage >= 3 ? `<circle cx="40" cy="41" r="28" fill="none" stroke="#22C55E" stroke-width="2.5" opacity="0.7"/>` : '';
    art = `
      ${auraFlame}
      <!-- Round Black Ears -->
      <circle cx="24" cy="18" r="6.8" fill="#0F172A" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="56" cy="18" r="6.8" fill="#0F172A" stroke="#2C3E50" stroke-width="2"/>
      <!-- Chubby White Body + Black Shoulder Band -->
      <ellipse cx="40" cy="53" rx="17" ry="14" fill="#FFFFFF" stroke="#2C3E50" stroke-width="2.6"/>
      <path d="M24 46 Q40 52 56 46 L55 54 Q40 58 25 54 Z" fill="#0F172A"/>
      <!-- Black Panda Paws -->
      <ellipse cx="22" cy="49" rx="5.5" ry="7" transform="rotate(20 22 49)" fill="#0F172A" stroke="#2C3E50" stroke-width="2"/>
      <ellipse cx="58" cy="49" rx="5.5" ry="7" transform="rotate(-20 58 49)" fill="#0F172A" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="30" cy="64" r="5" fill="#0F172A"/><circle cx="50" cy="64" r="5" fill="#0F172A"/>
      <!-- White Panda Head -->
      <ellipse cx="40" cy="30" rx="17.5" ry="14.5" fill="#FFFFFF" stroke="#2C3E50" stroke-width="2.6"/>
      ${stage >= 2 ? `<path d="M24 23 Q40 20 56 23 L56 26 Q40 23 24 26 Z" fill="#16A34A"/>` : ''}
      <!-- Signature Tilted Eye Patches -->
      <ellipse cx="32.5" cy="30" rx="5.2" ry="6.2" transform="rotate(-18 32.5 30)" fill="#0F172A"/>
      <ellipse cx="47.5" cy="30" rx="5.2" ry="6.2" transform="rotate(18 47.5 30)" fill="#0F172A"/>
      <circle cx="33" cy="29.5" r="2.2" fill="#FFF"/><circle cx="47" cy="29.5" r="2.2" fill="#FFF"/>
      <circle cx="33" cy="29.5" r="1" fill="#0F172A"/><circle cx="47" cy="29.5" r="1" fill="#0F172A"/>
      <ellipse cx="40" cy="36.5" rx="3" ry="2" fill="#0F172A"/>
      <!-- Green Bamboo Twig -->
      <line x1="56" y1="56" x2="65" y2="39" stroke="#16A34A" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="64" cy="43" rx="4" ry="2" transform="rotate(-25 64 43)" fill="#22C55E"/>
      ${renderAccessorySVG(accId, 40, 42, 30, 14)}
    `;
  } else if (speciesId === 'pet_fox') {
    // Sleek Kitsune Fox: pointed muzzle + 1 tail (Stage 1) -> 2 tails (Stage 2) -> 3 bushy fire tails (Stage 3+) with white tips
    const tailsCount = stage >= 3 ? 3 : stage === 2 ? 2 : 1;
    let tailsSvg = `<path d="M51 56 Q72 48 69 30 Q60 33 53 47 Z" fill="${c1}" stroke="#2C3E50" stroke-width="2.2"/><circle cx="67" cy="32" r="4.5" fill="#FFF"/>`;
    if (tailsCount >= 2) {
      tailsSvg += `<path d="M49 58 Q74 58 73 42 Q63 44 54 53 Z" fill="${c1}" stroke="#2C3E50" stroke-width="2"/><circle cx="71" cy="44" r="4" fill="#FFF"/>`;
    }
    if (tailsCount >= 3) {
      tailsSvg += `<path d="M29 56 Q8 48 11 30 Q20 33 27 47 Z" fill="${c1}" stroke="#2C3E50" stroke-width="2.2"/><circle cx="13" cy="32" r="4.5" fill="#FFF"/>`;
    }
    art = `
      ${tailsSvg}
      <!-- Fox Ears -->
      <polygon points="21,26 16,7 34,18" fill="${c1}" stroke="#2C3E50" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="59,26 64,7 46,18" fill="${c1}" stroke="#2C3E50" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="22,22 19,11 30,18" fill="#1E293B"/><polygon points="58,22 61,11 50,18" fill="#1E293B"/>
      <!-- Sleek Body + Fluffy White Chest Bib -->
      <ellipse cx="40" cy="53" rx="14.5" ry="13" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <polygon points="32,42 48,42 40,60" fill="#FFF"/>
      <ellipse cx="32" cy="65" rx="4.2" ry="2.8" fill="#1E293B"/><ellipse cx="48" cy="65" rx="4.2" ry="2.8" fill="#1E293B"/>
      <!-- Angular Fox Head -->
      <path d="M22 30 Q40 16 58 30 Q54 44 40 45 Q26 44 22 30 Z" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <path d="M24 33 Q40 45 56 33 Q49 43 40 44 Q31 43 24 33 Z" fill="#FFF"/>
      <circle cx="33" cy="30" r="2.8" fill="#1E293B"/><circle cx="47" cy="30" r="2.8" fill="#1E293B"/>
      <circle cx="33.8" cy="29" r="1" fill="#FFF"/><circle cx="47.8" cy="29" r="1" fill="#FFF"/>
      <circle cx="40" cy="38" r="2.5" fill="#0F172A"/>
      ${lashSvg(33, 47, 30)}
      ${renderAccessorySVG(accId, 40, 42, 30, 14)}
    `;
  } else if (speciesId === 'pet_phoenix') {
    // Regal Firebird Phoenix: triple flame crown crest, layered golden-red feathered wings, sweeping twin tail ribbons
    const wingScale = stage >= 3 ? 1.25 : 0.95;
    art = `
      <!-- Long Flowing Flame Tail Plumes -->
      <path d="M46 57 Q69 54 71 36" fill="none" stroke="#F59E0B" stroke-width="5" stroke-linecap="round"/>
      <path d="M44 61 Q66 64 73 49" fill="none" stroke="${c1}" stroke-width="4.2" stroke-linecap="round"/>
      <!-- Layered Fire Wings -->
      <g transform="translate(40,44) scale(${wingScale}) translate(-40,-44)">
        <path d="M26 42 Q6 24 10 14 Q22 22 31 35 Z" fill="${c1}" stroke="#2C3E50" stroke-width="2"/>
        <path d="M25 46 Q9 34 12 26 Q22 32 30 41 Z" fill="#FACC15" stroke="#2C3E50" stroke-width="1.6"/>
        <path d="M54 42 Q74 24 70 14 Q58 22 49 35 Z" fill="${c1}" stroke="#2C3E50" stroke-width="2"/>
        <path d="M55 46 Q71 34 68 26 Q58 32 50 41 Z" fill="#FACC15" stroke="#2C3E50" stroke-width="1.6"/>
      </g>
      <!-- Avian Body & Golden Chest -->
      <ellipse cx="40" cy="49" rx="13" ry="15" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <ellipse cx="40" cy="51" rx="8" ry="10" fill="#FEF08A"/>
      <!-- Crown Plume Crest -->
      <polygon points="40,4 35,19 40,15 45,19" fill="#FACC15" stroke="#991B1B" stroke-width="1.8"/>
      <polygon points="31,18 24,8 36,19" fill="#F59E0B" stroke="#991B1B" stroke-width="1.5"/>
      <polygon points="49,18 56,8 44,19" fill="#F59E0B" stroke="#991B1B" stroke-width="1.5"/>
      <!-- Avian Head -->
      <circle cx="40" cy="29" r="13.5" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <circle cx="34.5" cy="28" r="2.7" fill="#FEF08A"/><circle cx="45.5" cy="28" r="2.7" fill="#FEF08A"/>
      <circle cx="34.5" cy="28" r="1.4" fill="#0F172A"/><circle cx="45.5" cy="28" r="1.4" fill="#0F172A"/>
      <polygon points="40,37 36,31 44,31" fill="#FACC15" stroke="#2C3E50" stroke-width="1.6"/>
      ${renderAccessorySVG(accId, 40, 41, 28, 13)}
    `;
  } else {
    // pet_dragon: Reptilian winged dragon with swept horns, dorsal spikes, yellow chest plates, bat wings, spade tail!
    const wings = stage >= 2
      ? `<path d="M27 41 L9 24 L13 44 L22 41 L21 49 Z" fill="#F59E0B" stroke="#2C3E50" stroke-width="2" stroke-linejoin="round"/>
         <path d="M53 41 L71 24 L67 44 L58 41 L59 49 Z" fill="#F59E0B" stroke="#2C3E50" stroke-width="2" stroke-linejoin="round"/>`
      : '';
    art = `
      ${wings}
      <!-- Spiked Dragon Tail -->
      <path d="M51 56 Q68 56 69 40" fill="none" stroke="${c1}" stroke-width="5" stroke-linecap="round"/>
      <polygon points="69,34 64,42 74,42" fill="#FACC15" stroke="#2C3E50" stroke-width="1.6"/>
      <!-- Dragon Claws -->
      <ellipse cx="30" cy="64" rx="5.5" ry="3.4" fill="${c1}" stroke="#2C3E50" stroke-width="2"/>
      <ellipse cx="50" cy="64" rx="5.5" ry="3.4" fill="${c1}" stroke="#2C3E50" stroke-width="2"/>
      <!-- Reptilian Body + Belly Scales -->
      <ellipse cx="40" cy="51" rx="15.5" ry="14" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <ellipse cx="40" cy="53" rx="9" ry="10" fill="#FDE047"/>
      <line x1="33" y1="50" x2="47" y2="50" stroke="#D97706" stroke-width="1.6"/>
      <line x1="33" y1="55" x2="47" y2="55" stroke="#D97706" stroke-width="1.6"/>
      <!-- Swept Dragon Horns -->
      <path d="M29 22 Q20 12 22 6 Q28 11 33 19 Z" fill="#FACC15" stroke="#2C3E50" stroke-width="2"/>
      <path d="M51 22 Q60 12 58 6 Q52 11 47 19 Z" fill="#FACC15" stroke="#2C3E50" stroke-width="2"/>
      <!-- Dragon Head & Snout -->
      <ellipse cx="40" cy="30" rx="16" ry="13.5" fill="${c1}" stroke="#2C3E50" stroke-width="2.5"/>
      <ellipse cx="40" cy="36" rx="9.5" ry="5.5" fill="#FDE047" stroke="#2C3E50" stroke-width="1.6"/>
      <circle cx="36.5" cy="35" r="1.4" fill="#7F1D1D"/><circle cx="43.5" cy="35" r="1.4" fill="#7F1D1D"/>
      <circle cx="33" cy="27" r="3" fill="#FEF08A" stroke="#2C3E50" stroke-width="1.3"/><circle cx="47" cy="27" r="3" fill="#FEF08A" stroke="#2C3E50" stroke-width="1.3"/>
      <ellipse cx="33" cy="27" rx="1.2" ry="2.2" fill="#0F172A"/><ellipse cx="47" cy="27" rx="1.2" ry="2.2" fill="#0F172A"/>
      ${renderAccessorySVG(accId, 40, 42, 27, 14)}
    `;
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      ${auraRing}
      <ellipse cx="40" cy="68" rx="19" ry="5" fill="rgba(0,0,0,0.16)"/>
      <g transform="translate(40,42) scale(${stageScale}) translate(-40,-42)">
        ${art}
        ${crownSvg}
      </g>
      ${stageStars}
    </svg>
  `;
}

/**
 * Draw active companion pet trailing beside/behind owner character on Canvas2D
 * with clearly distinct species silhouettes & evolution stages!
 */
export function drawCompanionPetOnContext(
  ctx: CanvasRenderingContext2D,
  owner: Member,
  isMoving: boolean
) {
  const pet = getActivePet(owner);
  if (!pet) return;

  const sp = getPetSpecies(pet.speciesId);
  const resolved = getPetResolvedColors(sp, pet.variant);
  const c1 = resolved.primary;
  const c2 = resolved.accent;
  const stageDef = sp.stages.find((s) => s.stage === pet.stage) || sp.stages[0];
  const dir = owner.dir || 'down';
  const t = Date.now();

  let ox = -30;
  let oy = 12;
  if (dir === 'left') { ox = 32; oy = 10; }
  else if (dir === 'right') { ox = -32; oy = 10; }
  else if (dir === 'up') { ox = 26; oy = 18; }
  else { ox = -28; oy = 8; }

  const px = owner.x + ox;
  const py = owner.y + oy;
  const bounce = isMoving ? Math.abs(Math.sin(t / 110)) * 5.8 : Math.sin(t / 320) * 1.9;
  const scale = stageDef.scale * 0.78;
  const isRightBaseSpecies = sp.id === 'pet_corgi' || sp.id === 'pet_unicorn';
  const flipX =
    dir === 'left'
      ? (isRightBaseSpecies ? -1 : 1)
      : dir === 'right'
        ? (isRightBaseSpecies ? 1 : -1)
        : 1;
  const faceShiftX =
    dir === 'left' || dir === 'right'
      ? (isRightBaseSpecies ? 2.2 : -2.8)
      : 0;

  ctx.save();
  ctx.translate(px, py);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 12 * scale, 15 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bounce);
  ctx.scale(scale * flipX, scale);

  if (!pet.hatched) {
    const wobble = Math.sin(t / 240) * 0.09;
    ctx.rotate(wobble);
    ctx.fillStyle = c2;
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, -4, 13, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = c1;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-10, -4); ctx.lineTo(-4, -8); ctx.lineTo(3, -3); ctx.lineTo(10, -6);
    ctx.stroke();

    ctx.restore();
    ctx.save();
    ctx.font = 'bold 9px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px - 22, py - 28, 44, 13, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#92400E';
    ctx.fillText(`🥚 ${Math.round(pet.hatchProgress)}%`, px, py - 18);
    ctx.restore();
    return;
  }

  // Stage >= 2 or rare variant pulsing aura
  if (pet.stage >= 2 || resolved.isRare) {
    ctx.save();
    ctx.strokeStyle = resolved.auraColor;
    ctx.globalAlpha = 0.5 + Math.sin(t / 220) * 0.25;
    ctx.lineWidth = pet.stage >= 3 ? 2.8 : 2;
    ctx.beginPath();
    ctx.arc(0, -9, pet.stage >= 4 ? 26 : 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const flap = Math.sin(t / 120) * 0.35;
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 2.4;

  // Wings (species-specific styling + stage 3+ unlocks wings for all pets!)
  if (pet.stage >= 3 || sp.id === 'pet_owl' || sp.id === 'pet_phoenix' || (sp.id === 'pet_dragon' && pet.stage >= 2)) {
    const wingColor =
      sp.id === 'pet_phoenix' ? '#FACC15' :
      sp.id === 'pet_dragon' ? '#F59E0B' :
      sp.id === 'pet_unicorn' ? '#FFFFFF' :
      sp.id === 'pet_kitty' ? '#F9A8D4' :
      sp.id === 'pet_owl' ? c1 : c2;
    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.translate(side * 14, -6);
      ctx.rotate(side * (0.35 - flap));
      ctx.fillStyle = wingColor;
      ctx.beginPath();
      if (sp.id === 'pet_dragon') {
        ctx.moveTo(0, 0); ctx.lineTo(side * 15, -11); ctx.lineTo(side * 13, 5); ctx.lineTo(side * 5, 2); ctx.closePath();
      } else {
        ctx.ellipse(side * 7, 0, sp.id === 'pet_phoenix' ? 12 : 9.5, 5, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  // Tail by species
  if (sp.id === 'pet_corgi') {
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(-18, -1, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (sp.id === 'pet_kitty') {
    ctx.strokeStyle = c1; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(11, 4); ctx.quadraticCurveTo(22, -4, 18, -16); ctx.stroke();
    ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 2.4;
  } else if (sp.id === 'pet_unicorn') {
    ctx.strokeStyle = '#EC4899'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, 1); ctx.quadraticCurveTo(-24, 0, -21, 10); ctx.stroke();
    ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14, 3); ctx.quadraticCurveTo(-22, 4, -19, 12); ctx.stroke();
    ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 2.4;
  } else if (sp.id === 'pet_fox') {
    const tCount = pet.stage >= 3 ? 3 : pet.stage === 2 ? 2 : 1;
    for (let ti = 0; ti < tCount; ti++) {
      const ang = -0.3 + ti * 0.35;
      ctx.save();
      ctx.translate(10, 2);
      ctx.rotate(ang);
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.ellipse(9, -6, 9, 4.5, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFF';
      ctx.beginPath(); ctx.arc(15, -10, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else if (sp.id === 'pet_phoenix') {
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 4.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(9, 4); ctx.quadraticCurveTo(23, 2, 22, -13); ctx.stroke();
    ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 2.4;
  } else if (sp.id === 'pet_dragon') {
    ctx.strokeStyle = c1; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(11, 4); ctx.quadraticCurveTo(23, 3, 22, -10); ctx.stroke();
    ctx.fillStyle = '#FACC15'; ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(22, -14); ctx.lineTo(18, -8); ctx.lineTo(26, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 2.4;
  } else if (sp.id === 'pet_bunny') {
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(14, 4, 5.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // Body silhouette
  if (sp.id === 'pet_corgi') {
    // Wide loaf dog body + stubby legs
    ctx.fillStyle = '#FFF';
    ctx.fillRect(-13, 6, 5, 7); ctx.strokeRect(-13, 6, 5, 7);
    ctx.fillRect(6, 6, 5, 7); ctx.strokeRect(6, 6, 5, 7);
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.ellipse(-2, 1, 17, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.ellipse(7, 2, 7, 7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (sp.id === 'pet_unicorn') {
    ctx.fillStyle = c2;
    ctx.fillRect(-11, 5, 4.5, 8); ctx.strokeRect(-11, 5, 4.5, 8);
    ctx.fillRect(4, 5, 4.5, 8); ctx.strokeRect(4, 5, 4.5, 8);
    ctx.beginPath(); ctx.ellipse(-2, 0, 15, 9.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (sp.id === 'pet_owl' || sp.id === 'pet_penguin') {
    // Tall egg/oval bird body
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.ellipse(0, -6, 15, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(0, 1, 10, 11, 0, 0, Math.PI * 2); ctx.fill();
    if (sp.id === 'pet_penguin') {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath(); ctx.ellipse(-6, 12, 5.5, 2.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(6, 12, 5.5, 2.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  } else {
    ctx.fillStyle = sp.id === 'pet_panda' ? '#FFFFFF' : c1;
    ctx.beginPath(); ctx.ellipse(0, 1, 13.5, 11.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (sp.id === 'pet_panda') {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-12, -4, 24, 6);
    } else {
      ctx.fillStyle = sp.id === 'pet_dragon' ? '#FDE047' : sp.id === 'pet_phoenix' ? '#FEF08A' : '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(0, 3, 7.5, 7.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Head & Ears (shifted along travel direction so every species visibly turns!)
  const headX = (isRightBaseSpecies ? 6 : 0) + faceShiftX;
  const headY = (sp.id === 'pet_owl' || sp.id === 'pet_penguin' ? -15 : -14) + (dir === 'up' ? -1.5 : 0);

  // Ears
  if (sp.id === 'pet_bunny') {
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.ellipse(headX - 6, headY - 16, 4, 10.5, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(headX + 6, headY - 16, 4, 10.5, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (sp.id === 'pet_panda') {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath(); ctx.arc(headX - 10, headY - 10, 4.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(headX + 10, headY - 10, 4.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (sp.id === 'pet_phoenix') {
    ctx.fillStyle = '#FACC15';
    ctx.beginPath(); ctx.moveTo(headX, headY - 22); ctx.lineTo(headX - 5, headY - 10); ctx.lineTo(headX + 5, headY - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (sp.id !== 'pet_penguin') {
    ctx.fillStyle = sp.id === 'pet_dragon' ? '#FACC15' : c1;
    ctx.beginPath();
    ctx.moveTo(headX - 11, headY - 5); ctx.lineTo(headX - 15, headY - 18); ctx.lineTo(headX - 3, headY - 10); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(headX + 11, headY - 5); ctx.lineTo(headX + 15, headY - 18); ctx.lineTo(headX + 3, headY - 10); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  if (sp.id === 'pet_unicorn') {
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(headX - 3.5, headY - 10); ctx.lineTo(headX, headY - 25); ctx.lineTo(headX + 3.5, headY - 10); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  if (sp.id !== 'pet_owl' && sp.id !== 'pet_penguin') {
    ctx.fillStyle = sp.id === 'pet_panda' ? '#FFFFFF' : sp.id === 'pet_unicorn' ? c2 : c1;
    ctx.beginPath();
    ctx.arc(headX, headY, 12.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Face details
  const gazeShift = dir === 'left' || dir === 'right' ? (isRightBaseSpecies ? 1.8 : -1.8) : 0;
  if (sp.id === 'pet_panda') {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath(); ctx.ellipse(headX + gazeShift - 5, headY - 1, 3.6, 4.4, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(headX + gazeShift + 5, headY - 1, 3.6, 4.4, 0.2, 0, Math.PI * 2); ctx.fill();
  } else if (sp.id === 'pet_owl' || sp.id === 'pet_penguin') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(headX + gazeShift - 5, headY - 1, 5.2, 0, Math.PI * 2); ctx.arc(headX + gazeShift + 5, headY - 1, 5.2, 0, Math.PI * 2); ctx.fill();
    if (sp.id === 'pet_owl') {
      ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  // Eyes (when facing UP, hide eyes slightly like back-of-head for realistic depth)
  if (dir !== 'up') {
    ctx.fillStyle = sp.id === 'pet_panda' ? '#FFFFFF' : '#1E293B';
    ctx.beginPath();
    ctx.arc(headX + gazeShift - 4.8, headY - 1, 2.3, 0, Math.PI * 2);
    ctx.arc(headX + gazeShift + 4.8, headY - 1, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sp.id === 'pet_panda' ? '#0F172A' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(headX + gazeShift - 4, headY - 1.8, 0.9, 0, Math.PI * 2);
    ctx.arc(headX + gazeShift + 5.6, headY - 1.8, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Muzzle / Beak
    const snoutX = headX + gazeShift * 1.2;
    if (sp.id === 'pet_owl' || sp.id === 'pet_penguin' || sp.id === 'pet_phoenix') {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(snoutX, headY + 5); ctx.lineTo(snoutX - 3.2, headY + 1); ctx.lineTo(snoutX + 3.2, headY + 1); ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = sp.id === 'pet_dragon' || sp.id === 'pet_unicorn' ? '#FDE68A' : '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(snoutX, headY + 5, 5.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(snoutX, headY + 4, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Accessories & Stage crown
  if (pet.accessoryId === 'pacc_scarf') {
    ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(headX - 10, headY + 11); ctx.quadraticCurveTo(headX, headY + 15, headX + 10, headY + 11); ctx.stroke();
  } else if (pet.accessoryId === 'pacc_bell' || pet.stage >= 2) {
    ctx.strokeStyle = pet.accessoryId === 'pacc_bell' ? '#EF4444' : '#FACC15'; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(headX - 9, headY + 11); ctx.quadraticCurveTo(headX, headY + 15, headX + 9, headY + 11); ctx.stroke();
    if (pet.accessoryId === 'pacc_bell') {
      ctx.fillStyle = '#FACC15'; ctx.beginPath(); ctx.arc(headX, headY + 15, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (pet.accessoryId === 'pacc_glasses' && dir !== 'up') {
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#FACC15'; ctx.lineWidth = 1.4;
    ctx.fillRect(headX + gazeShift - 9, headY - 4, 7, 5); ctx.strokeRect(headX + gazeShift - 9, headY - 4, 7, 5);
    ctx.fillRect(headX + gazeShift + 2, headY - 4, 7, 5); ctx.strokeRect(headX + gazeShift + 2, headY - 4, 7, 5);
  }
  if (pet.accessoryId === 'pacc_bow') {
    ctx.fillStyle = '#EC4899';
    ctx.beginPath(); ctx.arc(headX - 4, headY - 12, 3.5, 0, Math.PI * 2); ctx.arc(headX + 4, headY - 12, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FACC15'; ctx.beginPath(); ctx.arc(headX, headY - 12, 2, 0, Math.PI * 2); ctx.fill();
  }
  if (pet.accessoryId === 'pacc_wizard') {
    ctx.fillStyle = '#4F46E5'; ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(headX - 10, headY - 10); ctx.lineTo(headX, headY - 26); ctx.lineTo(headX + 10, headY - 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (pet.stage >= 4 || pet.accessoryId === 'pacc_crown') {
    ctx.fillStyle = '#FACC15'; ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(headX - 7, headY - 12); ctx.lineTo(headX - 5, headY - 20); ctx.lineTo(headX, headY - 15); ctx.lineTo(headX + 5, headY - 20); ctx.lineTo(headX + 7, headY - 12);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  const isHungry = Math.round(pet.hunger ?? 100) <= 0;
  const genderSymbol = pet.gender === 'female' ? '♀' : pet.gender === 'male' ? '♂' : '';
  const stageShort = `GĐ${pet.stage}`;
  const tagText = `${genderSymbol ? `${genderSymbol} ` : ''}${pet.nickname} ${stageShort} Lv.${pet.level}`;
  ctx.font = 'bold 8.5px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  const tw = Math.max(44, ctx.measureText(tagText).width + 10);
  const tagY = py - 34 * scale - 12;
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.strokeStyle = isHungry ? '#DC2626' : c1;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(px - tw / 2, tagY, tw, 13, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1E293B';
  ctx.fillText(tagText, px, tagY + 9);

  if (isHungry) {
    const bob = Math.sin(t / 180) * 2;
    ctx.fillStyle = '#DC2626';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px - 22, tagY - 16 + bob, 44, 13, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px Fredoka, sans-serif';
    ctx.fillText('❗ ĐÓI!', px, tagY - 6.5 + bob);
  }
  ctx.restore();
}
