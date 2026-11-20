import { CustomLabItem, LabItemSpec } from '../types/b2ks';

export type LabSizeTier = 'small' | 'medium' | 'large' | 'giant';

export const LAB_SIZE_TIERS: Record<LabSizeTier, { label: string; scale: number; badge: string }> = {
  small: { label: 'Nhỏ (Mini)', scale: 0.72, badge: '🔹 Nhỏ' },
  medium: { label: 'Vừa (Chuẩn)', scale: 1.0, badge: '🔸 Vừa' },
  large: { label: 'Lớn', scale: 1.38, badge: '🔶 Lớn' },
  giant: { label: 'Khổng Lồ', scale: 1.75, badge: '💥 Khổng Lồ' }
};

export const RANDOM_LAB_IDEAS = [
  'a giant golden sports car with two rainbow wings',
  'a small galaxy pencil with two angel wings',
  'a huge cyber robot dinosaur with laser crown',
  'a giant rainbow unicorn castle with glowing stars',
  'a medium crystal volcano guitar with fire flames',
  'a large neon submarine with two dragon wings',
  'a small cute penguin wearing sunglasses on a skateboard',
  'a giant fire phoenix trophy with golden halo',
  'a large sakura dragon piano with musical bubbles',
  'a mini pastel spaceship donut with star sprinkles',
  'a huge steampunk train with spinning propeller',
  'a small emerald frog wearing a royal crown'
];

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const ENGLISH_LEXICON = new Set([
  'a','an','the','with','and','of','in','on','for','to','shaped','like','made','from','that','can','has','have','filled','wearing','holding','carrying','riding',
  'one','two','three','four','five','pair','twin','double','big','small','tiny','mini','little','medium','normal','large','huge','giant','mega','enormous','colossal',
  'cute','cool','super','magic','magical','flying','swimming','glowing','shiny','rainbow','sports','fast','turbo',
  'golden','gold','silver','crystal','wooden','wood','metal','robot','cyber','neon','galaxy','cosmic','space','star','stars',
  'moon','sun','fire','flame','flames','lava','volcano','ice','frost','frosty','water','ocean','emerald','ruby','sakura','pastel','candy','lightning','electric',
  'red','blue','green','yellow','pink','purple','orange','black','white','brown','colorful','steampunk',
  'pencil','pen','marker','eraser','ruler','notebook','backpack','bag','camera','headphones','headset','glasses','sunglasses','umbrella','key','trophy','medal','kite',
  'bicycle','bike','scooter','skateboard','car','supercar','vehicle','bus','truck','train','motorbike','motorcycle','boat','ship','submarine','plane','airplane','jet','helicopter','rocket','ufo','drone','satellite',
  'soccer','football','basketball','ball','sphere','orb','planet','saturn',
  'table','desk','chair','sofa','throne','bed','lamp','lantern','candle','clock','watch','book','bookshelf','box','chest','gift','present','house','treehouse','castle','tent',
  'guitar','piano','drum','microscope','telescope','compass','potion','sword','shield','wand','crown','bow','hammer','axe','helmet','mirror',
  'fish','shark','whale','dolphin','octopus','crab','cat','dog','puppy','kitten','bear','panda','rabbit','bunny','fox','penguin','bird','owl','eagle','phoenix','dragon','unicorn','bee','ghost','snowman',
  'butterfly','turtle','frog','lion','tiger','dinosaur','dino','alien',
  'cupcake','cake','pancake','icecream','pizza','burger','donut','doughnut','lollipop','watermelon','apple','strawberry','pineapple','teapot','mug','cup','sushi',
  'mushroom','flower','rose','sunflower','tree','cloud','diamond','gem','heart',
  'wings','wing','feather','feathers','tail','legs','eyes','wheels','wheel','flowers','bubbles','pearls','gears','antenna','halo','horns','propeller','cape','booster','boosters'
]);

export function isValidEnglishLabPrompt(raw: string): { ok: boolean; reason?: string; words?: string[] } {
  const cleaned = (raw || '').trim();
  if (!cleaned) return { ok: false, reason: '⚠️ Bạn chưa nhập dòng lệnh mô tả Tiếng Anh!' };
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleaned)) {
    return { ok: false, reason: '🇬🇧 Vui lòng nhập mô tả hoàn toàn bằng Tiếng Anh (không dùng dấu tiếng Việt)!' };
  }
  const words = cleaned.toLowerCase().match(/[a-z]{2,}/g) || [];
  if (words.length < 2) {
    return { ok: false, reason: '✍️ Hãy viết ít nhất 2 từ Tiếng Anh mô tả vật phẩm (ví dụ: "a pencil with two wings")!' };
  }
  const vowelWords = words.filter((w) => /[aeiouy]/.test(w));
  if (vowelWords.length < 2) {
    return { ok: false, reason: '🔤 Dòng lệnh chưa đúng từ vựng Tiếng Anh hợp lệ. Hãy thử lại nhé!' };
  }
  const known = words.filter((w) => ENGLISH_LEXICON.has(w)).length;
  if (known === 0 && words.length < 3) {
    return { ok: false, reason: '💡 Hãy dùng các từ Tiếng Anh mô tả đồ vật hoặc đặc tính (ví dụ: golden pencil, galaxy bicycle, flying ball...)' };
  }
  return { ok: true, words };
}

const SHAPE_LIBRARY: { keys: string[]; shape: string }[] = [
  { keys: ['pencil', 'pen', 'crayon', 'marker'], shape: 'pencil' },
  { keys: ['bicycle', 'bike', 'cycle', 'tricycle'], shape: 'bicycle' },
  { keys: ['motorcycle', 'motorbike'], shape: 'motorbike' },
  { keys: ['car', 'supercar', 'vehicle', 'taxi', 'racecar'], shape: 'car' },
  { keys: ['truck', 'bus', 'van'], shape: 'truck' },
  { keys: ['train', 'locomotive', 'subway'], shape: 'train' },
  { keys: ['soccer', 'football', 'basketball', 'ball', 'orb', 'sphere'], shape: 'ball' },
  { keys: ['skateboard', 'surfboard', 'hoverboard', 'scooter'], shape: 'skateboard' },
  { keys: ['unicorn', 'pegasus'], shape: 'unicorn' },
  { keys: ['dinosaur', 'dino', 'trex', 'raptor'], shape: 'dino' },
  { keys: ['octopus', 'squid'], shape: 'octopus' },
  { keys: ['ufo', 'saucer', 'alien', 'spaceship'], shape: 'ufo' },
  { keys: ['planet', 'saturn'], shape: 'planet' },
  { keys: ['submarine'], shape: 'submarine' },
  { keys: ['airplane', 'plane', 'jet'], shape: 'plane' },
  { keys: ['helicopter', 'chopper', 'drone'], shape: 'helicopter' },
  { keys: ['ship', 'boat', 'yacht', 'pirate'], shape: 'ship' },
  { keys: ['guitar', 'violin', 'ukulele'], shape: 'guitar' },
  { keys: ['piano', 'keyboard', 'organ'], shape: 'piano' },
  { keys: ['drum'], shape: 'drum' },
  { keys: ['telescope', 'microscope'], shape: 'telescope' },
  { keys: ['camera', 'photo'], shape: 'camera' },
  { keys: ['headphones', 'headset', 'earphones'], shape: 'headphones' },
  { keys: ['umbrella', 'parasol'], shape: 'umbrella' },
  { keys: ['backpack', 'bag', 'rucksack'], shape: 'backpack' },
  { keys: ['shoe', 'sneaker', 'boot'], shape: 'shoe' },
  { keys: ['trophy', 'cup', 'goblet'], shape: 'trophy' },
  { keys: ['gift', 'present'], shape: 'gift' },
  { keys: ['key'], shape: 'key' },
  { keys: ['kite'], shape: 'kite' },
  { keys: ['lantern'], shape: 'lantern' },
  { keys: ['candle'], shape: 'candle' },
  { keys: ['mug', 'teapot'], shape: 'mug' },
  { keys: ['pizza'], shape: 'pizza' },
  { keys: ['burger', 'hamburger', 'sandwich'], shape: 'burger' },
  { keys: ['donut', 'doughnut'], shape: 'donut' },
  { keys: ['lollipop', 'candy'], shape: 'lollipop' },
  { keys: ['watermelon', 'melon'], shape: 'watermelon' },
  { keys: ['strawberry', 'apple', 'pineapple', 'fruit'], shape: 'apple' },
  { keys: ['cupcake', 'cake', 'pancake', 'icecream', 'dessert'], shape: 'cake' },
  { keys: ['mushroom', 'toadstool'], shape: 'mushroom' },
  { keys: ['flower', 'rose', 'sunflower', 'sakura', 'lotus'], shape: 'flower' },
  { keys: ['cloud'], shape: 'cloud' },
  { keys: ['sun'], shape: 'sun' },
  { keys: ['moon', 'crescent'], shape: 'moon' },
  { keys: ['star'], shape: 'star' },
  { keys: ['heart'], shape: 'heart' },
  { keys: ['diamond', 'gem', 'jewel', 'crystal'], shape: 'diamond' },
  { keys: ['lightning', 'thunder', 'bolt'], shape: 'lightning' },
  { keys: ['rainbow'], shape: 'rainbow' },
  { keys: ['snowman'], shape: 'snowman' },
  { keys: ['ghost', 'spirit'], shape: 'ghost' },
  { keys: ['bee', 'bumblebee'], shape: 'bee' },
  { keys: ['frog', 'turtle'], shape: 'frog' },
  { keys: ['penguin'], shape: 'penguin' },
  { keys: ['bunny', 'rabbit'], shape: 'bunny' },
  { keys: ['fox'], shape: 'fox' },
  { keys: ['panda', 'bear'], shape: 'panda' },
  { keys: ['chest', 'treasure', 'box'], shape: 'chest' },
  { keys: ['potion', 'flask', 'bottle'], shape: 'potion' },
  { keys: ['wand'], shape: 'wand' },
  { keys: ['sword', 'blade', 'hammer', 'axe'], shape: 'sword' },
  { keys: ['shield'], shape: 'shield' },
  { keys: ['volcano', 'mountain'], shape: 'volcano' },
  { keys: ['treehouse', 'tree', 'plant'], shape: 'treehouse' },
  { keys: ['robot', 'mech', 'bot'], shape: 'robot' },
  { keys: ['phoenix'], shape: 'phoenix' },
  { keys: ['owl', 'bird', 'eagle'], shape: 'bird' },
  { keys: ['butterfly', 'dragonfly'], shape: 'butterfly' },
  { keys: ['whale', 'dolphin', 'shark', 'fish'], shape: 'fish' },
  { keys: ['throne', 'chair', 'sofa'], shape: 'throne' },
  { keys: ['clock', 'watch', 'gear', 'compass'], shape: 'clock' },
  { keys: ['crown', 'tiara'], shape: 'crown' },
  { keys: ['table', 'desk'], shape: 'table' },
  { keys: ['cat', 'kitten', 'dog', 'puppy', 'lion', 'tiger'], shape: 'cat' },
  { keys: ['rocket'], shape: 'rocket' },
  { keys: ['lamp', 'light'], shape: 'lamp' },
  { keys: ['dragon'], shape: 'dragon' },
  { keys: ['castle', 'tower', 'house'], shape: 'castle' },
  { keys: ['bookshelf', 'shelf', 'book', 'notebook'], shape: 'book' }
];

function matchShapeList(text: string): string[] {
  if (!text) return [];
  const results: string[] = [];
  for (const entry of SHAPE_LIBRARY) {
    const hit = entry.keys.some((k) => new RegExp(`\\b${k}(?:s|es)?\\b`, 'i').test(text));
    if (hit && !results.includes(entry.shape)) {
      results.push(entry.shape);
    }
  }
  return results;
}

const MATERIAL_PALETTES = [
  { keys: ['galaxy', 'cosmic', 'space', 'nebula', 'night'], material: 'galaxy', hex: '#4F46E5', accent: '#38BDF8', rarity: 'Vũ Trụ' },
  { keys: ['rainbow', 'colorful', 'prism'], material: 'rainbow', hex: '#EC4899', accent: '#FACC15', isRainbow: true, rarity: 'Cầu Vồng' },
  { keys: ['fire', 'lava', 'volcano', 'phoenix', 'flame'], material: 'fire', hex: '#DC2626', accent: '#FBBF24', rarity: 'Rực Lửa' },
  { keys: ['ice', 'frost', 'frosty', 'snow', 'arctic'], material: 'ice', hex: '#0EA5E9', accent: '#E0F2FE', rarity: 'Băng Giá' },
  { keys: ['cyber', 'neon', 'laser', 'electric', 'lightning'], material: 'cyber', hex: '#06B6D4', accent: '#F43F5E', rarity: 'Công Nghệ' },
  { keys: ['gold', 'golden', 'royal', 'treasure'], material: 'gold', hex: '#D97706', accent: '#FEF08A', rarity: 'Hoàng Gia' },
  { keys: ['emerald', 'forest', 'wood', 'wooden', 'nature', 'green'], material: 'nature', hex: '#16A34A', accent: '#BBF7D0', rarity: 'Thiên Nhiên' },
  { keys: ['sakura', 'candy', 'strawberry', 'pink', 'cute', 'pastel'], material: 'candy', hex: '#EC4899', accent: '#FBCFE8', rarity: 'Ngọt Ngào' },
  { keys: ['purple', 'magic', 'magical', 'crystal', 'potion'], material: 'crystal', hex: '#7C3AED', accent: '#DDD6FE', rarity: 'Pha Lê' },
  { keys: ['blue', 'ocean', 'water', 'marine', 'sky'], material: 'ocean', hex: '#0284C7', accent: '#BAE6FD', rarity: 'Đại Dương' },
  { keys: ['red', 'ruby'], material: 'ruby', hex: '#E11D48', accent: '#FECDD3', rarity: 'Hồng Ngọc' },
  { keys: ['yellow', 'sunny', 'sun'], material: 'sun', hex: '#EAB308', accent: '#FEF08A', rarity: 'Ánh Dương' },
  { keys: ['orange', 'tiger', 'sunset'], material: 'sunset', hex: '#EA580C', accent: '#FED7AA', rarity: 'Hoàng Hôn' },
  { keys: ['silver', 'metal', 'steampunk', 'robot'], material: 'metal', hex: '#64748B', accent: '#E2E8F0', rarity: 'Cơ Khí' }
];

const FALLBACK_COLORS = [
  { hex: '#0EA5E9', accent: '#BAE6FD' },
  { hex: '#8B5CF6', accent: '#DDD6FE' },
  { hex: '#10B981', accent: '#A7F3D0' },
  { hex: '#F59E0B', accent: '#FEF08A' },
  { hex: '#EF4444', accent: '#FECACA' },
  { hex: '#EC4899', accent: '#FBCFE8' },
  { hex: '#14B8A6', accent: '#99F6E4' }
];

export function parsePromptToLabSpec(
  promptText: string,
  itemAId: string | null = null,
  itemBId: string | null = null,
  resolveShapeFn?: (id: string) => string | null,
  sizeOverride?: 'auto' | 'small' | 'medium' | 'large' | 'giant'
): LabItemSpec {
  const lower = promptText.toLowerCase();
  const seed = hashString(`${lower}|${itemAId || ''}|${itemBId || ''}`);

  const mat = MATERIAL_PALETTES.find((m) => m.keys.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(lower)));
  const fallbackCol = FALLBACK_COLORS[seed % FALLBACK_COLORS.length];

  const splitMatch = lower.split(/\b(?:with|having|wearing|holding|carrying|riding|on|inside|made\s+of|filled\s+with)\b/i);
  const headPhrase = splitMatch[0] || lower;
  const modPhrase = splitMatch.slice(1).join(' ');

  const headShapes = matchShapeList(headPhrase);
  const modShapes = matchShapeList(modPhrase);
  const allShapes = [...headShapes, ...modShapes.filter((s) => !headShapes.includes(s))];

  let primaryShape = headShapes[0] || allShapes[0] || SHAPE_LIBRARY[seed % SHAPE_LIBRARY.length].shape;
  let secondaryTrait: string | null = allShapes.find((s) => s !== primaryShape) || null;

  if (itemAId && resolveShapeFn) {
    const shA = resolveShapeFn(itemAId);
    if (shA) primaryShape = shA;
  }
  if (itemBId && resolveShapeFn) {
    const shB = resolveShapeFn(itemBId);
    if (shB) secondaryTrait = shB;
  }

  let sizeTier: 'small' | 'medium' | 'large' | 'giant' = 'medium';
  if (sizeOverride && sizeOverride !== 'auto') {
    sizeTier = sizeOverride;
  } else if (/\b(giant|mega|colossal|enormous|jumbo)\b/i.test(lower)) {
    sizeTier = 'giant';
  } else if (/\b(big|large|huge|tall|long)\b/i.test(lower)) {
    sizeTier = 'large';
  } else if (/\b(tiny|mini|small|little|pocket)\b/i.test(lower)) {
    sizeTier = 'small';
  }
  const sizeScale = LAB_SIZE_TIERS[sizeTier].scale;

  let wingStyle: LabItemSpec['wingStyle'] = 'feather';
  if (/\b(dragon|bat)\b/i.test(lower)) wingStyle = 'dragon';
  else if (/\b(angel|heavenly)\b/i.test(lower)) wingStyle = 'angel';
  else if (/\b(butterfly|fairy)\b/i.test(lower)) wingStyle = 'butterfly';
  else if (/\b(cyber|robot|laser|jet|mech|rocket)\b/i.test(lower)) wingStyle = 'cyber';

  const wingCount: 2 | 4 = /\b(four|4)\s+wings?\b/i.test(lower) ? 4 : 2;
  const patterns = ['dots', 'stripes', 'runes', 'circuit', 'sparkles'];

  return {
    primaryShape,
    secondaryTrait,
    color: mat ? mat.hex : fallbackCol.hex,
    accent: mat ? mat.accent : fallbackCol.accent,
    isRainbow: Boolean(mat?.isRainbow),
    material: mat ? mat.material : 'crystal',
    rarity: mat ? mat.rarity : 'Độc Bản',
    pattern: patterns[seed % patterns.length],
    seed,
    sizeTier,
    sizeScale,
    wingCount,
    wingStyle,
    hasWings: /\b(wings?|winged|flying|fly|angel|pegasus|feather|feathers)\b/i.test(lower),
    hasWheels: /\b(wheels?|rolling)\b/i.test(lower),
    hasLegs: /\b(legs?|walk|walking)\b/i.test(lower) || secondaryTrait === 'table',
    hasFishTail: /\b(mermaid|swim|swimming|fins?|fishtail)\b/i.test(lower) || (secondaryTrait === 'fish' && primaryShape !== 'fish'),
    hasCrown: /\b(crown|tiara|king|queen|royal|princess|prince)\b/i.test(lower) && primaryShape !== 'crown',
    hasHalo: /\b(halo|angel|heavenly|holy)\b/i.test(lower),
    hasFire: /\b(fire|flame|flames|lava|blazing|rocket|turbo|booster|boosters)\b/i.test(lower) && primaryShape !== 'rocket',
    hasExhaust: /\b(turbo|rocket|booster|boosters|fast|racecar|supercar)\b/i.test(lower),
    hasHeadlights: /\b(glowing|light|lights|headlights|car|train|truck)\b/i.test(lower),
    hasPropeller: /\b(propeller|spinning|chopper)\b/i.test(lower),
    hasCape: /\b(cape|hero|superhero)\b/i.test(lower),
    hasBubbles: /\b(bubbles?|ocean|water|pearls?|musical)\b/i.test(lower),
    hasGlasses: /\b(glasses|sunglasses|cool)\b/i.test(lower),
    hasAntenna: /\b(antenna|cyber|robot|alien)\b/i.test(lower) && primaryShape !== 'robot',
    hasStars: /\b(stars?|magic|magical|glow|glowing|crystal|rainbow|galaxy|cosmic|space|neon|laser)\b/i.test(lower)
  };
}

export function buildLabSVGMarkup(spec: LabItemSpec): string {
  const c = spec.color || '#0EA5E9';
  const ac = spec.accent || '#BAE6FD';
  const seed = spec.seed || 42;
  const uid = 'g_' + Math.random().toString(36).slice(2, 8);
  const parts: string[] = [];

  if (spec.isRainbow) {
    parts.push(`<defs>
      <linearGradient id="${uid}_body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#F43F5E"/>
        <stop offset="33%" stop-color="#F59E0B"/>
        <stop offset="66%" stop-color="#10B981"/>
        <stop offset="100%" stop-color="#3B82F6"/>
      </linearGradient>
      <radialGradient id="${uid}_aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#38BDF8" stop-opacity="0"/>
      </radialGradient>
    </defs>`);
  } else {
    parts.push(`<defs>
      <linearGradient id="${uid}_body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${ac}"/>
        <stop offset="55%" stop-color="${c}"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </linearGradient>
      <radialGradient id="${uid}_aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${ac}" stop-opacity="0.68"/>
        <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
      </radialGradient>
    </defs>`);
  }

  const fillMain = `url(#${uid}_body)`;
  parts.push(`<ellipse cx="32" cy="58" rx="20" ry="4" fill="#0F172A" opacity="0.22"/>`);
  parts.push(`<circle cx="32" cy="32" r="28" fill="url(#${uid}_aura)"/>`);

  // Optional background aura flames
  if (spec.hasFire) {
    parts.push(`<path d="M14 48 Q8 32 18 22 Q20 34 26 24 Q32 10 38 24 Q44 34 46 22 Q56 32 50 48 Z" fill="#F97316" opacity="0.55"/>`);
  }

  // Optional Bubbles / Stars
  if (spec.hasBubbles) {
    parts.push(`<circle cx="11" cy="18" r="3.5" fill="#E0F2FE" stroke="#0284C7" stroke-width="1"/>`);
    parts.push(`<circle cx="53" cy="24" r="2.8" fill="#E0F2FE" stroke="#0284C7" stroke-width="1"/>`);
    parts.push(`<circle cx="14" cy="44" r="2.2" fill="#E0F2FE" stroke="#0284C7" stroke-width="1"/>`);
  }
  if (spec.hasStars) {
    parts.push(`<polygon points="9,12 10.8,15.5 14.5,17 10.8,18.5 9,22 7.2,18.5 3.5,17 7.2,15.5" fill="#FACC15" stroke="#B45309" stroke-width="0.8"/>`);
    parts.push(`<polygon points="54,14 55.5,16.8 58.5,18 55.5,19.2 54,22 52.5,19.2 49.5,18 52.5,16.8" fill="#38BDF8" stroke="#0369A1" stroke-width="0.8"/>`);
  }

  // Wings (large outstretched multi-layered wings clearly extending outside body)
  if (spec.hasWings) {
    const wFill = spec.wingStyle === 'dragon' ? '#FCA5A5' : spec.wingStyle === 'cyber' ? '#38BDF8' : spec.wingStyle === 'butterfly' ? ac : '#FFFFFF';
    const wEdge = spec.wingStyle === 'dragon' ? '#991B1B' : spec.wingStyle === 'cyber' ? '#0284C7' : c;
    // Upper sweeping left wing
    parts.push(`<path d="M25 35 C12 20 2 10 2 20 C1 26 9 29 16 30 C7 33 5 39 18 39 C11 42 13 46 25 43 Z" fill="${wFill}" stroke="#1E293B" stroke-width="2" stroke-linejoin="round"/>`);
    parts.push(`<path d="M23 34 Q10 22 6 20 M22 37 Q11 32 9 34" fill="none" stroke="${wEdge}" stroke-width="1.5" stroke-linecap="round"/>`);
    // Upper sweeping right wing
    parts.push(`<path d="M39 35 C52 20 62 10 62 20 C63 26 55 29 48 30 C57 33 59 39 46 39 C53 42 51 46 39 43 Z" fill="${wFill}" stroke="#1E293B" stroke-width="2" stroke-linejoin="round"/>`);
    parts.push(`<path d="M41 34 Q54 22 58 20 M42 37 Q53 32 55 34" fill="none" stroke="${wEdge}" stroke-width="1.5" stroke-linecap="round"/>`);
    if (spec.wingCount === 4) {
      parts.push(`<ellipse cx="14" cy="45" rx="9" ry="4.5" transform="rotate(-24 14 45)" fill="${ac}" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<ellipse cx="50" cy="45" rx="9" ry="4.5" transform="rotate(24 50 45)" fill="${ac}" stroke="#1E293B" stroke-width="1.6"/>`);
    }
  }

  if (spec.hasFishTail) {
    parts.push(`<path d="M32 45 Q42 54 52 47 Q46 57 38 56 Q34 52 32 45 Z" fill="${ac}" stroke="#1E293B" stroke-width="1.8"/>`);
  }

  if (spec.hasLegs) {
    parts.push(`<rect x="20" y="45" width="5" height="12" rx="2" fill="#92400E" stroke="#1E293B" stroke-width="1.8"/>`);
    parts.push(`<rect x="39" y="45" width="5" height="12" rx="2" fill="#92400E" stroke="#1E293B" stroke-width="1.8"/>`);
  }

  if (spec.hasAntenna) {
    parts.push(`<line x1="32" y1="15" x2="32" y2="6" stroke="#1E293B" stroke-width="2"/>`);
    parts.push(`<circle cx="32" cy="5.5" r="3" fill="#38BDF8" stroke="#1E293B" stroke-width="1.4"/>`);
  }

  // Main shape geometry (50+ distinct items)
  switch (spec.primaryShape) {
    case 'pencil':
      parts.push(`<g transform="rotate(-32 32 32)">
        <rect x="26.5" y="13" width="11" height="33" rx="2" fill="${spec.material === 'crystal' ? '#FACC15' : fillMain}" stroke="#1E293B" stroke-width="2"/>
        <line x1="30" y1="18" x2="30" y2="45" stroke="rgba(255,255,255,0.45)" stroke-width="1.6"/>
        <line x1="34" y1="18" x2="34" y2="45" stroke="rgba(0,0,0,0.2)" stroke-width="1.4"/>
        <rect x="26.5" y="8" width="11" height="6" rx="2.5" fill="#F472B6" stroke="#1E293B" stroke-width="1.8"/>
        <rect x="26.5" y="13.5" width="11" height="4" fill="#CBD5E1" stroke="#1E293B" stroke-width="1.6"/>
        <polygon points="26.5,46 37.5,46 32,57" fill="#FDE68A" stroke="#1E293B" stroke-width="1.8"/>
        <polygon points="30,53 34,53 32,57.5" fill="#1E293B"/>
      </g>`);
      break;
    case 'bicycle':
      parts.push(`<circle cx="17" cy="43" r="9.5" fill="none" stroke="#1E293B" stroke-width="2.8"/>`);
      parts.push(`<circle cx="17" cy="43" r="6" fill="none" stroke="${ac}" stroke-width="1.2" stroke-dasharray="2,2"/>`);
      parts.push(`<circle cx="47" cy="43" r="9.5" fill="none" stroke="#1E293B" stroke-width="2.8"/>`);
      parts.push(`<circle cx="47" cy="43" r="6" fill="none" stroke="${ac}" stroke-width="1.2" stroke-dasharray="2,2"/>`);
      parts.push(`<path d="M17 43 L29 29 L42 29 L31 43 Z M29 29 L26 22 M42 29 L47 43 M42 29 L40 21 L45 20" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
      parts.push(`<rect x="22" y="20" width="9" height="3.5" rx="1.5" fill="#1E293B"/>`);
      parts.push(`<circle cx="31" cy="43" r="3" fill="#FACC15" stroke="#1E293B" stroke-width="1.4"/>`);
      break;
    case 'ball':
      parts.push(`<circle cx="32" cy="34" r="16.5" fill="${spec.material === 'crystal' ? '#FFFFFF' : fillMain}" stroke="#1E293B" stroke-width="2.2"/>`);
      parts.push(`<polygon points="32,26 38,30.5 35.5,37.5 28.5,37.5 26,30.5" fill="#1E293B"/>`);
      parts.push(`<path d="M32 26 L32 18 M38 30.5 L47 28 M35.5 37.5 L42 47 M28.5 37.5 L22 47 M26 30.5 L17 28" stroke="#1E293B" stroke-width="1.7"/>`);
      parts.push(`<path d="M22 23 A13 13 0 0 1 36 20" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linecap="round"/>`);
      break;
    case 'camera':
      parts.push(`<rect x="12" y="22" width="40" height="27" rx="5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.2"/>`);
      parts.push(`<path d="M22 22 L25 16 L39 16 L42 22 Z" fill="${ac}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<circle cx="32" cy="35" r="9.5" fill="#0F172A" stroke="#E2E8F0" stroke-width="2"/>`);
      parts.push(`<circle cx="32" cy="35" r="5.5" fill="#38BDF8"/>`);
      parts.push(`<circle cx="46" cy="27" r="2.2" fill="#FACC15"/>`);
      break;
    case 'headphones':
      parts.push(`<path d="M16 35 A16 18 0 0 1 48 35" fill="none" stroke="#1E293B" stroke-width="4.5" stroke-linecap="round"/>`);
      parts.push(`<path d="M16 35 A16 18 0 0 1 48 35" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>`);
      parts.push(`<rect x="11" y="31" width="8" height="17" rx="4" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<rect x="45" y="31" width="8" height="17" rx="4" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      break;
    case 'umbrella':
      parts.push(`<path d="M10 34 Q32 8 54 34 Q46 31 40 34 Q32 31 24 34 Q18 31 10 34 Z" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<line x1="32" y1="15" x2="32" y2="50" stroke="#1E293B" stroke-width="2.4"/>`);
      parts.push(`<path d="M32 50 Q32 56 26 55" fill="none" stroke="#92400E" stroke-width="2.5" stroke-linecap="round"/>`);
      break;
    case 'backpack':
      parts.push(`<path d="M22 20 Q32 11 42 20" fill="none" stroke="#1E293B" stroke-width="3"/>`);
      parts.push(`<rect x="16" y="20" width="32" height="32" rx="9" fill="${fillMain}" stroke="#1E293B" stroke-width="2.2"/>`);
      parts.push(`<rect x="21" y="34" width="22" height="13" rx="4" fill="${ac}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<rect x="29" y="26" width="6" height="4" rx="1" fill="#FACC15" stroke="#1E293B" stroke-width="1.3"/>`);
      break;
    case 'shoe':
      parts.push(`<path d="M13 38 L22 24 L31 28 L38 35 L52 38 Q54 44 50 47 L13 47 Z" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1" stroke-linejoin="round"/>`);
      parts.push(`<rect x="12" y="45" width="40" height="5" rx="2.5" fill="#FFF" stroke="#1E293B" stroke-width="1.8"/>`);
      break;
    case 'trophy':
      parts.push(`<path d="M19 16 L45 16 L42 34 Q32 42 22 34 Z" fill="#FACC15" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<path d="M19 19 Q11 19 13 27 Q15 32 21 31" fill="none" stroke="#F59E0B" stroke-width="2.5"/>`);
      parts.push(`<path d="M45 19 Q53 19 51 27 Q49 32 43 31" fill="none" stroke="#F59E0B" stroke-width="2.5"/>`);
      parts.push(`<rect x="29" y="38" width="6" height="9" fill="#D97706" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<rect x="22" y="47" width="20" height="6" rx="2" fill="#78350F" stroke="#1E293B" stroke-width="1.8"/>`);
      break;
    case 'key':
      parts.push(`<circle cx="22" cy="30" r="10" fill="${fillMain}" stroke="#1E293B" stroke-width="2.2"/>`);
      parts.push(`<circle cx="22" cy="30" r="4" fill="#FFF"/>`);
      parts.push(`<rect x="31" y="27.5" width="21" height="5" rx="2" fill="${fillMain}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<rect x="42" y="32" width="4" height="7" fill="${fillMain}" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<rect x="48" y="32" width="4" height="5" fill="${fillMain}" stroke="#1E293B" stroke-width="1.6"/>`);
      break;
    case 'kite':
      parts.push(`<polygon points="32,10 49,28 32,48 15,28" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<line x1="32" y1="10" x2="32" y2="48" stroke="#1E293B" stroke-width="1.5"/>`);
      parts.push(`<line x1="15" y1="28" x2="49" y2="28" stroke="#1E293B" stroke-width="1.5"/>`);
      parts.push(`<path d="M32 48 Q27 53 33 57" fill="none" stroke="#EC4899" stroke-width="2.2"/>`);
      break;
    case 'plane':
      parts.push(`<path d="M12 36 L52 24 L40 38 L47 47 L35 42 L24 49 L27 38 Z" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1" stroke-linejoin="round"/>`);
      break;
    case 'helicopter':
      parts.push(`<line x1="14" y1="18" x2="50" y2="18" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>`);
      parts.push(`<line x1="32" y1="18" x2="32" y2="25" stroke="#1E293B" stroke-width="2.5"/>`);
      parts.push(`<ellipse cx="29" cy="34" rx="15" ry="10" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<rect x="42" y="32" width="13" height="4" fill="${ac}" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<line x1="18" y1="49" x2="42" y2="49" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>`);
      break;
    case 'ship':
      parts.push(`<polygon points="32,12 32,37 48,35" fill="#FFF" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<polygon points="30,17 30,37 16,35" fill="${ac}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<polygon points="12,39 52,39 45,51 19,51" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      break;
    case 'lantern':
      parts.push(`<line x1="32" y1="10" x2="32" y2="16" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<rect x="23" y="16" width="18" height="4" rx="1" fill="#1E293B"/>`);
      parts.push(`<ellipse cx="32" cy="33" rx="14" ry="15" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<ellipse cx="32" cy="33" rx="6" ry="14" fill="#FEF08A" opacity="0.65"/>`);
      parts.push(`<rect x="24" y="47" width="16" height="4" rx="1" fill="#1E293B"/>`);
      break;
    case 'candle':
      parts.push(`<path d="M32 10 Q38 18 32 23 Q26 18 32 10 Z" fill="#FACC15" stroke="#EA580C" stroke-width="1.5"/>`);
      parts.push(`<rect x="23" y="24" width="18" height="27" rx="3" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<rect x="18" y="50" width="28" height="5" rx="2" fill="#D97706" stroke="#1E293B" stroke-width="1.8"/>`);
      break;
    case 'mug':
      parts.push(`<path d="M43 27 Q52 27 52 35 Q52 43 43 43" fill="none" stroke="#1E293B" stroke-width="3"/>`);
      parts.push(`<rect x="17" y="23" width="26" height="26" rx="4" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<path d="M24 18 Q26 13 24 10 M32 17 Q34 12 32 9" fill="none" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round"/>`);
      break;
    case 'pizza':
      parts.push(`<polygon points="32,12 52,48 12,48" fill="#FDE047" stroke="#1E293B" stroke-width="2.1" stroke-linejoin="round"/>`);
      parts.push(`<rect x="12" y="44" width="40" height="6" rx="3" fill="#D97706" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<circle cx="32" cy="27" r="3.5" fill="#EF4444"/><circle cx="25" cy="38" r="3.5" fill="#EF4444"/><circle cx="39" cy="39" r="3.5" fill="#EF4444"/>`);
      break;
    case 'burger':
      parts.push(`<path d="M14 29 Q32 12 50 29 Z" fill="#F59E0B" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<rect x="13" y="30" width="38" height="5" rx="2" fill="#22C55E"/>`);
      parts.push(`<rect x="13" y="35" width="38" height="6" rx="3" fill="#78350F" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<rect x="15" y="42" width="34" height="7" rx="3" fill="#F59E0B" stroke="#1E293B" stroke-width="2"/>`);
      break;
    case 'donut':
      parts.push(`<circle cx="32" cy="34" r="17" fill="#F59E0B" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<path d="M16 32 Q22 20 32 20 Q42 20 48 32 Q41 37 32 34 Q23 37 16 32 Z" fill="${fillMain}"/>`);
      parts.push(`<circle cx="32" cy="34" r="5.5" fill="#FFF" stroke="#1E293B" stroke-width="1.8"/>`);
      break;
    case 'lollipop':
      parts.push(`<line x1="32" y1="38" x2="32" y2="56" stroke="#CBD5E1" stroke-width="3.5" stroke-linecap="round"/>`);
      parts.push(`<circle cx="32" cy="26" r="14" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<path d="M32 26 A4 4 0 0 1 36 26 A8 8 0 0 1 24 26 A11 11 0 0 1 42 22" fill="none" stroke="#FFF" stroke-width="2.2" stroke-linecap="round"/>`);
      break;
    case 'watermelon':
      parts.push(`<path d="M12 28 A20 20 0 0 0 52 28 Z" fill="#16A34A" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<path d="M16 28 A16 16 0 0 0 48 28 Z" fill="#EF4444"/>`);
      parts.push(`<circle cx="26" cy="34" r="1.5" fill="#0F172A"/><circle cx="32" cy="37" r="1.5" fill="#0F172A"/><circle cx="38" cy="34" r="1.5" fill="#0F172A"/>`);
      break;
    case 'apple':
      parts.push(`<path d="M32 17 Q37 10 42 14 Q38 19 32 17 Z" fill="#22C55E" stroke="#1E293B" stroke-width="1.4"/>`);
      parts.push(`<path d="M32 21 Q44 17 47 30 Q49 45 36 49 Q32 50 28 49 Q15 45 17 30 Q20 17 32 21 Z" fill="${spec.material === 'crystal' ? '#EF4444' : fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      break;
    case 'mushroom':
      parts.push(`<rect x="26" y="33" width="12" height="19" rx="4" fill="#FEF3C7" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<path d="M12 34 Q14 14 32 14 Q50 14 52 34 Z" fill="${spec.material === 'crystal' ? '#EF4444' : fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<circle cx="25" cy="24" r="3" fill="#FFF"/><circle cx="38" cy="22" r="2.5" fill="#FFF"/><circle cx="33" cy="29" r="2" fill="#FFF"/>`);
      break;
    case 'flower':
      [0, 60, 120, 180, 240, 300].forEach((ang) => {
        const rad = (ang * Math.PI) / 180;
        const px = 32 + Math.cos(rad) * 12;
        const py = 30 + Math.sin(rad) * 12;
        parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="7.5" fill="${fillMain}" stroke="#1E293B" stroke-width="1.8"/>`);
      });
      parts.push(`<circle cx="32" cy="30" r="6.5" fill="#FACC15" stroke="#1E293B" stroke-width="1.8"/>`);
      break;
    case 'cloud':
      parts.push(`<path d="M19 44 Q11 44 11 36 Q11 29 18 28 Q20 18 31 18 Q41 18 44 26 Q53 27 53 35 Q53 44 44 44 Z" fill="${spec.material === 'crystal' ? '#E0F2FE' : fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      break;
    case 'sun':
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        parts.push(`<line x1="${(32 + Math.cos(a) * 16).toFixed(1)}" y1="${(32 + Math.sin(a) * 16).toFixed(1)}" x2="${(32 + Math.cos(a) * 22).toFixed(1)}" y2="${(32 + Math.sin(a) * 22).toFixed(1)}" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>`);
      }
      parts.push(`<circle cx="32" cy="32" r="13" fill="#FACC15" stroke="#1E293B" stroke-width="2.1"/>`);
      break;
    case 'moon':
      parts.push(`<path d="M38 14 A17 17 0 1 0 48 42 A13 13 0 1 1 38 14 Z" fill="#FACC15" stroke="#1E293B" stroke-width="2.1"/>`);
      break;
    case 'star':
      parts.push(`<polygon points="32,10 38,24 53,26 42,36 45,51 32,44 19,51 22,36 11,26 26,24" fill="${spec.material === 'crystal' ? '#FACC15' : fillMain}" stroke="#1E293B" stroke-width="2.1" stroke-linejoin="round"/>`);
      break;
    case 'heart':
      parts.push(`<path d="M32 50 C14 38 11 25 18 18 C24 13 30 17 32 22 C34 17 40 13 46 18 C53 25 50 38 32 50 Z" fill="${spec.material === 'crystal' ? '#F43F5E' : fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      break;
    case 'diamond':
      parts.push(`<polygon points="20,17 44,17 53,29 32,52 11,29" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1" stroke-linejoin="round"/>`);
      parts.push(`<polyline points="11,29 53,29" fill="none" stroke="#FFF" stroke-width="1.6"/>`);
      parts.push(`<polyline points="20,17 26,29 32,52 38,29 44,17" fill="none" stroke="#FFF" stroke-width="1.3" opacity="0.75"/>`);
      break;
    case 'lightning':
      parts.push(`<polygon points="35,9 17,34 30,34 25,55 47,28 33,28" fill="#FACC15" stroke="#1E293B" stroke-width="2.1" stroke-linejoin="round"/>`);
      break;
    case 'rainbow':
      parts.push(`<path d="M12 44 A20 20 0 0 1 52 44" fill="none" stroke="#EF4444" stroke-width="4.5" stroke-linecap="round"/>`);
      parts.push(`<path d="M17 44 A15 15 0 0 1 47 44" fill="none" stroke="#FACC15" stroke-width="4.5" stroke-linecap="round"/>`);
      parts.push(`<path d="M22 44 A10 10 0 0 1 42 44" fill="none" stroke="#3B82F6" stroke-width="4.5" stroke-linecap="round"/>`);
      break;
    case 'ghost':
      parts.push(`<path d="M17 49 L17 28 A15 15 0 0 1 47 28 L47 49 L41 44 L35 49 L29 44 L23 49 Z" fill="#F8FAFC" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<circle cx="27" cy="28" r="2.5" fill="#0F172A"/><circle cx="37" cy="28" r="2.5" fill="#0F172A"/>`);
      parts.push(`<ellipse cx="32" cy="34" rx="2.8" ry="3.5" fill="#0F172A"/>`);
      break;
    case 'bee':
      parts.push(`<ellipse cx="32" cy="35" rx="15" ry="11" fill="#FACC15" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<line x1="27" y1="25" x2="27" y2="45" stroke="#1E293B" stroke-width="3.5"/>`);
      parts.push(`<line x1="36" y1="25" x2="36" y2="45" stroke="#1E293B" stroke-width="3.5"/>`);
      parts.push(`<ellipse cx="26" cy="21" rx="6" ry="8" fill="#E0F2FE" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<ellipse cx="38" cy="21" rx="6" ry="8" fill="#E0F2FE" stroke="#1E293B" stroke-width="1.6"/>`);
      break;
    case 'shield':
      parts.push(`<path d="M16 16 L32 11 L48 16 L46 34 Q32 51 18 34 Z" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<polygon points="32,20 35,27 42,27 36,32 38,39 32,35 26,39 28,32 22,27 29,27" fill="#FACC15"/>`);
      break;
    case 'book':
      parts.push(`<path d="M13 18 Q23 15 32 20 Q41 15 51 18 L51 47 Q41 44 32 49 Q23 44 13 47 Z" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<path d="M16 21 Q24 19 31 23 L31 45 Q24 42 16 44 Z" fill="#FFF"/>`);
      parts.push(`<path d="M48 21 Q40 19 33 23 L33 45 Q40 42 48 44 Z" fill="#F8FAFC"/>`);
      break;
    case 'unicorn':
      parts.push(`<polygon points="30,18 34,4 38,18" fill="#FACC15" stroke="#1E293B" stroke-width="1.7"/>`);
      parts.push(`<path d="M19 24 Q14 14 23 18 Q28 11 33 17 Q42 15 45 25 L45 45 Q32 51 19 45 Z" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="27" cy="29" r="2.5" fill="#0F172A"/><circle cx="38" cy="29" r="2.5" fill="#0F172A"/>`);
      parts.push(`<ellipse cx="32.5" cy="37" rx="8" ry="5" fill="#FBCFE8" stroke="#1E293B" stroke-width="1.4"/>`);
      break;
    case 'dino':
      parts.push(`<polygon points="22,15 27,8 30,16" fill="#FACC15" stroke="#1E293B" stroke-width="1.5"/>`);
      parts.push(`<polygon points="31,13 36,6 39,14" fill="#F59E0B" stroke="#1E293B" stroke-width="1.5"/>`);
      parts.push(`<path d="M16 49 L16 26 Q18 14 34 15 Q48 16 49 27 Q49 34 40 35 L42 49 Z" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="39" cy="22" r="2.6" fill="#FFF"/><circle cx="39.5" cy="22" r="1.2" fill="#0F172A"/>`);
      parts.push(`<path d="M36 29 L48 29" stroke="#1E293B" stroke-width="1.6"/>`);
      break;
    case 'octopus':
      parts.push(`<circle cx="32" cy="25" r="14" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<path d="M18 35 Q12 48 18 52 M25 37 Q22 50 27 53 M39 37 Q42 50 37 53 M46 35 Q52 48 46 52" stroke="${c}" stroke-width="4.5" stroke-linecap="round" fill="none"/>`);
      parts.push(`<circle cx="27" cy="25" r="2.5" fill="#FFF"/><circle cx="27" cy="25" r="1.2" fill="#0F172A"/>`);
      parts.push(`<circle cx="37" cy="25" r="2.5" fill="#FFF"/><circle cx="37" cy="25" r="1.2" fill="#0F172A"/>`);
      break;
    case 'ufo':
      parts.push(`<ellipse cx="32" cy="26" rx="13" ry="11" fill="#BAE6FD" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<ellipse cx="32" cy="34" rx="24" ry="8.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<circle cx="17" cy="34" r="2.3" fill="#FACC15"/><circle cx="32" cy="36" r="2.3" fill="#FACC15"/><circle cx="47" cy="34" r="2.3" fill="#FACC15"/>`);
      parts.push(`<polygon points="24,42 40,42 47,56 17,56" fill="#38BDF8" opacity="0.32"/>`);
      break;
    case 'submarine':
      parts.push(`<rect x="29" y="13" width="5" height="10" fill="#475569" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<rect x="29" y="12" width="10" height="4" rx="2" fill="#FACC15" stroke="#1E293B" stroke-width="1.5"/>`);
      parts.push(`<ellipse cx="32" cy="35" rx="21" ry="12" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<circle cx="23" cy="35" r="4" fill="#E0F2FE" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<circle cx="36" cy="35" r="4" fill="#E0F2FE" stroke="#1E293B" stroke-width="1.6"/>`);
      break;
    case 'skateboard':
      parts.push(`<rect x="9" y="30" width="46" height="9" rx="4.5" transform="rotate(-12 32 34)" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="19" cy="44" r="4.8" fill="#FACC15" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<circle cx="45" cy="38" r="4.8" fill="#FACC15" stroke="#1E293B" stroke-width="1.8"/>`);
      break;
    case 'guitar':
      parts.push(`<rect x="30" y="7" width="4.5" height="24" fill="#78350F" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<circle cx="32" cy="34" r="9" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="32" cy="45" r="12" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="32" cy="41" r="4" fill="#1E293B"/>`);
      break;
    case 'piano':
      parts.push(`<rect x="11" y="22" width="42" height="28" rx="4" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<rect x="14" y="34" width="36" height="12" fill="#FFF" stroke="#1E293B" stroke-width="1.5"/>`);
      [19, 25, 33, 39, 44].forEach((kx) => parts.push(`<rect x="${kx}" y="34" width="3.5" height="7" fill="#0F172A"/>`));
      break;
    case 'telescope':
      parts.push(`<line x1="32" y1="32" x2="21" y2="54" stroke="#475569" stroke-width="3" stroke-linecap="round"/>`);
      parts.push(`<line x1="32" y1="32" x2="43" y2="54" stroke="#475569" stroke-width="3" stroke-linecap="round"/>`);
      parts.push(`<rect x="14" y="21" width="36" height="10" rx="3" transform="rotate(-24 32 26)" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="48" cy="19" r="5" fill="#BAE6FD" stroke="#1E293B" stroke-width="1.8"/>`);
      break;
    case 'chest':
      parts.push(`<rect x="13" y="27" width="38" height="24" rx="4" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<path d="M13 28 Q32 14 51 28 Z" fill="${ac}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<rect x="29" y="26" width="6" height="9" rx="1.5" fill="#FACC15" stroke="#1E293B" stroke-width="1.5"/>`);
      break;
    case 'potion':
      parts.push(`<rect x="27" y="11" width="10" height="7" rx="2" fill="#92400E" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<rect x="25" y="18" width="14" height="7" fill="#E2E8F0" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<circle cx="32" cy="39" r="15" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<circle cx="27" cy="34" r="3" fill="#FFF" opacity="0.7"/>`);
      break;
    case 'sword':
      parts.push(`<polygon points="32,7 37,37 27,37" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<rect x="20" y="37" width="24" height="5" rx="2" fill="#FACC15" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<rect x="29" y="42" width="6" height="12" rx="2" fill="#78350F" stroke="#1E293B" stroke-width="1.8"/>`);
      break;
    case 'cake':
      parts.push(`<rect x="15" y="33" width="34" height="19" rx="4" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<path d="M15 33 Q23 39 32 33 Q41 39 49 33 L49 26 L15 26 Z" fill="#FFF" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<circle cx="32" cy="21" r="4.5" fill="#EF4444" stroke="#1E293B" stroke-width="1.6"/>`);
      break;
    case 'volcano':
      parts.push(`<polygon points="10,52 24,22 40,22 54,52" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<path d="M24 22 Q32 10 40 22" fill="#F97316" stroke="#DC2626" stroke-width="2"/>`);
      parts.push(`<circle cx="32" cy="12" r="4" fill="#FACC15"/>`);
      break;
    case 'treehouse':
      parts.push(`<rect x="26" y="34" width="12" height="20" fill="#78350F" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="32" cy="25" r="17" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<rect x="23" y="20" width="18" height="14" rx="2" fill="#FEF3C7" stroke="#1E293B" stroke-width="1.6"/>`);
      break;
    case 'robot':
      parts.push(`<line x1="32" y1="8" x2="32" y2="15" stroke="#1E293B" stroke-width="2"/><circle cx="32" cy="7" r="3" fill="#EF4444"/>`);
      parts.push(`<rect x="19" y="15" width="26" height="18" rx="4" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<rect x="17" y="35" width="30" height="18" rx="4" fill="${ac}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="26" cy="24" r="3" fill="#38BDF8"/><circle cx="38" cy="24" r="3" fill="#38BDF8"/>`);
      break;
    case 'bird':
      parts.push(`<ellipse cx="32" cy="36" rx="14" ry="15" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<circle cx="27" cy="29" r="3.5" fill="#FFF" stroke="#1E293B" stroke-width="1.3"/><circle cx="27" cy="29" r="1.5" fill="#0F172A"/>`);
      parts.push(`<circle cx="37" cy="29" r="3.5" fill="#FFF" stroke="#1E293B" stroke-width="1.3"/><circle cx="37" cy="29" r="1.5" fill="#0F172A"/>`);
      parts.push(`<polygon points="29,33 35,33 32,38" fill="#F59E0B" stroke="#1E293B" stroke-width="1.3"/>`);
      break;
    case 'butterfly':
      parts.push(`<ellipse cx="20" cy="26" rx="11" ry="13" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<ellipse cx="44" cy="26" rx="11" ry="13" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<ellipse cx="22" cy="42" rx="8" ry="9" fill="${ac}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<ellipse cx="42" cy="42" rx="8" ry="9" fill="${ac}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<rect x="29.5" y="18" width="5" height="30" rx="2.5" fill="#1E293B"/>`);
      break;
    case 'throne':
      parts.push(`<rect x="18" y="13" width="28" height="30" rx="6" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<rect x="15" y="37" width="34" height="14" rx="4" fill="${ac}" stroke="#1E293B" stroke-width="2"/>`);
      break;
    case 'clock':
      parts.push(`<circle cx="32" cy="33" r="18" fill="${fillMain}" stroke="#1E293B" stroke-width="2.2"/>`);
      parts.push(`<circle cx="32" cy="33" r="13" fill="#FFF" stroke="#1E293B" stroke-width="1.5"/>`);
      parts.push(`<line x1="32" y1="33" x2="32" y2="23" stroke="#1E293B" stroke-width="2.2" stroke-linecap="round"/>`);
      parts.push(`<line x1="32" y1="33" x2="40" y2="36" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>`);
      break;
    case 'crown':
      parts.push(`<polygon points="12,44 16,18 26,30 32,14 38,30 48,18 52,44" fill="${fillMain}" stroke="#1E293B" stroke-width="2.2" stroke-linejoin="round"/>`);
      parts.push(`<circle cx="32" cy="33" r="3.5" fill="#EF4444"/>`);
      break;
    case 'table':
      parts.push(`<rect x="8" y="30" width="48" height="9" rx="3.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<rect x="15" y="39" width="5" height="16" fill="#78350F" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<rect x="44" y="39" width="5" height="16" fill="#78350F" stroke="#1E293B" stroke-width="1.6"/>`);
      break;
    case 'fish':
      parts.push(`<ellipse cx="28" cy="33" rx="18" ry="12.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<polygon points="44,33 59,21 55,33 59,45" fill="${ac}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="17" cy="30" r="3.4" fill="#FFF" stroke="#1E293B" stroke-width="1.2"/><circle cx="16.2" cy="30" r="1.6" fill="#0F172A"/>`);
      break;
    case 'cat':
      parts.push(`<polygon points="16,25 20,10 29,20" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<polygon points="48,25 44,10 35,20" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="32" cy="35" r="16.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<circle cx="26" cy="33" r="2.6" fill="#0F172A"/><circle cx="38" cy="33" r="2.6" fill="#0F172A"/>`);
      parts.push(`<polygon points="30,36.5 34,36.5 32,39.5" fill="#F43F5E"/>`);
      break;
    case 'rocket':
      parts.push(`<polygon points="26,46 32,58 38,46" fill="#F97316"/>`);
      parts.push(`<path d="M32 9 Q45 23 42 46 L22 46 Q19 23 32 9 Z" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<polygon points="22,35 12,47 22,46" fill="${ac}" stroke="#1E293B" stroke-width="1.9"/>`);
      parts.push(`<polygon points="42,35 52,47 42,46" fill="${ac}" stroke="#1E293B" stroke-width="1.9"/>`);
      parts.push(`<circle cx="32" cy="28" r="6" fill="#E0F2FE" stroke="#1E293B" stroke-width="2"/>`);
      break;
    case 'lamp':
      parts.push(`<rect x="22" y="47" width="20" height="7" rx="3" fill="#475569" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<rect x="29.5" y="36" width="5" height="11" fill="#CBD5E1" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<polygon points="16,36 48,36 41,15 23,15" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      break;
    case 'dragon':
      parts.push(`<ellipse cx="32" cy="37" rx="15" ry="13" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<circle cx="32" cy="21" r="10.5" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<polygon points="24,13 21,5 29,11" fill="#FACC15" stroke="#1E293B" stroke-width="1.6"/>`);
      parts.push(`<polygon points="40,13 43,5 35,11" fill="#FACC15" stroke="#1E293B" stroke-width="1.6"/>`);
      break;
    case 'car':
      // Sleek detailed sports car centered at x=16..48 so wings/boosters remain prominently visible
      parts.push(`<path d="M15 39 L17 31 Q21 23 28 22 L38 22 Q44 23 47 32 L49 39 Q50 45 45 45 L19 45 Q14 45 15 39 Z" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1" stroke-linejoin="round"/>`);
      parts.push(`<path d="M22 31 L25 24 L39 24 L43 31 Z" fill="#E0F2FE" stroke="#1E293B" stroke-width="1.5"/>`);
      parts.push(`<line x1="32" y1="24" x2="32" y2="45" stroke="#1E293B" stroke-width="1.2" opacity="0.5"/>`);
      parts.push(`<rect x="14" y="36" width="4" height="3" rx="1" fill="#EF4444"/>`);
      parts.push(`<rect x="46" y="36" width="4.5" height="3.2" rx="1" fill="#FEF08A" stroke="#F59E0B" stroke-width="0.8"/>`);
      parts.push(`<path d="M13 31 L18 28 L18 33 Z" fill="${ac}" stroke="#1E293B" stroke-width="1.3"/>`);
      parts.push(`<circle cx="22" cy="45.5" r="5.3" fill="#0F172A" stroke="#CBD5E1" stroke-width="1.6"/>`);
      parts.push(`<circle cx="22" cy="45.5" r="2" fill="#94A3B8"/>`);
      parts.push(`<circle cx="42" cy="45.5" r="5.3" fill="#0F172A" stroke="#CBD5E1" stroke-width="1.6"/>`);
      parts.push(`<circle cx="42" cy="45.5" r="2" fill="#94A3B8"/>`);
      break;
    case 'truck':
      parts.push(`<rect x="13" y="24" width="23" height="19" rx="3" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<path d="M36 29 L46 29 L50 35 L50 43 L36 43 Z" fill="${ac}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<rect x="39" y="31" width="7" height="6" rx="1" fill="#E0F2FE" stroke="#1E293B" stroke-width="1.3"/>`);
      parts.push(`<circle cx="21" cy="45" r="5" fill="#0F172A" stroke="#CBD5E1" stroke-width="1.5"/>`);
      parts.push(`<circle cx="43" cy="45" r="5" fill="#0F172A" stroke="#CBD5E1" stroke-width="1.5"/>`);
      break;
    case 'train':
      parts.push(`<rect x="20" y="19" width="6" height="8" fill="#1E293B"/>`);
      parts.push(`<ellipse cx="23" cy="14" rx="5" ry="3.5" fill="#E2E8F0" opacity="0.85"/>`);
      parts.push(`<rect x="14" y="26" width="35" height="17" rx="4" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<rect x="33" y="20" width="14" height="10" rx="2" fill="${ac}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<circle cx="21" cy="45" r="4.5" fill="#0F172A" stroke="#FACC15" stroke-width="1.4"/>`);
      parts.push(`<circle cx="32" cy="45" r="4.5" fill="#0F172A" stroke="#FACC15" stroke-width="1.4"/>`);
      parts.push(`<circle cx="43" cy="45" r="4.5" fill="#0F172A" stroke="#FACC15" stroke-width="1.4"/>`);
      break;
    case 'motorbike':
      parts.push(`<circle cx="19" cy="43" r="7" fill="none" stroke="#0F172A" stroke-width="3.2"/>`);
      parts.push(`<circle cx="45" cy="43" r="7" fill="none" stroke="#0F172A" stroke-width="3.2"/>`);
      parts.push(`<path d="M19 43 L28 31 L40 31 L45 43 M36 26 L42 25" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`);
      parts.push(`<ellipse cx="30" cy="30" rx="9" ry="4" fill="${fillMain}" stroke="#1E293B" stroke-width="1.8"/>`);
      break;
    case 'gift':
      parts.push(`<rect x="15" y="25" width="34" height="27" rx="4" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<rect x="13" y="21" width="38" height="7" rx="2" fill="${ac}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<rect x="29" y="21" width="6" height="31" fill="#FACC15" stroke="#1E293B" stroke-width="1.3"/>`);
      parts.push(`<path d="M32 21 Q22 11 26 21 Q42 11 32 21" fill="#F43F5E" stroke="#1E293B" stroke-width="1.6"/>`);
      break;
    case 'wand':
      parts.push(`<line x1="15" y1="51" x2="42" y2="24" stroke="#78350F" stroke-width="4.2" stroke-linecap="round"/>`);
      parts.push(`<polygon points="44,12 47,19 54,20 48,25 50,32 44,28 38,32 40,25 34,20 41,19" fill="#FACC15" stroke="#1E293B" stroke-width="1.8"/>`);
      break;
    case 'planet':
      parts.push(`<circle cx="32" cy="33" r="14" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<ellipse cx="32" cy="34" rx="26" ry="7" transform="rotate(-18 32 34)" fill="none" stroke="${ac}" stroke-width="4"/>`);
      parts.push(`<ellipse cx="32" cy="34" rx="26" ry="7" transform="rotate(-18 32 34)" fill="none" stroke="#1E293B" stroke-width="1.2"/>`);
      break;
    case 'snowman':
      parts.push(`<circle cx="32" cy="43" r="13" fill="#FFF" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="32" cy="24" r="9.5" fill="#FFF" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<polygon points="32,24 41,26 32,28" fill="#F97316"/>`);
      parts.push(`<rect x="24" y="10" width="16" height="6" rx="1" fill="#1E293B"/>`);
      parts.push(`<rect x="20" y="15" width="24" height="3" rx="1" fill="#1E293B"/>`);
      break;
    case 'frog':
      parts.push(`<ellipse cx="32" cy="37" rx="16" ry="13" fill="${spec.material === 'crystal' ? '#22C55E' : fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<circle cx="24" cy="24" r="5.5" fill="${spec.material === 'crystal' ? '#22C55E' : fillMain}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<circle cx="40" cy="24" r="5.5" fill="${spec.material === 'crystal' ? '#22C55E' : fillMain}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<circle cx="24" cy="24" r="2.2" fill="#0F172A"/><circle cx="40" cy="24" r="2.2" fill="#0F172A"/>`);
      parts.push(`<path d="M24 38 Q32 44 40 38" fill="none" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>`);
      break;
    case 'penguin':
      parts.push(`<ellipse cx="32" cy="36" rx="15" ry="18" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<ellipse cx="32" cy="39" rx="10" ry="13" fill="#FFF"/>`);
      parts.push(`<circle cx="27" cy="27" r="2" fill="#FFF"/><circle cx="37" cy="27" r="2" fill="#FFF"/>`);
      parts.push(`<polygon points="29,31 35,31 32,36" fill="#F59E0B"/>`);
      break;
    case 'bunny':
      parts.push(`<ellipse cx="25" cy="17" rx="4.2" ry="11" fill="${fillMain}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<ellipse cx="39" cy="17" rx="4.2" ry="11" fill="${fillMain}" stroke="#1E293B" stroke-width="1.8"/>`);
      parts.push(`<circle cx="32" cy="37" r="14" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<circle cx="27" cy="35" r="2" fill="#0F172A"/><circle cx="37" cy="35" r="2" fill="#0F172A"/>`);
      parts.push(`<polygon points="30,38 34,38 32,41" fill="#F43F5E"/>`);
      break;
    case 'fox':
      parts.push(`<polygon points="17,27 16,12 29,21" fill="${fillMain}" stroke="#1E293B" stroke-width="1.9"/>`);
      parts.push(`<polygon points="47,27 48,12 35,21" fill="${fillMain}" stroke="#1E293B" stroke-width="1.9"/>`);
      parts.push(`<circle cx="32" cy="36" r="15" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<ellipse cx="32" cy="41" rx="8" ry="5" fill="#FFF"/>`);
      parts.push(`<circle cx="32" cy="39" r="2" fill="#0F172A"/>`);
      break;
    case 'panda':
      parts.push(`<circle cx="20" cy="22" r="5.5" fill="#0F172A"/><circle cx="44" cy="22" r="5.5" fill="#0F172A"/>`);
      parts.push(`<circle cx="32" cy="36" r="15" fill="#FFF" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<ellipse cx="26" cy="34" rx="4" ry="5" fill="#0F172A"/><ellipse cx="38" cy="34" rx="4" ry="5" fill="#0F172A"/>`);
      parts.push(`<circle cx="26" cy="34" r="1.4" fill="#FFF"/><circle cx="38" cy="34" r="1.4" fill="#FFF"/>`);
      break;
    case 'phoenix':
      parts.push(`<polygon points="32,8 27,18 32,15 37,18" fill="#FACC15" stroke="#DC2626" stroke-width="1.6"/>`);
      parts.push(`<ellipse cx="32" cy="36" rx="14" ry="15" fill="#EF4444" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<ellipse cx="32" cy="40" rx="8" ry="9" fill="#FACC15"/>`);
      parts.push(`<polygon points="29,29 35,29 32,34" fill="#FACC15" stroke="#1E293B" stroke-width="1.2"/>`);
      break;
    case 'drum':
      parts.push(`<rect x="15" y="25" width="34" height="24" rx="4" fill="${fillMain}" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<ellipse cx="32" cy="25" rx="17" ry="6" fill="#FFF" stroke="#1E293B" stroke-width="2"/>`);
      parts.push(`<line x1="17" y1="30" x2="27" y2="48" stroke="#FACC15" stroke-width="2"/>`);
      parts.push(`<line x1="37" y1="30" x2="47" y2="48" stroke="#FACC15" stroke-width="2"/>`);
      break;
    case 'castle':
    case 'shelf':
      parts.push(`<rect x="15" y="26" width="34" height="27" rx="2" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<polygon points="13,26 21,12 29,26" fill="${ac}" stroke="#1E293B" stroke-width="1.9"/>`);
      parts.push(`<polygon points="35,26 43,12 51,26" fill="${ac}" stroke="#1E293B" stroke-width="1.9"/>`);
      parts.push(`<path d="M27 53 L27 42 A5 5 0 0 1 37 42 L37 53 Z" fill="#1E293B"/>`);
      break;
    default:
      parts.push(`<polygon points="32,9 49,27 41,53 23,53 15,27" fill="${fillMain}" stroke="#1E293B" stroke-width="2.1"/>`);
      parts.push(`<polygon points="32,14 42,27 32,47 22,27" fill="${ac}" opacity="0.8"/>`);
  }

  // Foreground wing collar joints so wings clearly look attached to cars/ships/objects
  if (spec.hasWings) {
    parts.push(`<circle cx="21" cy="34" r="3" fill="${ac}" stroke="#1E293B" stroke-width="1.4"/>`);
    parts.push(`<circle cx="43" cy="34" r="3" fill="${ac}" stroke="#1E293B" stroke-width="1.4"/>`);
  }

  if (spec.hasExhaust) {
    parts.push(`<polygon points="14,39 5,36 7,42" fill="#F97316"/>`);
    parts.push(`<polygon points="14,43 7,42 8,46" fill="#FACC15"/>`);
  }

  if (spec.hasPropeller) {
    parts.push(`<line x1="32" y1="20" x2="32" y2="12" stroke="#1E293B" stroke-width="2"/>`);
    parts.push(`<ellipse cx="24" cy="12" rx="9" ry="2.5" fill="#94A3B8" stroke="#1E293B" stroke-width="1.4"/>`);
    parts.push(`<ellipse cx="40" cy="12" rx="9" ry="2.5" fill="#94A3B8" stroke="#1E293B" stroke-width="1.4"/>`);
  }

  // Optional overlay wheels (when prompt asks for wheels on a non-car/non-bicycle object)
  if (spec.hasWheels && !['bicycle', 'car', 'skateboard', 'truck', 'train', 'motorbike'].includes(spec.primaryShape)) {
    parts.push(`<circle cx="22" cy="51" r="5" fill="#0F172A" stroke="#FACC15" stroke-width="1.8"/>`);
    parts.push(`<circle cx="42" cy="51" r="5" fill="#0F172A" stroke="#FACC15" stroke-width="1.8"/>`);
  }

  if (spec.hasHalo) {
    parts.push(`<ellipse cx="32" cy="9" rx="12" ry="3.2" fill="none" stroke="#FACC15" stroke-width="2.5"/>`);
  }

  if (spec.hasCrown && spec.primaryShape !== 'crown') {
    parts.push(`<polygon points="22,13 25,5 32,10 39,5 42,13" fill="#FACC15" stroke="#1E293B" stroke-width="1.6" stroke-linejoin="round"/>`);
  }

  if (spec.hasGlasses) {
    parts.push(`<rect x="20" y="25" width="10" height="6" rx="2" fill="#0F172A" stroke="#FACC15" stroke-width="1.3"/>`);
    parts.push(`<rect x="34" y="25" width="10" height="6" rx="2" fill="#0F172A" stroke="#FACC15" stroke-width="1.3"/>`);
    parts.push(`<line x1="30" y1="28" x2="34" y2="28" stroke="#FACC15" stroke-width="1.5"/>`);
  }

  return parts.join('');
}

const labSvgImgCache = new Map<string, HTMLImageElement>();

export function getLabItemCanvasImage(item: CustomLabItem): HTMLImageElement | null {
  if (!item || !item.svgMarkup) return null;
  const cached = labSvgImgCache.get(item.id);
  if (cached) return cached;

  const img = new Image();
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-6 -6 76 76">${item.svgMarkup}</svg>`;
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fullSvg)}`;
  labSvgImgCache.set(item.id, img);
  return img;
}

export function drawProceduralLabItemOnCanvas(c: CanvasRenderingContext2D, spec: LabItemSpec, customItem?: CustomLabItem) {
  if (!spec) return;
  const scale = spec.sizeScale || (spec.sizeTier ? LAB_SIZE_TIERS[spec.sizeTier]?.scale : 1) || 1;

  c.save();
  c.scale(scale, scale);

  // Use cached rasterized SVG so every single room slot shows the exact vector item artwork!
  if (customItem) {
    const img = getLabItemCanvasImage(customItem);
    if (img && img.complete && img.naturalWidth > 0) {
      c.drawImage(img, -30, -34, 60, 60);
      c.restore();
      return;
    }
  }

  c.strokeStyle = '#1E293B';
  c.lineWidth = 2;

  if (spec.hasStars) {
    c.fillStyle = spec.accent || '#BAE6FD';
    c.globalAlpha = 0.35;
    c.beginPath();
    c.arc(0, -2, 22, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }

  if (spec.hasWings) {
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.ellipse(-20, -8, 12, 6, -0.55, 0, Math.PI * 2);
    c.fill(); c.stroke();
    c.beginPath();
    c.ellipse(20, -8, 12, 6, 0.55, 0, Math.PI * 2);
    c.fill(); c.stroke();
  }

  c.fillStyle = spec.color || '#0EA5E9';
  switch (spec.primaryShape) {
    case 'car':
      c.beginPath(); c.roundRect(-18, -4, 36, 13, 5); c.fill(); c.stroke();
      c.fillStyle = '#E0F2FE';
      c.beginPath(); c.roundRect(-11, -12, 22, 9, 3); c.fill(); c.stroke();
      c.fillStyle = '#0F172A';
      c.beginPath(); c.arc(-10, 10, 5, 0, Math.PI * 2); c.arc(10, 10, 5, 0, Math.PI * 2); c.fill();
      break;
    case 'pencil':
      c.save();
      c.rotate(-0.45);
      c.fillStyle = spec.material === 'crystal' ? '#FACC15' : spec.color;
      c.fillRect(-4, -14, 8, 22); c.strokeRect(-4, -14, 8, 22);
      c.fillStyle = '#F472B6';
      c.fillRect(-4, -19, 8, 5); c.strokeRect(-4, -19, 8, 5);
      c.fillStyle = '#FDE68A';
      c.beginPath(); c.moveTo(-4, 8); c.lineTo(4, 8); c.lineTo(0, 16); c.closePath(); c.fill(); c.stroke();
      c.restore();
      break;
    case 'bicycle':
      c.strokeStyle = '#1E293B';
      c.beginPath(); c.arc(-11, 8, 7, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(11, 8, 7, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = spec.color;
      c.beginPath(); c.moveTo(-11, 8); c.lineTo(-2, -4); c.lineTo(9, -4); c.lineTo(11, 8); c.stroke();
      break;
    case 'ball':
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.arc(0, 0, 13, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#1E293B';
      c.beginPath(); c.arc(0, 0, 4.5, 0, Math.PI * 2); c.fill();
      break;
    case 'table':
      c.fillRect(-22, -4, 44, 8); c.strokeRect(-22, -4, 44, 8);
      c.fillStyle = '#78350F';
      c.fillRect(-16, 4, 5, 14); c.fillRect(11, 4, 5, 14);
      break;
    case 'fish':
      c.beginPath(); c.ellipse(-2, -2, 16, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = spec.accent || '#BAE6FD';
      c.beginPath(); c.moveTo(13, -2); c.lineTo(23, -10); c.lineTo(23, 6); c.closePath(); c.fill(); c.stroke();
      break;
    case 'ufo':
      c.fillStyle = '#BAE6FD';
      c.beginPath(); c.arc(0, -6, 10, Math.PI, 0); c.fill(); c.stroke();
      c.fillStyle = spec.color;
      c.beginPath(); c.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      break;
    case 'guitar':
      c.fillStyle = '#78350F';
      c.fillRect(-2, -22, 4, 18);
      c.fillStyle = spec.color;
      c.beginPath(); c.arc(0, 6, 11, 0, Math.PI * 2); c.fill(); c.stroke();
      break;
    case 'rocket':
      c.beginPath(); c.moveTo(0, -20); c.lineTo(9, 8); c.lineTo(-9, 8); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#F97316';
      c.beginPath(); c.moveTo(-5, 8); c.lineTo(5, 8); c.lineTo(0, 17); c.closePath(); c.fill();
      break;
    case 'star':
      c.fillStyle = '#FACC15';
      c.beginPath(); c.moveTo(0, -16); c.lineTo(5, -4); c.lineTo(16, -4); c.lineTo(7, 4); c.lineTo(10, 15); c.lineTo(0, 8); c.lineTo(-10, 15); c.lineTo(-7, 4); c.lineTo(-16, -4); c.lineTo(-5, -4); c.closePath(); c.fill(); c.stroke();
      break;
    default:
      c.beginPath(); c.roundRect(-13, -13, 26, 26, 7); c.fill(); c.stroke();
  }

  if (spec.hasCrown) {
    c.fillStyle = '#FACC15';
    c.beginPath();
    c.moveTo(-8, -16); c.lineTo(-4, -24); c.lineTo(0, -18); c.lineTo(4, -24); c.lineTo(8, -16);
    c.closePath(); c.fill();
  }
  c.restore();
}
