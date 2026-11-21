import { B2KSState, BuildingShape, Member, NavDestination, SoccerOnlineRoom, WeatherInfo } from '../types/b2ks';
import {
  formatFamilyBrand,
  HOUSE_WORLD,
  PLOTS,
  PRIVATE_ROOM_WORLD,
  resolveNeighborhoodLocations,
  ROOM_DECOR_SLOTS,
  STREET_WORLD
} from './constants';
import { drawProceduralLabItemOnCanvas } from './inventionLab';

export interface LightingInfo {
  phase: 'dawn' | 'day' | 'sunset' | 'night';
  label: string;
  skyTop: string;
  skyBottom: string;
  overlayAlpha: number;
  overlayColor: string;
  isNight: boolean;
}

export type StreetVehicleKind = 'car' | 'moto' | 'bus' | 'truck' | 'bike';

export interface StreetCar {
  axis: 'h' | 'v';
  x: number;
  y: number;
  speed: number;
  color: string;
  dir: number;
  kind?: StreetVehicleKind;
}

export interface HouseRoomDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  wall: string;
  floor: string;
  ownerIds: string[];
  isUnlocked: boolean;
  isDisabled?: boolean;
  doorSide: 'left' | 'right';
  wardrobe: { x: number; y: number } | null;
}

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  isEng: boolean
) {
  ctx.save();
  ctx.font = 'bold 12px Fredoka, sans-serif';
  const displayTxt = isEng ? `${text} (+5⭐)` : text;
  const maxW = 200;
  const words = displayTxt.split(' ');
  const lines: string[] = [];
  let curLine = '';
  words.forEach((w) => {
    const test = curLine ? curLine + ' ' + w : w;
    if (ctx.measureText(test).width > maxW) {
      if (curLine) lines.push(curLine);
      curLine = w;
    } else {
      curLine = test;
    }
  });
  if (curLine) lines.push(curLine);

  const boxW = Math.min(maxW + 20, Math.max(70, ...lines.map((l) => ctx.measureText(l).width + 20)));
  const boxH = lines.length * 16 + 12;
  const bx = x - boxW / 2;
  const by = y - boxH;

  ctx.fillStyle = isEng ? '#D4EDDA' : '#FFFFFF';
  ctx.strokeStyle = isEng ? '#28A745' : '#2C3E50';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x, y + 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2C3E50';
  ctx.textAlign = 'center';
  lines.forEach((line, idx) => {
    ctx.fillText(line, x, by + 16 + idx * 16);
  });
  ctx.restore();
}

export function drawDetailedChibiOnContext(
  c: CanvasRenderingContext2D,
  member: Partial<Member> & { x: number; y: number; name: string },
  isMe: boolean,
  scale = 1,
  isMainCanvas = false,
  isMovingNow = false
) {
  c.save();
  c.translate(member.x, member.y);
  c.scale(scale, scale);

  const now = Date.now();
  const isMoving = isMainCanvas && isMovingNow;
  const phase = now / 78;
  const walkCycle = isMoving ? Math.sin(phase) : 0;
  const bob = isMoving ? -Math.abs(Math.sin(phase)) * 3.8 : Math.sin(now / 420) * 0.55;
  const sway = isMoving ? Math.sin(phase) * 0.045 : 0;
  const hairSway = isMoving ? Math.sin(phase + 0.6) * 2.2 : Math.sin(now / 520) * 0.6;
  const isBlinking = isMainCanvas && ((now + member.name.length * 410) % 3400) > 3270;

  const isAdult =
    member.role === 'Bố' ||
    member.role === 'Mẹ' ||
    member.id === 'dad' ||
    member.id === 'mom';
  const legBonus = isAdult ? 6 : 0;
  const torsoBonus = isAdult ? 6 : 0;
  const upperShift = legBonus + torsoBonus;
  const torsoHalfW = isAdult ? (member.role === 'Bố' || member.id === 'dad' ? 13 : 12) : 11.5;

  c.lineWidth = 2.4;
  c.strokeStyle = '#2C3E50';

  // Pulsing ground shadow & subtle walk dust puffs
  const shadowScale = isMoving ? 1 - Math.abs(bob) * 0.04 : 1;
  c.fillStyle = 'rgba(0,0,0,0.24)';
  c.beginPath();
  c.ellipse(0, 27, (isAdult ? 17.5 : 16) * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
  c.fill();

  if (isMoving) {
    const puff = (now % 260) / 260;
    c.fillStyle = `rgba(255,255,255,${(0.45 * (1 - puff)).toFixed(2)})`;
    c.beginPath();
    c.arc(-walkCycle * 6, 26 - puff * 6, 3.2 * (1 - puff * 0.5), 0, Math.PI * 2);
    c.fill();
  }

  const leftLegY = 14 + walkCycle * 4.5;
  const rightLegY = 14 - walkCycle * 4.5;
  const pStyle = member.pantsStyle || 'pants';

  if (pStyle === 'skirt') {
    c.fillStyle = '#FFE0BD';
    c.beginPath(); c.roundRect(-8, leftLegY + 2 - legBonus * 0.4, 6.5, 8 + legBonus * 0.4, 2); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(1.5, rightLegY + 2 - legBonus * 0.4, 6.5, 8 + legBonus * 0.4, 2); c.fill(); c.stroke();
    c.fillStyle = member.pantsColor || '#8E44AD';
    c.beginPath();
    c.moveTo(-11, 12 - legBonus + bob);
    c.lineTo(11, 12 - legBonus + bob);
    c.lineTo(15.5 + sway * 14, 21 - legBonus * 0.25 + bob);
    c.lineTo(-15.5 + sway * 14, 21 - legBonus * 0.25 + bob);
    c.closePath();
    c.fill();
    c.stroke();
  } else if (pStyle === 'shorts') {
    c.fillStyle = '#FFE0BD';
    c.beginPath(); c.roundRect(-8.5, leftLegY + 3 - legBonus * 0.4, 7, 7 + legBonus * 0.4, 2); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(1.5, rightLegY + 3 - legBonus * 0.4, 7, 7 + legBonus * 0.4, 2); c.fill(); c.stroke();
    c.fillStyle = member.pantsColor || '#117864';
    c.beginPath(); c.roundRect(-10, 12 - legBonus + bob, 9, 7 + legBonus * 0.45, 2); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(1, 12 - legBonus + bob, 9, 7 + legBonus * 0.45, 2); c.fill(); c.stroke();
  } else {
    c.fillStyle = member.pantsColor || '#34495E';
    c.beginPath(); c.roundRect(-9, leftLegY - legBonus, 7.5, 10 + legBonus, 2); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(1.5, rightLegY - legBonus, 7.5, 10 + legBonus, 2); c.fill(); c.stroke();
  }

  // Shoes
  c.fillStyle = '#E74C3C';
  c.beginPath(); c.roundRect(-10.5, leftLegY + 7, 9, 5, 2); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(1.5, rightLegY + 7, 9, 5, 2); c.fill(); c.stroke();
  c.fillStyle = '#FFFFFF';
  c.fillRect(-9.5, leftLegY + 10.5, 7, 1.5);
  c.fillRect(2.5, rightLegY + 10.5, 7, 1.5);

  // Subtle torso/head sway when walking
  c.rotate(sway);

  const armShiftX = isAdult ? 1.5 : 0;
  const leftArmY = -2 - upperShift - walkCycle * 4.5;
  const rightArmY = -2 - upperShift + walkCycle * 4.5;
  c.fillStyle = member.shirtColor || '#3498DB';
  c.beginPath(); c.roundRect(-16.5 - armShiftX, leftArmY + bob, 5.5, 8 + torsoBonus * 0.6, 2.5); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(11 + armShiftX, rightArmY + bob, 5.5, 8 + torsoBonus * 0.6, 2.5); c.fill(); c.stroke();
  c.fillStyle = '#FFE0BD';
  c.beginPath(); c.arc(-13.8 - armShiftX, leftArmY + 9 + torsoBonus * 0.6 + bob, 3, 0, Math.PI * 2); c.fill(); c.stroke();
  c.beginPath(); c.arc(13.8 + armShiftX, rightArmY + 9 + torsoBonus * 0.6 + bob, 3, 0, Math.PI * 2); c.fill(); c.stroke();

  // Torso highlight & depth
  c.fillStyle = member.shirtColor || '#3498DB';
  c.beginPath();
  c.roundRect(-torsoHalfW, -3 - upperShift + bob, torsoHalfW * 2, 18 + torsoBonus, 5);
  c.fill();
  c.stroke();

  c.fillStyle = 'rgba(255,255,255,0.16)';
  c.beginPath();
  c.roundRect(-torsoHalfW + 2, -1 - upperShift + bob, torsoHalfW * 2 - 4, 6, 3);
  c.fill();

  const dir = member.dir || 'down';
  const pat = member.shirtPattern || 'collar';
  if (dir !== 'up') {
    if (pat === 'stripe') {
      c.fillStyle = 'rgba(255,255,255,0.6)';
      c.fillRect(-(torsoHalfW - 1.5), 4 - upperShift + torsoBonus * 0.35 + bob, (torsoHalfW - 1.5) * 2, 4);
    } else if (pat === 'vest') {
      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.moveTo(-4, -3 - upperShift + bob); c.lineTo(0, 7 - upperShift + torsoBonus * 0.4 + bob); c.lineTo(4, -3 - upperShift + bob);
      c.closePath(); c.fill();
    } else if (pat === 'star') {
      c.fillStyle = '#FFE66D';
      c.font = '10px Arial'; c.textAlign = 'center';
      c.fillText('★', 0, 9 - upperShift + torsoBonus * 0.35 + bob);
    } else if (pat === 'heart') {
      c.fillStyle = '#FFCDD2';
      c.font = '10px Arial'; c.textAlign = 'center';
      c.fillText('♥', 0, 9 - upperShift + torsoBonus * 0.35 + bob);
    } else {
      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.moveTo(-5, -3 - upperShift + bob); c.lineTo(0, 2 - upperShift + bob); c.lineTo(5, -3 - upperShift + bob);
      c.closePath(); c.fill();
    }
  }

  // Back hair layer
  const hColor = member.hairColor || '#2C3E50';
  const hStyle = member.hairStyle || 'short';
  const headBob = bob - upperShift;
  c.fillStyle = hColor;
  if (hStyle === 'long') {
    c.beginPath();
    c.roundRect(-19, -25 + headBob, 38, 32, 10);
    c.fill(); c.stroke();
  } else if (hStyle === 'wavy') {
    c.beginPath();
    c.moveTo(-18, -22 + headBob);
    c.quadraticCurveTo(-23 + hairSway, -8 + headBob, -18, 8 + headBob);
    c.lineTo(18, 8 + headBob);
    c.quadraticCurveTo(23 + hairSway, -8 + headBob, 18, -22 + headBob);
    c.closePath();
    c.fill(); c.stroke();
  } else if (hStyle === 'bob') {
    c.beginPath();
    c.roundRect(-19, -24 + headBob, 38, 22, 11);
    c.fill(); c.stroke();
  } else if (hStyle === 'curly') {
    [[-16, -18], [16, -18], [-13, -29], [13, -29], [0, -33]].forEach(([cx, cy]) => {
      c.beginPath();
      c.arc(cx + hairSway * 0.3, cy + headBob, 8.5, 0, Math.PI * 2);
      c.fill(); c.stroke();
    });
  } else if (hStyle === 'pigtails') {
    c.beginPath();
    c.arc(-19 + hairSway * 0.4, -18 + headBob, 7.8, 0, Math.PI * 2);
    c.arc(19 + hairSway * 0.4, -18 + headBob, 7.8, 0, Math.PI * 2);
    c.fill(); c.stroke();
    c.fillStyle = '#FF6B6B';
    c.beginPath();
    c.arc(-14.5, -20 + headBob, 2.8, 0, Math.PI * 2);
    c.arc(14.5, -20 + headBob, 2.8, 0, Math.PI * 2);
    c.fill();
  } else if (hStyle === 'ponytail') {
    c.beginPath();
    c.moveTo(4, -33 + headBob);
    c.quadraticCurveTo(23 + hairSway, -34 + headBob, 22 + hairSway, -12 + headBob);
    c.quadraticCurveTo(17 + hairSway, -6 + headBob, 14, -14 + headBob);
    c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = '#FACC15';
    c.fillRect(0, -35 + headBob, 7, 4);
  } else if (hStyle === 'bun') {
    c.beginPath();
    c.arc(-12, -33 + headBob, 7.5, 0, Math.PI * 2);
    c.arc(12, -33 + headBob, 7.5, 0, Math.PI * 2);
    c.fill(); c.stroke();
    c.strokeStyle = '#EC4899';
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(-15, -28 + headBob); c.lineTo(-8, -30 + headBob);
    c.moveTo(8, -30 + headBob); c.lineTo(15, -28 + headBob);
    c.stroke();
    c.strokeStyle = '#2C3E50';
    c.lineWidth = 2.4;
  } else if (hStyle === 'braids') {
    [[-16, -12, 4.4], [-17 + hairSway * 0.4, -4, 4], [-17.5 + hairSway * 0.6, 3, 3.4],
     [16, -12, 4.4], [17 + hairSway * 0.4, -4, 4], [17.5 + hairSway * 0.6, 3, 3.4]].forEach(([bx, by, br]) => {
      c.beginPath(); c.arc(bx, by + headBob, br, 0, Math.PI * 2); c.fill(); c.stroke();
    });
    c.fillStyle = '#38BDF8';
    c.beginPath();
    c.arc(-17 + hairSway * 0.5, 0 + headBob, 2.2, 0, Math.PI * 2);
    c.arc(17 + hairSway * 0.5, 0 + headBob, 2.2, 0, Math.PI * 2);
    c.fill();
  }

  // Side ears
  if (dir === 'left' || dir === 'right') {
    const earX = dir === 'left' ? 14.5 : -14.5;
    c.fillStyle = '#FAD3A5';
    c.beginPath();
    c.arc(earX, -17 + headBob, 4.2, 0, Math.PI * 2);
    c.fill(); c.stroke();
  }

  // Head
  c.fillStyle = '#FFE0BD';
  c.beginPath();
  c.arc(0, -18 + headBob, 16.5, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  if (dir === 'up') {
    // Full back-of-head hair silhouette when walking away
    c.fillStyle = hColor;
    c.beginPath();
    c.arc(0, -18.5 + headBob, 17, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    if (hStyle === 'spiky') {
      c.beginPath();
      c.moveTo(-13, -29 + headBob); c.lineTo(-8, -39 + headBob); c.lineTo(-2, -32 + headBob);
      c.lineTo(0, -42 + headBob); c.lineTo(3, -32 + headBob); c.lineTo(10, -39 + headBob);
      c.lineTo(14, -29 + headBob); c.closePath(); c.fill(); c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,0.28)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, -21 + headBob, 11.5, 1.15 * Math.PI, 1.8 * Math.PI);
    c.stroke();
  } else {
    let eyeOffsetX = 0;
    if (dir === 'left') eyeOffsetX = -3.2;
    if (dir === 'right') eyeOffsetX = 3.2;

    // Eyebrows
    c.strokeStyle = hColor;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(-8.5 + eyeOffsetX, -24 + headBob); c.lineTo(-4 + eyeOffsetX, -24.5 + headBob);
    c.moveTo(4 + eyeOffsetX, -24.5 + headBob); c.lineTo(8.5 + eyeOffsetX, -24 + headBob);
    c.stroke();

    // Eyes (with blinking!)
    if (isBlinking) {
      c.strokeStyle = '#2C3E50';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-9 + eyeOffsetX, -18.5 + headBob); c.lineTo(-3 + eyeOffsetX, -18.5 + headBob);
      c.moveTo(3 + eyeOffsetX, -18.5 + headBob); c.lineTo(9 + eyeOffsetX, -18.5 + headBob);
      c.stroke();
    } else {
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.ellipse(-6 + eyeOffsetX, -18.5 + headBob, 3.2, 3.8, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(6 + eyeOffsetX, -18.5 + headBob, 3.2, 3.8, 0, 0, Math.PI * 2); c.fill();

      c.fillStyle = '#2C3E50';
      c.beginPath(); c.ellipse(-6 + eyeOffsetX, -18.5 + headBob, 2.3, 3, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(6 + eyeOffsetX, -18.5 + headBob, 2.3, 3, 0, 0, Math.PI * 2); c.fill();

      c.fillStyle = '#FFF';
      c.beginPath(); c.arc(-6.8 + eyeOffsetX, -19.8 + headBob, 1.1, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(5.2 + eyeOffsetX, -19.8 + headBob, 1.1, 0, Math.PI * 2); c.fill();
    }

    // Cheeks & smile
    c.fillStyle = 'rgba(255, 118, 117, 0.55)';
    c.beginPath(); c.ellipse(-10.5 + eyeOffsetX, -14 + headBob, 3.2, 1.8, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(10.5 + eyeOffsetX, -14 + headBob, 3.2, 1.8, 0, 0, Math.PI * 2); c.fill();

    c.strokeStyle = '#C0392B';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(eyeOffsetX, -13 + headBob, 3.5, 0.12 * Math.PI, 0.88 * Math.PI);
    c.stroke();

    // Front hair bangs
    c.fillStyle = hColor;
    c.strokeStyle = '#2C3E50';
    c.lineWidth = 2.4;
    c.beginPath();
    c.arc(0, -21 + headBob, 17, Math.PI, 0);
    if (hStyle === 'spiky') {
      c.lineTo(13, -40 + headBob);
      c.lineTo(5, -33 + headBob);
      c.lineTo(0, -42 + headBob);
      c.lineTo(-5, -33 + headBob);
      c.lineTo(-13, -39 + headBob);
    } else if (hStyle === 'sidepart') {
      c.quadraticCurveTo(10, -28 + headBob, 3, -24 + headBob);
      c.quadraticCurveTo(-7, -20 + headBob, -16.5, -21 + headBob);
    } else if (hStyle === 'undercut') {
      c.lineTo(14, -27 + headBob);
      c.quadraticCurveTo(3, -31 + headBob, -8, -25 + headBob);
      c.lineTo(-14, -27 + headBob);
    } else if (hStyle === 'curly') {
      c.quadraticCurveTo(11, -28 + headBob, 5, -23 + headBob);
      c.quadraticCurveTo(0, -29 + headBob, -5, -23 + headBob);
      c.quadraticCurveTo(-11, -28 + headBob, -16, -22 + headBob);
    } else {
      c.lineTo(14, -22 + headBob);
      c.lineTo(7, -26 + headBob);
      c.lineTo(0, -21 + headBob);
      c.lineTo(-7, -26 + headBob);
      c.lineTo(-14, -22 + headBob);
    }
    c.closePath();
    c.fill();
    c.stroke();

    if (hStyle === 'wavy') {
      c.fillStyle = '#FF6B6B';
      c.beginPath(); c.arc(11, -26 + headBob, 2.8, 0, Math.PI * 2); c.fill();
    }

    c.strokeStyle = 'rgba(255,255,255,0.32)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, -22 + headBob, 12, 1.2 * Math.PI, 1.75 * Math.PI);
    c.stroke();
  }

  if (member.outfit) {
    c.font = '21px Arial';
    c.textAlign = 'center';
    c.fillText(member.outfit, 0, -38 + headBob);
  }

  if (isMainCanvas) {
    c.fillStyle = isMe ? '#FF6B6B' : 'rgba(44, 62, 80, 0.9)';
    c.beginPath();
    c.roundRect(-34, -59 + headBob, 68, 17, 6);
    c.fill();
    c.fillStyle = '#FFF';
    c.font = 'bold 11px Fredoka, sans-serif';
    c.textAlign = 'center';
    c.fillText(member.name, 0, -47 + headBob);

    if (member.speech && Date.now() < member.speech.expiresAt) {
      drawSpeechBubble(c, 0, -69 + headBob, member.speech.text, member.speech.isEng);
    }
  }

  c.restore();
}

export function drawWorldDecorItem(
  c: CanvasRenderingContext2D,
  decorId: string,
  x: number,
  y: number,
  findAnyCatalogItem: (id: string) => any
) {
  c.save();
  c.translate(x, y);
  if (decorId === 'd_pc') {
    c.fillStyle = '#E74C3C';
    c.strokeStyle = '#2C3E50';
    c.lineWidth = 2;
    c.beginPath(); c.roundRect(-10, 4, 20, 14, 3); c.fill(); c.stroke();
    c.fillStyle = '#A04000';
    c.fillRect(-30, -4, 60, 7);
    c.strokeRect(-30, -4, 60, 7);
    c.fillStyle = '#7E5109';
    c.fillRect(-27, 3, 5, 16);
    c.fillRect(22, 3, 5, 16);
    c.fillStyle = '#2C3E50';
    c.fillRect(-16, -24, 26, 17);
    c.strokeRect(-16, -24, 26, 17);
    c.fillStyle = '#5DADE2';
    c.fillRect(-14, -22, 22, 12);
    c.fillStyle = '#7F8C8D';
    c.fillRect(-6, -7, 6, 3);
    c.fillStyle = '#34495E';
    c.fillRect(14, -19, 10, 15);
    c.strokeRect(14, -19, 10, 15);
    c.fillStyle = '#2ECC71';
    c.beginPath(); c.arc(19, -15, 1.5, 0, Math.PI * 2); c.fill();
  } else if (decorId === 'd_plant') {
    c.fillStyle = '#E67E22';
    c.strokeStyle = '#2C3E50';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(-10, 2); c.lineTo(10, 2); c.lineTo(8, 18); c.lineTo(-8, 18); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#27AE60';
    c.beginPath(); c.arc(0, -10, 10, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.arc(-9, -5, 7, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.arc(9, -5, 7, 0, Math.PI * 2); c.fill(); c.stroke();
  } else if (decorId === 'd_bookshelf') {
    c.fillStyle = '#A04000';
    c.strokeStyle = '#2C3E50';
    c.lineWidth = 2;
    c.fillRect(-18, -26, 36, 44);
    c.strokeRect(-18, -26, 36, 44);
    [-21, -7, 7].forEach((sy, row) => {
      c.fillStyle = '#FAD7A0';
      c.fillRect(-14, sy, 28, 10);
      ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71'].forEach((bc, bi) => {
        c.fillStyle = bc;
        c.fillRect(-12 + bi * 6 + (row % 2), sy + 1, 5, 9);
      });
    });
  } else if (decorId === 'd_aquarium') {
    c.fillStyle = '#7E5109';
    c.strokeStyle = '#2C3E50';
    c.lineWidth = 2;
    c.fillRect(-18, 2, 36, 16);
    c.strokeRect(-18, 2, 36, 16);
    c.fillStyle = '#AED6F1';
    c.fillRect(-16, -18, 32, 20);
    c.strokeRect(-16, -18, 32, 20);
    c.fillStyle = '#F39C12';
    c.beginPath(); c.ellipse(-2, -8, 5, 3, 0, 0, Math.PI * 2); c.fill();
  } else if (decorId === 'd_bear') {
    // Detailed plush teddy bear
    c.strokeStyle = '#2C3E50';
    c.lineWidth = 2;
    c.fillStyle = '#B9770E';
    c.beginPath(); c.arc(-11, -18, 6, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.arc(11, -18, 6, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#F5B041';
    c.beginPath(); c.arc(-11, -18, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(11, -18, 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#D68910';
    c.beginPath(); c.ellipse(0, 6, 14, 15, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#F8C471';
    c.beginPath(); c.ellipse(0, 7, 8, 9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#D68910';
    c.beginPath(); c.arc(0, -10, 12, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#F8C471';
    c.beginPath(); c.ellipse(0, -7, 6, 4.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2C3E50';
    c.beginPath(); c.arc(-4.5, -13, 1.8, 0, Math.PI * 2); c.arc(4.5, -13, 1.8, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(0, -8.5, 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#E74C3C';
    c.beginPath(); c.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2); c.fill();
  } else if (decorId === 'd_guitar') {
    // Detailed acoustic/rock guitar on stand
    c.strokeStyle = '#2C3E50';
    c.lineWidth = 2;
    c.rotate(-0.28);
    c.fillStyle = '#E67E22';
    c.beginPath(); c.ellipse(0, 9, 13, 12, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, -3, 9.5, 9, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#5D4037';
    c.beginPath(); c.arc(0, 3, 4.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#8D6E63';
    c.fillRect(-3, -30, 6, 23);
    c.strokeRect(-3, -30, 6, 23);
    c.fillStyle = '#4E342E';
    c.beginPath(); c.roundRect(-5, -36, 10, 8, 2); c.fill(); c.stroke();
    c.strokeStyle = '#FDEBD0';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(-1, -28); c.lineTo(-1, 13); c.moveTo(1, -28); c.lineTo(1, 13); c.stroke();
  } else {
    const item = findAnyCatalogItem(decorId);
    if (item && item.labSpec) {
      drawProceduralLabItemOnCanvas(c, item.labSpec, item);
    } else {
      c.font = '32px Arial';
      c.textAlign = 'center';
      c.fillText(item ? item.icon : '📦', 0, 10);
    }
  }
  c.restore();
}

function drawBuildingShapeBackdrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shape: BuildingShape,
  w = 224,
  h = 148
) {
  ctx.save();
  // Paved courtyard terrace under every building
  ctx.fillStyle = shape === 'castle' ? 'rgba(203, 213, 225, 0.85)' : shape === 'modern' ? 'rgba(226, 232, 240, 0.86)' : 'rgba(241, 245, 249, 0.78)';
  ctx.strokeStyle = shape === 'castle' ? '#475569' : 'rgba(100, 116, 139, 0.55)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2 - 18, y + 48, w + 36, 34, 10);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 3;

  if (shape === 'classic') {
    // Brick/stone side pilasters + warm flower planter boxes
    [-w / 2 - 6, w / 2 - 10].forEach((px) => {
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(x + px, y - 78, 16, h);
      ctx.strokeRect(x + px, y - 78, 16, h);
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(x + px + 8, y + 60, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  } else if (shape === 'modern') {
    // Sleek steel exoskeleton wing fins + glowing cyan glass terrace canopy
    [-w / 2 - 14, w / 2 - 4].forEach((fx) => {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(x + fx, y - 108, 18, h + 30);
      ctx.strokeRect(x + fx, y - 108, 18, h + 30);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(x + fx + 5, y - 102, 5, h + 16);
    });
    // Rooftop solar & glass penthouse bar
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(x - w / 2 - 18, y - 118, w + 36, 22, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(x - w / 2 - 10, y - 110, w + 20, 6);
  } else if (shape === 'pavilion') {
    // Crimson wooden veranda pillars + sweeping golden pagoda double-eaves
    [-w / 2 - 10, w / 2 - 8].forEach((px) => {
      ctx.fillStyle = '#B91C1C';
      ctx.fillRect(x + px, y - 78, 18, h);
      ctx.strokeRect(x + px, y - 78, 18, h);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(x + px - 2, y + 54, 22, 10);
      ctx.strokeRect(x + px - 2, y + 54, 22, 10);
    });
    // Upper tier upturned curved pagoda roof
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 26, y - 82);
    ctx.quadraticCurveTo(x - w / 4, y - 105, x, y - 148);
    ctx.quadraticCurveTo(x + w / 4, y - 105, x + w / 2 + 26, y - 82);
    ctx.quadraticCurveTo(x, y - 92, x - w / 2 - 26, y - 82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(x, y - 150, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (shape === 'castle') {
    // Twin tall ashlar stone fortress turrets with royal indigo conical spires & waving banners
    [-w / 2 - 22, w / 2 - 10].forEach((tx, ti) => {
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(x + tx, y - 106, 32, h + 32);
      ctx.strokeRect(x + tx, y - 106, 32, h + 32);
      // Stone slit window
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(x + tx + 11, y - 62, 10, 24, [5, 5, 0, 0]);
      ctx.fill();
      // Conical spire
      ctx.fillStyle = '#4F46E5';
      ctx.beginPath();
      ctx.moveTo(x + tx - 5, y - 106);
      ctx.lineTo(x + tx + 16, y - 152);
      ctx.lineTo(x + tx + 37, y - 106);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Fluttering pennant flag
      const wave = Math.sin(Date.now() / 190 + ti) * 3;
      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.moveTo(x + tx + 16, y - 152);
      ctx.lineTo(x + tx + 38, y - 144 + wave);
      ctx.lineTo(x + tx + 16, y - 136);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawBuildingShapeOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shape: BuildingShape,
  w = 212,
  topY = -92
) {
  ctx.save();
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 2.6;
  const roofY = y + topY;

  if (shape === 'classic') {
    // Crisp pitched gable pediment over the front roofline
    ctx.fillStyle = '#B91C1C';
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 10, roofY + 2);
    ctx.lineTo(x, roofY - 34);
    ctx.lineTo(x + w / 2 + 10, roofY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(x, roofY - 12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (shape === 'modern') {
    // Sleek cyan LED strip & diagonal glass curtain sheen
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 18, roofY + 18);
    ctx.lineTo(x - w / 2 + 46, roofY + 18);
    ctx.lineTo(x - w / 2 + 16, y + 48);
    ctx.lineTo(x - w / 2 - 8, y + 48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(x - w / 2 - 6, roofY - 4, w + 12, 6);
    ctx.strokeRect(x - w / 2 - 6, roofY - 4, w + 12, 6);
  } else if (shape === 'pavilion') {
    // Upturned pagoda eave rim + swaying red festival lanterns on both corners
    const sway = Math.sin(Date.now() / 320) * 3;
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 18, roofY + 4);
    ctx.quadraticCurveTo(x, roofY - 16, x + w / 2 + 18, roofY + 4);
    ctx.lineTo(x + w / 2 + 10, roofY + 12);
    ctx.quadraticCurveTo(x, roofY - 4, x - w / 2 - 10, roofY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    [-w / 2 - 6, w / 2 + 6].forEach((lx) => {
      ctx.beginPath();
      ctx.moveTo(x + lx, roofY + 8);
      ctx.lineTo(x + lx + sway, roofY + 24);
      ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.ellipse(x + lx + sway, roofY + 31, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(x + lx + sway - 4, roofY + 22, 8, 3);
    });
  } else if (shape === 'castle') {
    // Stone crenellated battlements running across the top roofline + golden heraldic crest
    ctx.fillStyle = '#CBD5E1';
    for (let bx = x - w / 2; bx <= x + w / 2 - 18; bx += 26) {
      ctx.fillRect(bx, roofY - 14, 16, 16);
      ctx.strokeRect(bx, roofY - 14, 16, 16);
    }
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(x - 13, roofY - 10);
    ctx.lineTo(x + 13, roofY - 10);
    ctx.lineTo(x + 11, roofY + 6);
    ctx.lineTo(x, roofY + 14);
    ctx.lineTo(x - 11, roofY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawStreetTownhouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: string,
  lighting: LightingInfo,
  familyName = 'B2KS',
  shape: BuildingShape = 'classic'
) {
  ctx.save();
  ctx.translate(x, y);

  let wallColor = '#FFF8E7';
  let trimColor = '#E67E22';
  let roofColor = '#C0392B';
  if (style === 'modern') { wallColor = '#FDFEFE'; trimColor = '#2980B9'; roofColor = '#2C3E50'; }
  if (style === 'pastel') { wallColor = '#E8F8F5'; trimColor = '#16A085'; roofColor = '#F39C12'; }
  if (shape === 'castle') { wallColor = '#E2E8F0'; trimColor = '#64748B'; roofColor = '#4F46E5'; }
  if (shape === 'modern') { wallColor = '#F1F5F9'; trimColor = '#0284C7'; roofColor = '#0F172A'; }
  if (shape === 'pavilion') { wallColor = '#FFFBEB'; trimColor = '#DC2626'; roofColor = '#B91C1C'; }

  ctx.lineWidth = 3.2;
  ctx.strokeStyle = '#2C3E50';

  // Paved yard front apron
  ctx.fillStyle = 'rgba(241, 245, 249, 0.78)';
  ctx.beginPath();
  ctx.roundRect(-108, 54, 216, 36, 12);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 72, 102, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  if (shape === 'castle') {
    [-112, 82].forEach((tx, ti) => {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(tx, -176, 30, 244);
      ctx.strokeRect(tx, -176, 30, 244);
      ctx.fillStyle = '#4F46E5';
      ctx.beginPath();
      ctx.moveTo(tx - 5, -176); ctx.lineTo(tx + 15, -220); ctx.lineTo(tx + 35, -176); ctx.closePath();
      ctx.fill(); ctx.stroke();
      const wave = Math.sin(Date.now() / 200 + ti) * 3;
      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.moveTo(tx + 15, -220); ctx.lineTo(tx + 36, -212 + wave); ctx.lineTo(tx + 15, -205); ctx.closePath();
      ctx.fill(); ctx.stroke();
    });
  } else if (shape === 'pavilion') {
    [-98, 82].forEach((px) => {
      ctx.fillStyle = '#B91C1C';
      ctx.fillRect(px, -170, 16, 240);
      ctx.strokeRect(px, -170, 16, 240);
    });
  }

  ctx.fillStyle = wallColor;
  ctx.fillRect(-84, -170, 168, 240);
  ctx.strokeRect(-84, -170, 168, 240);

  [-90, -12].forEach((fy) => {
    ctx.fillStyle = trimColor;
    ctx.fillRect(-90, fy, 180, 9);
    ctx.strokeRect(-90, fy, 180, 9);

    if (shape === 'modern') {
      // Wide floor-to-ceiling tinted glass windows with sky reflection
      ctx.fillStyle = lighting.isNight ? '#FEF08A' : '#7DD3FC';
      ctx.fillRect(-66, fy - 64, 132, 46);
      ctx.strokeRect(-66, fy - 64, 132, 46);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-52, fy - 62, 18, 42);
      ctx.fillRect(18, fy - 62, 14, 42);
    } else {
      [-54, 18].forEach((wx) => {
        ctx.fillStyle = lighting.isNight ? '#F9E79F' : '#AED6F1';
        if (shape === 'castle') {
          ctx.beginPath();
          ctx.roundRect(wx, fy - 62, 36, 38, [18, 18, 0, 0]);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(wx, fy - 62, 36, 38);
          ctx.strokeRect(wx, fy - 62, 36, 38);
          ctx.fillStyle = shape === 'pavilion' ? '#FEE2E2' : '#FADBD8';
          ctx.fillRect(wx + 2, fy - 60, 8, 34);
          ctx.fillRect(wx + 26, fy - 60, 8, 34);
          ctx.beginPath();
          ctx.moveTo(wx + 18, fy - 62); ctx.lineTo(wx + 18, fy - 24);
          ctx.moveTo(wx, fy - 43); ctx.lineTo(wx + 36, fy - 43);
          ctx.stroke();
        }
      });
    }

    ctx.fillStyle = shape === 'castle' ? 'rgba(148, 163, 184, 0.5)' : 'rgba(133, 193, 233, 0.5)';
    ctx.fillRect(-68, fy - 22, 136, 22);
    ctx.strokeRect(-68, fy - 22, 136, 22);
  });

  if (shape === 'modern') {
    // Asymmetric modern penthouse roof + glowing cyan LED bar
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(-100, -204, 200, 36, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(-92, -190, 184, 7);
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(-50, -220, 100, 16);
    ctx.strokeRect(-50, -220, 100, 16);
  } else if (shape === 'pavilion') {
    // Double-tier curved pagoda roof + festival lanterns
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(-112, -168);
    ctx.quadraticCurveTo(-50, -195, 0, -246);
    ctx.quadraticCurveTo(50, -195, 112, -168);
    ctx.quadraticCurveTo(0, -178, -112, -168);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath(); ctx.arc(0, -248, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    [-96, 96].forEach((lx) => {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath(); ctx.ellipse(lx, -148, 7, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  } else if (shape === 'castle') {
    // Stone crenellated battlements across roof
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(-88, -184, 176, 16);
    ctx.strokeRect(-88, -184, 176, 16);
    for (let bx = -84; bx <= 64; bx += 26) {
      ctx.fillRect(bx, -200, 16, 16);
      ctx.strokeRect(bx, -200, 16, 16);
    }
    ctx.fillStyle = '#4F46E5';
    ctx.beginPath(); ctx.moveTo(-36, -184); ctx.lineTo(0, -234); ctx.lineTo(36, -184); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(-98, -170);
    ctx.lineTo(0, -224);
    ctx.lineTo(98, -170);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#F9E79F';
  ctx.beginPath();
  ctx.arc(0, -192, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = shape === 'castle' ? '#78350F' : '#8E44AD';
  ctx.beginPath();
  ctx.roundRect(-20, 12, 40, 58, [shape === 'castle' ? 20 : 8, shape === 'castle' ? 20 : 8, 0, 0]);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F9E79F';
  ctx.fillRect(-10, 22, 20, 18);
  ctx.strokeRect(-10, 22, 20, 18);
  ctx.fillStyle = '#F1C40F';
  ctx.beginPath(); ctx.arc(13, 46, 3.5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = shape === 'modern' ? '#0284C7' : shape === 'pavilion' ? '#F59E0B' : '#E74C3C';
  ctx.beginPath();
  ctx.moveTo(-28, 12); ctx.lineTo(28, 12); ctx.lineTo(22, 2); ctx.lineTo(-22, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  [-64, 34].forEach((wx) => {
    ctx.fillStyle = lighting.isNight ? '#F9E79F' : '#AED6F1';
    ctx.fillRect(wx, 18, 30, 34);
    ctx.strokeRect(wx, 18, 30, 34);
  });

  const houseLabel = `🏡 Nhà Phố ${familyName}`;
  ctx.font = 'bold 12px Fredoka, sans-serif';
  const labelW = Math.max(128, ctx.measureText(houseLabel).width + 24);
  ctx.fillStyle = '#2C3E50';
  ctx.beginPath();
  ctx.roundRect(-labelW / 2, -264, labelW, 22, 8);
  ctx.fill();
  ctx.fillStyle = '#FFE66D';
  ctx.textAlign = 'center';
  ctx.fillText(houseLabel, 0, -249);

  ctx.restore();
}

export interface ShopBuildingConfig {
  buildingType:
    | 'supermarket'
    | 'arcade'
    | 'english'
    | 'fashion'
    | 'salon'
    | 'lab'
    | 'cross_world'
    | 'flea_market'
    | 'zoo'
    | 'pet_shop';
  title: string;
  shape?: BuildingShape;
  npcName: string;
  npcHairStyle: string;
  npcHairColor: string;
  npcShirtColor: string;
  npcShirtPattern: string;
  npcPantsColor: string;
  npcPantsStyle: string;
  npcOutfit: string;
}

export function drawShopBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  config: ShopBuildingConfig,
  lighting: LightingInfo
) {
  const type = config.buildingType;
  const shape = config.shape || 'classic';
  const t = Date.now();
  drawBuildingShapeBackdrop(ctx, x, y, shape);

  ctx.save();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = '#2C3E50';

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 68, 110, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  if (type === 'supermarket') {
    ctx.fillStyle = '#FFF9C4';
    ctx.beginPath(); ctx.roundRect(x - 104, y - 68, 208, 130, [10, 10, 4, 4]); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#E67E22';
    ctx.beginPath(); ctx.roundRect(x - 108, y - 92, 216, 30, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, x, y - 72);

    for (let i = 0; i < 10; i++) {
      const ax = x - 100 + i * 20;
      ctx.fillStyle = i % 2 === 0 ? '#E74C3C' : '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(ax, y - 62, 20, 18, [0, 0, 6, 6]);
      ctx.fill(); ctx.stroke();
    }

    ctx.fillStyle = lighting.isNight ? '#F9E79F' : '#AED6F1';
    ctx.fillRect(x - 32, y - 24, 64, 86); ctx.strokeRect(x - 32, y - 24, 64, 86);
    ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x, y + 62); ctx.stroke();

    [-72, 42].forEach((wx, idx) => {
      ctx.fillStyle = lighting.isNight ? '#FCF3CF' : '#D6EAF8';
      ctx.fillRect(x + wx, y - 34, 34, 42); ctx.strokeRect(x + wx, y - 34, 34, 42);
      ctx.font = '18px Arial';
      ctx.fillText(idx === 0 ? '🍎🍌' : '🧸🎁', x + wx + 17, y - 8);
    });
    ctx.font = '20px Arial';
    ctx.fillText('🛒', x - 86, y + 54);
    ctx.fillText('🛒', x + 86, y + 54);
  } else if (type === 'cross_world') {
    // Eye-catching Sci-Fi / Fantasy Golden-Violet Portal Trade Center
    const grad = ctx.createLinearGradient(x - 110, y - 90, x + 110, y + 60);
    grad.addColorStop(0, '#312E81');
    grad.addColorStop(0.5, '#6D28D9');
    grad.addColorStop(1, '#1E1B4B');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x - 112, y - 74, 224, 136, [22, 22, 6, 6]);
    ctx.fill();
    ctx.stroke();

    // Glowing portal ring in middle
    const pulseR = 32 + Math.sin(t / 220) * 3;
    const portalGrad = ctx.createRadialGradient(x, y - 4, 4, x, y - 4, pulseR + 12);
    portalGrad.addColorStop(0, '#FEF08A');
    portalGrad.addColorStop(0.5, '#38BDF8');
    portalGrad.addColorStop(1, '#7C3AED');
    ctx.fillStyle = portalGrad;
    ctx.beginPath();
    ctx.arc(x, y - 4, pulseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 3.2;

    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🌌', x, y + 4);

    // Pillars & Stars -> Cash icons
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath(); ctx.roundRect(x - 102, y - 50, 26, 108, 6); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(x + 76, y - 50, 26, 108, 6); ctx.fill(); ctx.stroke();
    ctx.font = '18px Arial';
    ctx.fillText('⭐', x - 89, y - 16);
    ctx.fillText('💵', x + 89, y - 16);

    // Floating Crown Header
    ctx.fillStyle = (Math.sin(t / 260) > 0) ? '#D97706' : '#7C3AED';
    ctx.beginPath(); ctx.roundRect(x - 122, y - 104, 244, 30, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.fillText(config.title, x, y - 84);
  } else if (type === 'flea_market') {
    // Colorful Open-Air Flea Market Stalls & Bunting Flags
    ctx.fillStyle = '#FEF9E7';
    ctx.beginPath(); ctx.roundRect(x - 106, y - 58, 212, 120, 10); ctx.fill(); ctx.stroke();

    // Bunting awning stripes
    const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#EC4899'];
    for (let i = 0; i < 10; i++) {
      const ax = x - 105 + i * 21;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.roundRect(ax, y - 66, 21, 22, [0, 0, 8, 8]);
      ctx.fill(); ctx.stroke();
    }

    // Header signboard
    ctx.fillStyle = '#D97706';
    ctx.beginPath(); ctx.roundRect(x - 104, y - 96, 208, 28, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, x, y - 77);

    // Wooden Market Counters & Items
    ctx.fillStyle = '#B45309';
    ctx.fillRect(x - 88, y + 6, 176, 26); ctx.strokeRect(x - 88, y + 6, 176, 26);
    ctx.font = '21px Arial';
    ctx.fillText('🏷️ 🧸 📚 🎮 💎', x, y - 10);
  } else if (type === 'zoo') {
    // Safari Virtual Zoo Arch Gate + Wildlife silhouettes
    ctx.fillStyle = '#ECFCCB';
    ctx.beginPath(); ctx.roundRect(x - 118, y - 64, 236, 126, 16); ctx.fill(); ctx.stroke();

    // Bamboo/Wood fence
    ctx.fillStyle = '#A16207';
    for (let fx = x - 110; fx <= x + 100; fx += 24) {
      ctx.fillRect(fx, y + 18, 12, 42);
      ctx.strokeRect(fx, y + 18, 12, 42);
    }

    // Main Zoo Arch
    ctx.fillStyle = '#15803D';
    ctx.beginPath(); ctx.roundRect(x - 110, y - 96, 220, 32, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, x, y - 75);

    ctx.font = '26px Arial';
    ctx.fillText('🦁  🦒  🐼  🐧', x, y - 16);
    ctx.fillStyle = '#047857';
    ctx.font = 'bold 11px Fredoka, sans-serif';
    ctx.fillText('🔊 Chạm từ học Tiếng Anh!', x, y + 8);
  } else if (type === 'arcade') {
    ctx.fillStyle = '#1B2631';
    ctx.beginPath();
    ctx.moveTo(x - 102, y + 62);
    ctx.lineTo(x - 102, y - 48);
    ctx.lineTo(x - 84, y - 88);
    ctx.lineTo(x + 84, y - 88);
    ctx.lineTo(x + 102, y - 48);
    ctx.lineTo(x + 102, y + 62);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    const pulse = Math.sin(t / 220) > 0;
    ctx.fillStyle = pulse ? '#E74C3C' : '#F39C12';
    ctx.beginPath(); ctx.roundRect(x - 94, y - 84, 188, 28, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12.5px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, x, y - 65);

    ctx.fillStyle = '#0B5345';
    ctx.beginPath(); ctx.roundRect(x - 76, y - 48, 152, 54, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1ABC9C';
    ctx.font = '22px Arial';
    ctx.fillText('🕹️ ❌⭕ 🚀 ⚡', x, y - 14);

    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(x - 96, y + 8, 192, 14); ctx.strokeRect(x - 96, y + 8, 192, 14);
    ['#E74C3C', '#3498DB', '#2ECC71'].forEach((bc, bi) => {
      ctx.fillStyle = bc;
      ctx.beginPath(); ctx.arc(x - 65 + bi * 18, y + 15, 5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(x - 28, y + 22, 56, 40); ctx.strokeRect(x - 28, y + 22, 56, 40);
  } else if (type === 'english') {
    ctx.fillStyle = '#E8F8F5';
    ctx.fillRect(x - 98, y - 62, 196, 124); ctx.strokeRect(x - 98, y - 62, 196, 124);

    ctx.fillStyle = '#117864';
    ctx.beginPath();
    ctx.moveTo(x - 108, y - 62);
    ctx.lineTo(x, y - 102);
    ctx.lineTo(x + 108, y - 62);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(x, y - 76, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 76); ctx.lineTo(x, y - 85); ctx.moveTo(x, y - 76); ctx.lineTo(x + 7, y - 76); ctx.stroke();

    [-84, -42, 42, 84].forEach((px) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + px - 6, y - 56, 12, 118); ctx.strokeRect(x + px - 6, y - 56, 12, 118);
    });

    ctx.fillStyle = '#0E6251';
    ctx.beginPath(); ctx.roundRect(x - 96, y - 54, 192, 24, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, x, y - 38);
    ctx.font = '20px Arial';
    ctx.fillText('🇬🇧  ABC  📘', x, y - 6);
  } else if (type === 'fashion') {
    ctx.fillStyle = '#FDEDEC';
    ctx.beginPath(); ctx.roundRect(x - 98, y - 66, 196, 128, [16, 16, 4, 4]); ctx.fill(); ctx.stroke();

    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('👑', x, y - 92);
    ctx.fillStyle = '#C2185B';
    ctx.beginPath(); ctx.roundRect(x - 100, y - 86, 200, 28, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12.5px Fredoka, sans-serif';
    ctx.fillText(config.title, x, y - 67);

    [-64, 30].forEach((wx, wi) => {
      ctx.fillStyle = lighting.isNight ? '#FADBD8' : '#FFF0F5';
      ctx.beginPath(); ctx.roundRect(x + wx, y - 46, 36, 68, [18, 18, 4, 4]); ctx.fill(); ctx.stroke();
      ctx.font = '22px Arial';
      ctx.fillText(wi === 0 ? '👗' : '🤵', x + wx + 18, y - 4);
    });
    ctx.font = '22px Arial';
    ctx.fillText('🎀 👜 👠', x, y - 16);
  } else if (type === 'salon') {
    ctx.fillStyle = '#F5EEF8';
    ctx.fillRect(x - 96, y - 66, 192, 128); ctx.strokeRect(x - 96, y - 66, 192, 128);

    ctx.fillStyle = '#6C3483';
    ctx.beginPath(); ctx.roundRect(x - 100, y - 88, 200, 28, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12.5px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, x, y - 69);

    [-68, 32].forEach((wx) => {
      ctx.fillStyle = lighting.isNight ? '#F9E79F' : '#EBF5FB';
      ctx.beginPath(); ctx.roundRect(x + wx, y - 46, 36, 64, 16); ctx.fill(); ctx.stroke();
    });

    const poleX = x - 106;
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.roundRect(poleX - 7, y - 34, 14, 68, 7); ctx.fill(); ctx.stroke();
    const stripeOffset = Math.floor((t / 90) % 18);
    for (let sy = y - 28 + stripeOffset; sy < y + 26; sy += 18) {
      ctx.fillStyle = Math.floor(sy / 18) % 2 === 0 ? '#E74C3C' : '#2980B9';
      ctx.fillRect(poleX - 5, sy, 10, 7);
    }
    ctx.font = '24px Arial';
    ctx.fillText('✂️ 💇‍♀️ 🎨', x, y - 12);
  } else if (type === 'lab') {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath(); ctx.roundRect(x - 102, y - 60, 204, 122, [14, 14, 4, 4]); ctx.fill(); ctx.stroke();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y - 60, 56, Math.PI, 0);
    ctx.fill(); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(x, y - 116); ctx.lineTo(x, y - 134); ctx.stroke();
    ctx.fillStyle = Math.sin(t / 180) > 0 ? '#38BDF8' : '#10B981';
    ctx.beginPath(); ctx.arc(x, y - 136, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    const bShift = Math.sin(t / 250) * 5;
    ctx.fillStyle = '#7DD3FC';
    ctx.beginPath(); ctx.arc(x - 20, y - 78 + bShift, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 18, y - 84 - bShift, 6, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#0284C7';
    ctx.beginPath(); ctx.roundRect(x - 104, y - 64, 208, 28, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, x, y - 45);

    [-76, 36].forEach((wx) => {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(x + wx, y - 24, 40, 46); ctx.strokeRect(x + wx, y - 24, 40, 46);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + wx + 4, y); ctx.lineTo(x + wx + 14, y - 10); ctx.lineTo(x + wx + 24, y + 8); ctx.lineTo(x + wx + 36, y - 4);
      ctx.stroke();
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 3.2;
    });
    ctx.font = '22px Arial';
    ctx.fillText('🧪 🧬 ⚡', x, y - 4);
  } else if (type === 'pet_shop') {
    // Cozy Amber & Pink Pet Shop with Giant Egg Showcase & Paw Banner
    ctx.fillStyle = '#FFFBEB';
    ctx.beginPath(); ctx.roundRect(x - 104, y - 66, 208, 128, [16, 16, 4, 4]); ctx.fill(); ctx.stroke();

    // Cute striped awning
    for (let i = 0; i < 8; i++) {
      const ax = x - 102 + i * 25.5;
      ctx.fillStyle = i % 2 === 0 ? '#F59E0B' : '#EC4899';
      ctx.beginPath();
      ctx.roundRect(ax, y - 70, 25.5, 20, [0, 0, 8, 8]);
      ctx.fill(); ctx.stroke();
    }

    // Main Signboard
    ctx.fillStyle = '#D97706';
    ctx.beginPath(); ctx.roundRect(x - 110, y - 102, 220, 30, 11); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FEF9C3';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.title, x, y - 82);

    // Floating egg badge
    const bob = Math.sin(t / 240) * 3;
    ctx.font = '22px Arial';
    ctx.fillText('🥚', x - 62, y - 12 + bob);
    ctx.fillText('🐶🐱🐉', x + 22, y - 12);

    // Pet showcase glass windows
    ctx.fillStyle = lighting.isNight ? '#FEF3C7' : '#E0F2FE';
    ctx.beginPath(); ctx.roundRect(x - 86, y - 42, 48, 52, 8); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(x + 38, y - 42, 48, 52, 8); ctx.fill(); ctx.stroke();
    ctx.font = '20px Arial';
    ctx.fillText('🐾', x - 62, y + 4);
    ctx.fillText('🦴', x + 62, y - 8);
  }

  ctx.restore();

  drawBuildingShapeOverlay(ctx, x, y, shape, type === 'zoo' ? 236 : 212, type === 'lab' ? -66 : -94);

  drawDetailedChibiOnContext(
    ctx,
    {
      x: x,
      y: y + 42,
      dir: 'down',
      name: config.npcName,
      hairStyle: config.npcHairStyle,
      hairColor: config.npcHairColor,
      shirtColor: config.npcShirtColor,
      shirtPattern: config.npcShirtPattern,
      pantsColor: config.npcPantsColor,
      pantsStyle: config.npcPantsStyle,
      outfit: config.npcOutfit,
      speech: null
    },
    false,
    0.85,
    false,
    false
  );
}

type TreeKind = 'oak' | 'pine' | 'sakura' | 'palm' | 'orange';

function drawCuteTree(ctx: CanvasRenderingContext2D, x: number, y: number, kind: TreeKind = 'oak') {
  const t = Date.now();
  const sway = Math.sin(t / 700 + x * 0.03) * 2.1;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath(); ctx.ellipse(x, y + 26, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 2.4;

  if (kind === 'pine') {
    ctx.fillStyle = '#6E2C00';
    ctx.fillRect(x - 5, y + 4, 10, 22);
    ctx.strokeRect(x - 5, y + 4, 10, 22);
    [[y + 10, 24], [y - 6, 19], [y - 20, 14]].forEach(([ly, halfW], idx) => {
      ctx.fillStyle = idx === 0 ? '#145A32' : idx === 1 ? '#1E8449' : '#27AE60';
      ctx.beginPath();
      ctx.moveTo(x + sway * (0.4 + idx * 0.3), ly - 22);
      ctx.lineTo(x + halfW + sway * 0.3, ly);
      ctx.lineTo(x - halfW + sway * 0.3, ly);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    });
  } else if (kind === 'sakura') {
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x - 6, y - 2, 12, 28);
    ctx.strokeRect(x - 6, y - 2, 12, 28);
    ctx.fillStyle = '#F9A8D4';
    ctx.beginPath(); ctx.arc(x + sway, y - 14, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FBCFE8';
    ctx.beginPath(); ctx.arc(x - 12 + sway, y - 6, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 12 + sway, y - 8, 12, 0, Math.PI * 2); ctx.fill();
    // Drifting cherry blossom petals
    const petalFall = ((t / 45 + x) % 34);
    ctx.fillStyle = '#FDF2F8';
    ctx.beginPath();
    ctx.arc(x - 10 + Math.sin(t / 350 + x) * 6, y - 4 + petalFall, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 11 + Math.cos(t / 390 + y) * 5, y - 10 + ((petalFall + 16) % 34), 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'palm') {
    // Curved tropical trunk + arched fronds + coconuts
    ctx.fillStyle = '#A04000';
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 26);
    ctx.quadraticCurveTo(x - 10, y + 4, x - 2 + sway * 0.4, y - 22);
    ctx.lineTo(x + 6 + sway * 0.4, y - 22);
    ctx.quadraticCurveTo(x, y + 4, x + 5, y + 26);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Coconuts
    ctx.fillStyle = '#6E2C00';
    ctx.beginPath(); ctx.arc(x - 2 + sway * 0.4, y - 19, 3.5, 0, Math.PI * 2); ctx.arc(x + 5 + sway * 0.4, y - 18, 3.5, 0, Math.PI * 2); ctx.fill();
    // Palm fronds
    [-2.4, -1.3, -0.3, 0.3, 1.3, 2.4].forEach((ang) => {
      ctx.save();
      ctx.translate(x + 2 + sway * 0.4, y - 23);
      ctx.rotate(ang + sway * 0.02);
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.ellipse(14, 0, 15, 4.5, 0.15, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    });
  } else if (kind === 'orange') {
    ctx.fillStyle = '#7E5109';
    ctx.fillRect(x - 6, y, 12, 26);
    ctx.strokeRect(x - 6, y, 12, 26);
    ctx.fillStyle = '#16A34A';
    ctx.beginPath(); ctx.arc(x + sway, y - 11, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    [[-10, -16], [9, -18], [-4, -4], [12, -5]].forEach(([ox, oy]) => {
      ctx.fillStyle = '#F97316';
      ctx.beginPath(); ctx.arc(x + ox + sway, y + oy, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#7E5109';
    ctx.fillRect(x - 6, y, 12, 26);
    ctx.strokeRect(x - 6, y, 12, 26);
    ctx.fillStyle = '#27AE60';
    ctx.beginPath(); ctx.arc(x + sway, y - 10, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2ECC71';
    ctx.beginPath(); ctx.arc(x - 7 + sway * 1.2, y - 16, 13, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

type FlowerKind = 'sunflower' | 'tulip' | 'daisy' | 'hibiscus' | 'lavender';

function drawFlowerCluster(ctx: CanvasRenderingContext2D, fx: number, fy: number, color: string, kind: FlowerKind) {
  const sway = Math.sin(Date.now() / 540 + fx * 0.05) * 1.5;
  ctx.save();
  // Little green leaf base
  ctx.fillStyle = '#16A34A';
  ctx.beginPath();
  ctx.ellipse(fx - 4, fy + 6, 5, 2.5, -0.4, 0, Math.PI * 2);
  ctx.ellipse(fx + 6, fy + 7, 5, 2.5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  const drawSingleFlower = (cx: number, cy: number, s: number) => {
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 7 * s);
    ctx.lineTo(cx + sway, cy);
    ctx.stroke();
    const bx = cx + sway;
    if (kind === 'sunflower') {
      ctx.fillStyle = '#FACC15';
      for (let a = 0; a < 8; a++) {
        const ang = (a * Math.PI) / 4;
        ctx.beginPath();
        ctx.ellipse(bx + Math.cos(ang) * 5 * s, cy + Math.sin(ang) * 5 * s, 3 * s, 1.8 * s, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#78350F';
      ctx.beginPath(); ctx.arc(bx, cy, 3.2 * s, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'tulip') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(bx - 4 * s, cy - 2 * s);
      ctx.lineTo(bx - 2 * s, cy - 7 * s);
      ctx.lineTo(bx, cy - 4 * s);
      ctx.lineTo(bx + 2 * s, cy - 7 * s);
      ctx.lineTo(bx + 4 * s, cy - 2 * s);
      ctx.quadraticCurveTo(bx, cy + 4 * s, bx - 4 * s, cy - 2 * s);
      ctx.fill();
    } else if (kind === 'lavender') {
      ctx.fillStyle = '#9333EA';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath(); ctx.arc(bx + (k % 2 === 0 ? -1.5 : 1.5), cy - k * 2.8 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = color;
      for (let a = 0; a < 5; a++) {
        const ang = (a * Math.PI * 2) / 5;
        ctx.beginPath(); ctx.arc(bx + Math.cos(ang) * 3.8 * s, cy + Math.sin(ang) * 3.8 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath(); ctx.arc(bx, cy, 2.2 * s, 0, Math.PI * 2); ctx.fill();
    }
  };

  drawSingleFlower(fx, fy, 1.15);
  drawSingleFlower(fx + 12, fy + 4, 0.9);
  drawSingleFlower(fx - 10, fy + 5, 0.85);
  ctx.restore();
}

function drawStreetLamp(ctx: CanvasRenderingContext2D, x: number, y: number, isNight: boolean) {
  ctx.save();
  ctx.fillStyle = '#2C3E50';
  ctx.fillRect(x - 3, y - 48, 6, 48);
  ctx.beginPath(); ctx.arc(x, y - 52, 9, 0, Math.PI * 2);
  ctx.fillStyle = isNight ? '#F9E79F' : '#ECF0F1';
  ctx.fill();
  ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 2; ctx.stroke();

  if (isNight) {
    const grad = ctx.createRadialGradient(x, y - 52, 4, x, y - 52, 85);
    grad.addColorStop(0, 'rgba(249, 231, 159, 0.55)');
    grad.addColorStop(1, 'rgba(249, 231, 159, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y - 52, 85, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawNeighborhoodWorld(
  ctx: CanvasRenderingContext2D,
  lighting: LightingInfo,
  state: B2KSState,
  streetCars: StreetCar[],
  arcadeRoomState: any,
  arcadeCatalog: Record<string, { shortTitle: string }>,
  soccerRoomState?: SoccerOnlineRoom | null,
  weather?: WeatherInfo | null
) {
  const W = STREET_WORLD.width;
  const H = STREET_WORLD.height;
  const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
  const locs = resolveNeighborhoodLocations(state);
  const byId = new Map(locs.map((l) => [l.id, l]));
  const getLoc = (id: string, fallbackX: number, fallbackY: number) => {
    const found = byId.get(id);
    return {
      x: found ? found.x : fallbackX,
      y: found ? found.y : fallbackY,
      shape: (found?.shape || 'classic') as BuildingShape
    };
  };

  const skyGrad = ctx.createLinearGradient(0, 0, 0, 240);
  const wCond = weather?.condition || 'clear';
  if (wCond === 'rain' || wCond === 'thunder') {
    skyGrad.addColorStop(0, lighting.isNight ? '#0F172A' : '#475569');
    skyGrad.addColorStop(1, lighting.isNight ? '#1E293B' : '#94A3B8');
  } else if (wCond === 'cloudy' || wCond === 'fog') {
    skyGrad.addColorStop(0, lighting.isNight ? '#1E293B' : '#7FA6C9');
    skyGrad.addColorStop(1, lighting.isNight ? '#334155' : '#CBD5E1');
  } else {
    skyGrad.addColorStop(0, lighting.skyTop);
    skyGrad.addColorStop(1, lighting.skyBottom);
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, 240);

  if (lighting.phase === 'night') {
    ctx.fillStyle = '#FFFFFF';
    for (let s = 0; s < 48; s++) {
      const sx = (s * 149) % W;
      const sy = 20 + (s * 47) % 150;
      const r = s % 2 === 0 ? 2 : 1.3;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#FEF9E7';
    ctx.beginPath(); ctx.arc(2040, 65, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = lighting.skyTop;
    ctx.beginPath(); ctx.arc(2051, 58, 22, 0, Math.PI * 2); ctx.fill();
  } else if (wCond !== 'rain' && wCond !== 'thunder') {
    const sunY = lighting.phase === 'dawn' || lighting.phase === 'sunset' ? 155 : 65;
    ctx.fillStyle = 'rgba(249, 231, 159, 0.55)';
    ctx.beginPath(); ctx.arc(2040, sunY, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F4D03F';
    ctx.beginPath(); ctx.arc(2040, sunY, 27, 0, Math.PI * 2); ctx.fill();
  }

  const cloudShift = (Date.now() / 65) % W;
  ctx.fillStyle =
    wCond === 'rain' || wCond === 'thunder'
      ? 'rgba(100,116,139,0.75)'
      : lighting.isNight
      ? 'rgba(200,214,229,0.28)'
      : 'rgba(255,255,255,0.9)';
  const cloudBaseList = wCond === 'cloudy' || wCond === 'rain' || wCond === 'thunder'
    ? [120, 380, 680, 960, 1280, 1580, 1840, 2140, 2360]
    : [200, 740, 1280, 1840, 2280];
  cloudBaseList.forEach((baseX, i) => {
    const cx = ((baseX + cloudShift) % (W + 100)) - 50;
    const cy = 50 + (i % 3) * 22;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy - 6, 30, 0, Math.PI * 2);
    ctx.arc(cx + 48, cy, 23, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#7DCEA0';
  ctx.beginPath();
  ctx.moveTo(0, 235);
  ctx.quadraticCurveTo(420, 175, 840, 235);
  ctx.quadraticCurveTo(1320, 170, 1820, 235);
  ctx.quadraticCurveTo(2160, 180, W, 235);
  ctx.fill();

  const grassGrad = ctx.createLinearGradient(0, 225, 0, H);
  grassGrad.addColorStop(0, wCond === 'snow' ? '#D1FAE5' : '#58D68D');
  grassGrad.addColorStop(1, wCond === 'snow' ? '#A7F3D0' : '#2ECC71');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, 225, W, H - 225);

  ctx.fillStyle = '#FDFEFE';
  ctx.strokeStyle = '#95A5A6';
  ctx.lineWidth = 1.5;
  for (let fx = 10; fx < W; fx += 24) {
    ctx.fillRect(fx, 216, 12, 22);
    ctx.strokeRect(fx, 216, 12, 22);
  }

  const hRoads = [
    { y: 465, h: 130, swTop: 415, swBot: 595 },
    { y: 1025, h: 130, swTop: 975, swBot: 1155 }
  ];
  const vRoad = { x: 1180, w: 130, swLeft: 1130, swRight: 1310 };

  hRoads.forEach((r) => {
    ctx.fillStyle = '#E5E7E9';
    ctx.fillRect(0, r.swTop, W, r.h + 100);
    ctx.strokeStyle = 'rgba(149, 165, 166, 0.35)';
    ctx.lineWidth = 1.5;
    for (let px = 40; px < W; px += 80) {
      ctx.beginPath();
      ctx.moveTo(px, r.swTop); ctx.lineTo(px, r.y);
      ctx.moveTo(px, r.y + r.h); ctx.lineTo(px, r.swBot + 50);
      ctx.stroke();
    }
    ctx.strokeStyle = '#95A5A6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, r.swTop); ctx.lineTo(W, r.swTop);
    ctx.moveTo(0, r.swBot + 50); ctx.lineTo(W, r.swBot + 50);
    ctx.stroke();

    ctx.fillStyle = '#34495E';
    ctx.fillRect(0, r.y, W, r.h);

    ctx.strokeStyle = '#F7DC6F';
    ctx.lineWidth = 5;
    ctx.setLineDash([34, 24]);
    ctx.beginPath();
    ctx.moveTo(0, r.y + r.h / 2);
    ctx.lineTo(W, r.y + r.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  ctx.fillStyle = '#E5E7E9';
  ctx.fillRect(vRoad.swLeft, 225, vRoad.w + 100, H - 225);
  ctx.fillStyle = '#34495E';
  ctx.fillRect(vRoad.x, 225, vRoad.w, H - 225);

  ctx.strokeStyle = '#F7DC6F';
  ctx.lineWidth = 5;
  ctx.setLineDash([34, 24]);
  ctx.beginPath();
  ctx.moveTo(vRoad.x + vRoad.w / 2, 235);
  ctx.lineTo(vRoad.x + vRoad.w / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  hRoads.forEach((r) => {
    ctx.fillStyle = '#34495E';
    ctx.fillRect(vRoad.x, r.y, vRoad.w, r.h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let zy = r.y + 10; zy < r.y + r.h - 10; zy += 22) {
      ctx.fillRect(vRoad.x - 28, zy, 22, 11);
      ctx.fillRect(vRoad.x + vRoad.w + 6, zy, 22, 11);
    }
    for (let zx = vRoad.x + 10; zx < vRoad.x + vRoad.w - 10; zx += 22) {
      ctx.fillRect(zx, r.y - 28, 11, 22);
      ctx.fillRect(zx, r.y + r.h + 6, 11, 22);
    }
  });

  const flowerSpots: [number, number, string, FlowerKind][] = [
    [100, 325, '#F43F5E', 'tulip'], [255, 385, '#FACC15', 'sunflower'], [430, 395, '#EC4899', 'hibiscus'],
    [580, 385, '#A855F7', 'lavender'], [1030, 385, '#FFFFFF', 'daisy'], [1380, 360, '#A855F7', 'lavender'],
    [1780, 385, '#F59E0B', 'sunflower'], [2160, 385, '#F43F5E', 'tulip'], [140, 1340, '#EC4899', 'hibiscus'],
    [430, 1470, '#FACC15', 'sunflower'], [620, 1320, '#FFFFFF', 'daisy'], [1040, 1240, '#F43F5E', 'tulip'],
    [1380, 1450, '#F43F5E', 'hibiscus'], [1720, 1460, '#9333EA', 'lavender'], [2280, 1350, '#FACC15', 'sunflower'],
    [440, 740, '#EC4899', 'tulip'], [1380, 680, '#FFFFFF', 'daisy']
  ];
  flowerSpots.forEach(([fx, fy, fcol, fkind]) => drawFlowerCluster(ctx, fx, fy, fcol, fkind));

  streetCars.forEach((car) => {
    if (car.axis === 'h') {
      car.x += car.speed;
      if (car.x > W + 110) car.x = -110;
      if (car.x < -110) car.x = W + 110;
    } else {
      car.y += car.speed;
      if (car.y > H + 110) car.y = 220;
      if (car.y < 220) car.y = H + 110;
    }

    const kind: StreetVehicleKind = car.kind || 'car';
    ctx.save();
    ctx.translate(car.x, car.y);
    if (car.axis === 'v') {
      ctx.rotate(car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    } else if (car.dir < 0) {
      ctx.scale(-1, 1);
    }
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2.3;

    let headX = 34;
    if (kind === 'moto') {
      // Sporty Motorbike / Scooter + helmeted rider!
      headX = 20;
      const bounce = Math.sin(Date.now() / 85 + car.x * 0.05) * 0.9;
      ctx.translate(0, bounce);
      // Two wheels
      ctx.fillStyle = '#1E293B';
      ctx.beginPath(); ctx.arc(-14, 7, 7, 0, Math.PI * 2); ctx.arc(14, 7, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath(); ctx.arc(-14, 7, 2.8, 0, Math.PI * 2); ctx.arc(14, 7, 2.8, 0, Math.PI * 2); ctx.fill();
      // Exhaust puff
      ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
      ctx.beginPath(); ctx.arc(-25, 4, 3.5, 0, Math.PI * 2); ctx.arc(-32, 2, 2.5, 0, Math.PI * 2); ctx.fill();
      // Motorbike frame & handlebar
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.moveTo(-16, 4); ctx.lineTo(-6, -7); ctx.lineTo(10, -7); ctx.lineTo(18, 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, -7); ctx.lineTo(13, -16); ctx.lineTo(7, -17); ctx.stroke();
      // Rider + helmet
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.roundRect(-7, -18, 11, 13, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath(); ctx.arc(-1, -24, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0EA5E9';
      ctx.fillRect(1, -26, 5.5, 4);
      // Headlight
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath(); ctx.arc(18, -3, 3.2, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'bike') {
      // Classic Bicycle + cyclist
      headX = 18;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(-13, 6, 7.5, 0, Math.PI * 2); ctx.arc(13, 6, 7.5, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = car.color;
      ctx.beginPath();
      ctx.moveTo(-13, 6); ctx.lineTo(-2, -6); ctx.lineTo(10, -6); ctx.lineTo(13, 6); ctx.moveTo(-2, -6); ctx.lineTo(2, 6);
      ctx.stroke();
      ctx.strokeStyle = '#2C3E50';
      // Cyclist
      ctx.fillStyle = car.color;
      ctx.beginPath(); ctx.roundRect(-6, -18, 9, 12, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFE0BD';
      ctx.beginPath(); ctx.arc(0, -23, 5.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath(); ctx.arc(0, -25, 5.5, Math.PI, 0); ctx.fill(); ctx.stroke();
    } else if (kind === 'bus') {
      // City / School Mini-Bus
      headX = 46;
      ctx.fillStyle = car.color;
      ctx.beginPath(); ctx.roundRect(-46, -26, 92, 35, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#BAE6FD';
      for (let wx = -38; wx <= 22; wx += 20) {
        ctx.fillRect(wx, -21, 15, 13); ctx.strokeRect(wx, -21, 15, 13);
      }
      ctx.fillStyle = '#1C2833';
      ctx.beginPath(); ctx.arc(-28, 10, 8.5, 0, Math.PI * 2); ctx.arc(28, 10, 8.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(42, -8, 5, 7);
    } else if (kind === 'truck') {
      // Ice-cream / Delivery Truck
      headX = 40;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.roundRect(-40, -26, 50, 34, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = car.color;
      ctx.beginPath(); ctx.roundRect(10, -18, 28, 26, [4, 9, 4, 4]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#BAE6FD';
      ctx.fillRect(16, -14, 16, 11); ctx.strokeRect(16, -14, 16, 11);
      ctx.font = '15px Arial'; ctx.textAlign = 'center';
      ctx.fillText('🍦', -15, -4);
      ctx.fillStyle = '#1C2833';
      ctx.beginPath(); ctx.arc(-24, 9, 8, 0, Math.PI * 2); ctx.arc(24, 9, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(35, -7, 4, 6);
    } else {
      // Sedan car
      ctx.fillStyle = car.color;
      ctx.beginPath(); ctx.roundRect(-34, -15, 68, 24, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#AED6F1';
      ctx.beginPath(); ctx.roundRect(-18, -26, 36, 13, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1C2833';
      ctx.beginPath(); ctx.arc(-20, 10, 8, 0, Math.PI * 2); ctx.arc(20, 10, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F9E79F';
      ctx.fillRect(30, -9, 5, 7);
    }

    if (lighting.isNight) {
      const beam = ctx.createLinearGradient(headX, -5, headX + 100, -5);
      beam.addColorStop(0, 'rgba(255, 243, 176, 0.5)');
      beam.addColorStop(1, 'rgba(255, 243, 176, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath(); ctx.moveTo(headX, -10); ctx.lineTo(headX + 100, -35); ctx.lineTo(headX + 100, 25); ctx.lineTo(headX, 0); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  });

  // 1. Công viên & Bảng Tiếng Anh
  const engPark = getLoc('eng_park', 175, 425);
  const engParkDrawY = engPark.y - 70;
  ctx.fillStyle = '#F9E79F';
  ctx.beginPath(); ctx.arc(engPark.x, engParkDrawY, 75, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#F39C12'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#27AE60';
  ctx.beginPath(); ctx.roundRect(engPark.x - 55, engParkDrawY - 35, 110, 48, 8); ctx.fill();
  ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 12px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💬 CÔNG VIÊN', engPark.x, engParkDrawY - 15);
  ctx.fillText('TIẾNG ANH', engPark.x, engParkDrawY + 3);

  // 2. Quảng trường Đài Phun Nước
  const plaza = getLoc('fountain_plaza', 280, 1420);
  ctx.fillStyle = '#FDEBD0';
  ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y, 155, 95, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#E67E22'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#5DADE2';
  ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y - 5, 68, 42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2C3E50'; ctx.lineWidth = 3; ctx.stroke();
  const ripple = ((Date.now() % 1400) / 1400);
  ctx.strokeStyle = `rgba(255,255,255,${(0.75 * (1 - ripple)).toFixed(2)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(plaza.x, plaza.y - 5, 16 + ripple * 45, 9 + ripple * 27, 0, 0, Math.PI * 2); ctx.stroke();
  const spray = Math.sin(Date.now() / 160) * 5;
  ctx.fillStyle = '#EBF5FB';
  ctx.beginPath(); ctx.arc(plaza.x, plaza.y - 25 - spray, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2C3E50';
  ctx.font = 'bold 13px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`⛲ QUẢNG TRƯỜNG ${brand.toUpperCase()} (+2⭐)`, plaza.x, plaza.y + 68);

  // 3. Góc Đọc Sách Ngoài Trời
  const reading = getLoc('reading_corner', 1540, 1400);
  ctx.fillStyle = '#E8F8F5';
  ctx.beginPath(); ctx.roundRect(reading.x - 130, reading.y - 75, 260, 145, 22); ctx.fill();
  ctx.strokeStyle = '#16A085'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#117864';
  ctx.font = 'bold 14px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📚 GÓC ĐỌC SÁCH & THƯ GIÃN', reading.x, reading.y - 45);
  ctx.font = '32px Arial';
  ctx.fillText('📖  🪑  🌿  ☕', reading.x, reading.y + 5);

  // 4. Sân Bóng Đá Mini Gia Đình
  const soccer = getLoc('soccer', 2060, 1400);
  const sxLeft = soccer.x - 170;
  const syTop = soccer.y - 105;
  for (let si = 0; si < 8; si++) {
    ctx.fillStyle = si % 2 === 0 ? '#1E8449' : '#239B56';
    ctx.fillRect(sxLeft + si * 42.5, syTop, 42.5, 210);
  }
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(sxLeft, syTop, 340, 210);
  ctx.beginPath();
  ctx.moveTo(soccer.x, syTop); ctx.lineTo(soccer.x, syTop + 210);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(soccer.x, soccer.y, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(sxLeft, soccer.y - 55, 44, 110);
  ctx.strokeRect(sxLeft + 296, soccer.y - 55, 44, 110);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(sxLeft - 16, soccer.y - 32, 16, 64);
  ctx.strokeRect(sxLeft - 16, soccer.y - 32, 16, 64);
  ctx.fillRect(sxLeft + 340, soccer.y - 32, 16, 64);
  ctx.strokeRect(sxLeft + 340, soccer.y - 32, 16, 64);
  ctx.fillStyle = '#EF4444';
  [[sxLeft, syTop], [sxLeft + 340, syTop], [sxLeft, syTop + 210], [sxLeft + 340, syTop + 210]].forEach(([fx, fy]) => {
    ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2); ctx.fill();
  });
  const ballOffset = Math.sin(Date.now() / 360) * 26;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(soccer.x + ballOffset, soccer.y + 6, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(soccer.x + ballOffset, soccer.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.arc(soccer.x + ballOffset, soccer.y, 3.2, 0, Math.PI * 2); ctx.fill();

  const soccerTitle = `⚽ SÂN BÓNG ĐÁ ${brand.toUpperCase()} (MIỄN PHÍ)`;
  ctx.font = 'bold 12px Fredoka, sans-serif';
  const sBannerW = Math.max(210, ctx.measureText(soccerTitle).width + 26);
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(soccer.x - sBannerW / 2, syTop - 33, sBannerW, 26, 8); ctx.fill();
  ctx.fillStyle = '#FACC15';
  ctx.textAlign = 'center';
  ctx.fillText(soccerTitle, soccer.x, syTop - 16);

  if (soccerRoomState && (soccerRoomState.status === 'playing' || soccerRoomState.status === 'lobby')) {
    const isLive = soccerRoomState.status === 'playing';
    const bannerTxt = isLive
      ? `🔴 LIVE 1v1: ${soccerRoomState.p1Name} ${soccerRoomState.p1Goals}-${soccerRoomState.p2Goals} ${soccerRoomState.p2Name || '?'} • Bấm để XEM!`
      : `🟡 PHÒNG CHỜ 2P: ${soccerRoomState.p1Name} đang đợi đối thủ!`;
    ctx.save();
    ctx.font = 'bold 12px Fredoka, sans-serif';
    const sbw = ctx.measureText(bannerTxt).width + 24;
    ctx.fillStyle = isLive ? '#DC2626' : '#D97706';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(soccer.x - sbw / 2, syTop - 67, sbw, 26, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(bannerTxt, soccer.x, syTop - 50);
    ctx.restore();
  }

  // Plots & Family House (respect custom house override!)
  const houseOverride = state.buildingLayouts?.house;
  PLOTS.forEach((p, idx) => {
    if (idx === state.house.plotIndex && !houseOverride) {
      drawStreetTownhouse(ctx, p.x, p.y, state.house.style, lighting, brand, 'classic');
    } else if (!(houseOverride && idx === state.house.plotIndex)) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.strokeStyle = '#2C3E50';
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.roundRect(p.x - 80, p.y - 45, 160, 95, 12); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#2C3E50';
      ctx.font = 'bold 12px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🌱 ${p.label}`, p.x, p.y + 5);
    }
  });
  if (houseOverride) {
    const hLoc = getLoc('house', PLOTS[1].x, PLOTS[1].y + 85);
    drawStreetTownhouse(ctx, hLoc.x, hLoc.y - 85, state.house.style, lighting, brand, hLoc.shape);
  }

  // 5. Siêu Thị Gia Đình
  const sup = getLoc('supermarket', 1560, 410);
  drawShopBuilding(ctx, sup.x, sup.y - 65, {
    buildingType: 'supermarket',
    title: formatFamilyBrand('🏪 SIÊU THỊ GIA ĐÌNH B2KS', brand),
    shape: sup.shape,
    npcName: 'Thu Ngân Linh', npcHairStyle: 'long', npcHairColor: '#4E342E',
    npcShirtColor: '#E67E22', npcShirtPattern: 'collar', npcPantsColor: '#2C3E50', npcPantsStyle: 'skirt', npcOutfit: ''
  }, lighting);

  // 5B. TRUNG TÂM GIAO DỊCH XUYÊN THẾ GIỚI
  const cw = getLoc('cross_world', 1980, 410);
  drawShopBuilding(ctx, cw.x, cw.y - 65, {
    buildingType: 'cross_world',
    title: '🌌 TRUNG TÂM XUYÊN THẾ GIỚI',
    shape: cw.shape,
    npcName: 'Thủ Kho Orion', npcHairStyle: 'spiky', npcHairColor: '#4F46E5',
    npcShirtColor: '#D97706', npcShirtPattern: 'star', npcPantsColor: '#1E1B4B', npcPantsStyle: 'pants', npcOutfit: '👑'
  }, lighting);

  // 6. KHU VUI CHƠI ONLINE
  const arc = getLoc('arcade', 950, 790);
  drawShopBuilding(ctx, arc.x, arc.y - 65, {
    buildingType: 'arcade',
    title: '🕹️ KHU VUI CHƠI ONLINE (1⭐)',
    shape: arc.shape,
    npcName: 'Quản Trò Bin', npcHairStyle: 'spiky', npcHairColor: '#2C3E50',
    npcShirtColor: '#E74C3C', npcShirtPattern: 'star', npcPantsColor: '#2980B9', npcPantsStyle: 'shorts', npcOutfit: '🎮'
  }, lighting);
  if (arcadeRoomState && (arcadeRoomState.status === 'lobby' || arcadeRoomState.status === 'playing')) {
    const isLive = arcadeRoomState.status === 'playing';
    const cat = arcadeCatalog[arcadeRoomState.gameType];
    const bannerText = isLive
      ? `🔴 ĐANG ĐẤU: ${cat ? cat.shortTitle : 'Game'} (${arcadeRoomState.playerIds.length}P) - Bấm để XEM!`
      : `🟡 PHÒNG CHỜ: ${cat ? cat.shortTitle : 'Game'} (${arcadeRoomState.playerIds.length}P) - Lại gần để THAM GIA!`;
    ctx.save();
    ctx.font = 'bold 12px Fredoka, sans-serif';
    const bw = ctx.measureText(bannerText).width + 24;
    ctx.fillStyle = isLive ? '#C0392B' : '#D35400';
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(arc.x - bw / 2, arc.y - 212, bw, 26, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    ctx.fillText(bannerText, arc.x, arc.y - 195);
    ctx.restore();
  }

  // 6B. PHÒNG THÍ NGHIỆM SÁNG TẠO
  const lab = getLoc('lab', 1540, 790);
  drawShopBuilding(ctx, lab.x, lab.y - 65, {
    buildingType: 'lab',
    title: formatFamilyBrand('🧪 PHÒNG THÍ NGHIỆM B2KS', brand),
    shape: lab.shape,
    npcName: 'Giáo Sư Neo', npcHairStyle: 'spiky', npcHairColor: '#38BDF8',
    npcShirtColor: '#0284C7', npcShirtPattern: 'star', npcPantsColor: '#1E293B', npcPantsStyle: 'pants', npcOutfit: '🥽'
  }, lighting);

  // 6C. CHỢ TRỜI
  const flea = getLoc('flea_market', 1980, 790);
  drawShopBuilding(ctx, flea.x, flea.y - 65, {
    buildingType: 'flea_market',
    title: formatFamilyBrand('🎪 CHỢ TRỜI B2KS', brand),
    shape: flea.shape,
    npcName: 'Cô Tám Chợ Trời', npcHairStyle: 'pigtails', npcHairColor: '#92400E',
    npcShirtColor: '#F59E0B', npcShirtPattern: 'collar', npcPantsColor: '#78350F', npcPantsStyle: 'skirt', npcOutfit: '👒'
  }, lighting);

  // 7. Trung Tâm Tiếng Anh
  const eng = getLoc('english_center', 250, 925);
  drawShopBuilding(ctx, eng.x, eng.y - 65, {
    buildingType: 'english',
    title: formatFamilyBrand('🎓 TRUNG TÂM TIẾNG ANH B2KS', brand),
    shape: eng.shape,
    npcName: 'Cô Giáo Mai', npcHairStyle: 'long', npcHairColor: '#4E342E',
    npcShirtColor: '#16A085', npcShirtPattern: 'collar', npcPantsColor: '#2C3E50', npcPantsStyle: 'skirt', npcOutfit: '🎓'
  }, lighting);

  // 8. Cửa Hàng Thời Trang
  const fash = getLoc('fashion', 600, 945);
  drawShopBuilding(ctx, fash.x, fash.y - 65, {
    buildingType: 'fashion',
    title: '👗 CỬA HÀNG THỜI TRANG',
    shape: fash.shape,
    npcName: 'Nhà Thiết Kế Vy', npcHairStyle: 'pigtails', npcHairColor: '#8E44AD',
    npcShirtColor: '#E91E63', npcShirtPattern: 'heart', npcPantsColor: '#8E44AD', npcPantsStyle: 'skirt', npcOutfit: '🎀'
  }, lighting);

  // 9. Salon Tóc Nghệ Thuật
  const salon = getLoc('salon', 1760, 975);
  drawShopBuilding(ctx, salon.x, salon.y - 65, {
    buildingType: 'salon',
    title: '💇 SALON TÓC NGHỆ THUẬT',
    shape: salon.shape,
    npcName: 'Stylist Tuấn Anh', npcHairStyle: 'spiky', npcHairColor: '#2980B9',
    npcShirtColor: '#8E44AD', npcShirtPattern: 'vest', npcPantsColor: '#2C3E50', npcPantsStyle: 'pants', npcOutfit: ''
  }, lighting);

  // 10. SỞ THÚ ẢO
  const zoo = getLoc('zoo', 820, 1485);
  drawShopBuilding(ctx, zoo.x, zoo.y - 65, {
    buildingType: 'zoo',
    title: formatFamilyBrand('🦁 SỞ THÚ ẢO B2KS ZOO', brand),
    shape: zoo.shape,
    npcName: 'Hướng Dẫn Viên Bi', npcHairStyle: 'short', npcHairColor: '#78350F',
    npcShirtColor: '#15803D', npcShirtPattern: 'collar', npcPantsColor: '#B45309', npcPantsStyle: 'shorts', npcOutfit: '🤠'
  }, lighting);

  // 11. CỬA HÀNG THÚ CƯNG
  const petShop = getLoc('pet_shop', 2345, 410);
  drawShopBuilding(ctx, petShop.x, petShop.y - 65, {
    buildingType: 'pet_shop',
    title: formatFamilyBrand('🐾 CỬA HÀNG THÚ CƯNG B2KS', brand),
    shape: petShop.shape,
    npcName: 'Cô My Thú Cưng', npcHairStyle: 'ponytail', npcHairColor: '#D97706',
    npcShirtColor: '#EC4899', npcShirtPattern: 'heart', npcPantsColor: '#7C3AED', npcPantsStyle: 'skirt', npcOutfit: '🎀'
  }, lighting);

  const treeCoords: [number, number, TreeKind][] = [
    [60, 290, 'sakura'], [285, 290, 'pine'], [490, 315, 'orange'], [640, 320, 'oak'], [1065, 310, 'sakura'],
    [1365, 300, 'pine'], [1760, 315, 'orange'], [2180, 330, 'palm'],
    [80, 730, 'oak'], [420, 685, 'sakura'], [770, 745, 'pine'], [1360, 740, 'orange'], [2220, 760, 'palm'],
    [90, 1290, 'sakura'], [560, 1340, 'oak'], [1080, 1360, 'pine'], [1350, 1290, 'orange'], [2340, 1490, 'palm'],
    [1830, 1320, 'sakura'], [2430, 790, 'oak']
  ];
  treeCoords.forEach(([tx, ty, tkind]) => drawCuteTree(ctx, tx, ty, tkind));

  const lampX = [250, 680, 1080, 1420, 1820, 2240];
  [425, 985].forEach((ly) => {
    lampX.forEach((lx) => drawStreetLamp(ctx, lx, ly, lighting.isNight));
  });

  // Ambient live weather particles & atmosphere overlay
  const nowMs = Date.now();
  if (wCond === 'rain' || wCond === 'thunder') {
    ctx.save();
    ctx.fillStyle = wCond === 'thunder' ? 'rgba(15, 23, 42, 0.24)' : 'rgba(30, 41, 59, 0.14)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 160; i++) {
      const rx = ((i * 193 + (nowMs * 0.45)) % (W + 120)) - 60;
      const ry = ((i * 137 + (nowMs * 0.95)) % H);
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 6, ry + 18);
    }
    ctx.stroke();
    if (wCond === 'thunder' && Math.floor(nowMs / 180) % 41 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 240, 0.25)';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  } else if (wCond === 'snow') {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < 95; i++) {
      const sx = ((i * 211 + Math.sin(nowMs / 900 + i) * 35) % W + W) % W;
      const sy = ((i * 113 + nowMs * 0.08) % H);
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (wCond === 'fog') {
    ctx.save();
    ctx.fillStyle = 'rgba(226, 232, 240, 0.28)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else if (lighting.phase === 'night') {
    // Soft evening fireflies
    ctx.save();
    ctx.fillStyle = 'rgba(253, 224, 71, 0.78)';
    for (let i = 0; i < 24; i++) {
      const fx = ((i * 257) % (W - 100)) + 50 + Math.sin(nowMs / 650 + i) * 16;
      const fy = ((i * 179) % (H - 350)) + 280 + Math.cos(nowMs / 520 + i) * 12;
      ctx.beginPath();
      ctx.arc(fx, fy, 2.2 + Math.sin(nowMs / 240 + i) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawHouseInteriorWorld(
  ctx: CanvasRenderingContext2D,
  lighting: LightingInfo,
  rooms: HouseRoomDef[],
  wardrobeOpenedRoomId: string | null,
  me: Member,
  state: B2KSState,
  findAnyCatalogItem: (id: string) => any
) {
  const f1Living = rooms.find((r) => r.id === 'f1_living');
  const yShift = f1Living ? Math.max(0, f1Living.y - 570) : 0;
  const totalFloors = 3 + Math.round(yShift / 230);
  const W = HOUSE_WORLD.width;
  const H = HOUSE_WORLD.height + yShift;
  const brand = ((state.familyName || 'B2KS').trim() || 'B2KS').toUpperCase();

  ctx.fillStyle = '#1C2833';
  ctx.fillRect(-100, -100, W + 200, H + 200);

  ctx.fillStyle = '#F8F9F9';
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 6;
  ctx.fillRect(85, 95, 950, 670 + yShift);
  ctx.strokeRect(85, 95, 950, 670 + yShift);

  ctx.fillStyle = '#C0392B';
  ctx.beginPath();
  ctx.moveTo(60, 95); ctx.lineTo(560, 20); ctx.lineTo(1060, 95);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 17px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🏢 NHÀ PHỐ GIA ĐÌNH ${brand} (${totalFloors} TẦNG)`, 560, 68);

  ctx.fillStyle = '#EBEDEF';
  ctx.fillRect(500, 110, 120, 640 + yShift);
  ctx.fillStyle = '#D5DBDB';
  for (let sy = 175; sy < 720 + yShift; sy += 24) {
    ctx.fillRect(528, sy, 64, 10);
    ctx.strokeStyle = '#AEB6BF';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(528, sy, 64, 10);
  }

  ctx.fillStyle = '#8E44AD';
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 3;
  ctx.fillRect(528, 718 + yShift, 64, 34);
  ctx.strokeRect(528, 718 + yShift, 64, 34);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 11px Fredoka, sans-serif';
  ctx.fillText('🚪 RA PHỐ', 560, 739 + yShift);

  rooms.forEach((r) => {
    ctx.fillStyle = r.isDisabled ? '#CBD5E1' : r.wall;
    ctx.fillRect(r.x, r.y, r.w, r.h);

    ctx.fillStyle = r.isDisabled ? '#94A3B8' : r.floor;
    ctx.fillRect(r.x, r.y + r.h - 65, r.w, 65);

    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 4;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    ctx.fillStyle = r.isDisabled ? 'rgba(51, 65, 85, 0.85)' : 'rgba(44, 62, 80, 0.85)';
    ctx.beginPath();
    ctx.roundRect(r.x + 12, r.y + 8, r.w - 24, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    const lockBadge = r.isDisabled
      ? ' 🚫'
      : r.ownerIds && r.ownerIds.length > 0
        ? (r.isUnlocked ? ' 🔓' : ' 🔒')
        : '';
    ctx.fillText(r.name + lockBadge, r.x + r.w / 2, r.y + 24);

    const doorX = r.doorSide === 'right' ? r.x + r.w - 6 : r.x - 6;
    const doorY = r.y + r.h - 90;
    const doorH = 85;

    if (r.isDisabled) {
      // Blocked vacant bedroom (wooden boards + frosted overlay)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(doorX, doorY, 12, doorH);
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(doorX, doorY, 12, doorH);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.beginPath();
      ctx.roundRect(r.x + 48, r.y + 82, r.w - 96, 48, 10);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 12px Fredoka, sans-serif';
      ctx.fillText('🚫 PHÒNG CHƯA SỬ DỤNG', r.x + r.w / 2, r.y + 104);
      ctx.font = '10.5px Fredoka, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText('Tự mở khi gia đình thêm thành viên', r.x + r.w / 2, r.y + 121);
    } else if (r.ownerIds && r.ownerIds.length > 0 && !r.isUnlocked) {
      ctx.fillStyle = '#873600';
      ctx.fillRect(doorX, doorY, 12, doorH);
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(doorX, doorY, 12, doorH);
      ctx.font = '18px Arial';
      ctx.fillText('🔒', doorX + 6, doorY + 45);
    } else {
      ctx.fillStyle = r.floor;
      ctx.fillRect(doorX - 2, doorY, 16, doorH);
      ctx.fillStyle = '#A04000';
      ctx.fillRect(r.doorSide === 'right' ? doorX - 24 : doorX + 12, doorY, 24, 9);
    }
  });

  // Phòng khách (Tầng 1 trái)
  ctx.fillStyle = '#E74C3C';
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(135, 670 + yShift, 125, 45, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2C3E50';
  ctx.fillRect(295, 595 + yShift, 50, 26);
  ctx.fillStyle = '#3498DB';
  ctx.fillRect(298, 598 + yShift, 44, 18);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 9px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📺 TV', 320, 610 + yShift);
  ctx.fillStyle = '#2C3E50';
  ctx.fillRect(405, 620 + yShift, 44, 34);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 10px Fredoka, sans-serif';
  ctx.fillText('📋 BẢNG', 427, 640 + yShift);

  // Phòng ăn (Tầng 1 phải)
  ctx.fillStyle = '#A04000';
  ctx.beginPath(); ctx.ellipse(830, 665 + yShift, 62, 32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.font = '20px Arial';
  ctx.fillText('🍲 🍗 🥗', 830, 671 + yShift);

  // Phòng bố mẹ (Tầng 2 phải)
  ctx.fillStyle = '#8E44AD';
  ctx.beginPath(); ctx.roundRect(875, 405 + yShift, 115, 78, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFF';
  ctx.fillRect(888, 412 + yShift, 36, 16);
  ctx.fillRect(938, 412 + yShift, 36, 16);

  // Các phòng ngủ của con (Tầng 3, 4, 5...) - chỉ vẽ giường cho phòng đang hoạt động
  const kidPalette = ['#3498DB', '#2ECC71', '#EC4899', '#F59E0B', '#8B5CF6', '#14B8A6'];
  let kidBedIdx = 0;
  rooms.forEach((r) => {
    if (r.id.startsWith('f1_') || r.id.startsWith('f2_')) return;
    if (r.isDisabled) return;
    const bedColor = kidPalette[kidBedIdx % kidPalette.length];
    kidBedIdx++;
    const bedX = r.doorSide === 'right' ? r.x + 30 : r.x + r.w - 125;
    const bedY = r.y + 65;
    ctx.fillStyle = bedColor;
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(bedX, bedY, 85, 68, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.fillRect(bedX + 13, bedY + 7, 42, 14);
  });

  rooms.forEach((r) => {
    if (!r.wardrobe || r.isDisabled) return;
    const wx = r.wardrobe.x;
    const wy = r.wardrobe.y;
    const isOpen = wardrobeOpenedRoomId === r.id;
    const isOwner = r.ownerIds && r.ownerIds.includes(me.id);

    ctx.save();
    ctx.fillStyle = '#873600';
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(wx - 24, wy, 48, 56, 5);
    ctx.fill();
    ctx.stroke();

    if (isOpen) {
      ctx.fillStyle = '#3E2723';
      ctx.fillRect(wx - 20, wy + 5, 40, 44);
      ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71'].forEach((col, ci) => {
        ctx.fillStyle = col;
        ctx.fillRect(wx - 17 + ci * 9, wy + 10, 7, 18);
      });
    } else {
      ctx.fillStyle = '#A04000';
      ctx.fillRect(wx - 20, wy + 5, 18, 44);
      ctx.strokeRect(wx - 20, wy + 5, 18, 44);
      ctx.fillRect(wx + 2, wy + 5, 18, 44);
      ctx.strokeRect(wx + 2, wy + 5, 18, 44);
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.arc(wx - 4, wy + 27, 2.2, 0, Math.PI * 2);
      ctx.arc(wx + 4, wy + 27, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = isOwner ? '#27AE60' : '#34495E';
    ctx.beginPath();
    ctx.roundRect(wx - 26, wy - 15, 52, 13, 4);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 8.5px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isOwner ? '🧥 Tủ đồ' : '🔒 Tủ riêng', wx, wy - 5.5);
    ctx.restore();
  });

  // Phòng sinh hoạt chung (Tầng 2 trái) — Tủ Sách Truyện Tranh Tiếng Anh Gia Đình
  const f2CommonRoom = rooms.find((r) => r.id === 'f2_common');
  const bx = 165;
  const by = f2CommonRoom ? f2CommonRoom.y + 46 : 386 + yShift;

  ctx.save();
  // Thảm đọc sách ấm áp
  ctx.fillStyle = '#FCE7F3';
  ctx.strokeStyle = '#EC4899';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(bx + 110, by + 102, 92, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tủ sách gỗ 3 tầng lớn
  ctx.fillStyle = '#78350F';
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(bx, by, 118, 82, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#451A03';
  [by + 10, by + 34, by + 58].forEach((sy) => {
    ctx.fillRect(bx + 7, sy, 104, 18);
  });

  const bookColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];
  [by + 12, by + 36, by + 60].forEach((sy, rowIdx) => {
    for (let bi = 0; bi < 8; bi++) {
      ctx.fillStyle = bookColors[(bi + rowIdx * 2) % bookColors.length];
      ctx.fillRect(bx + 10 + bi * 12, sy, 9, 15);
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 10 + bi * 12, sy, 9, 15);
    }
  });

  // Bàn trà nhỏ & truyện tranh đang mở
  ctx.fillStyle = '#D97706';
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(bx + 146, by + 54, 62, 34, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FEF3C7';
  ctx.fillRect(bx + 158, by + 60, 18, 14);
  ctx.fillRect(bx + 178, by + 60, 18, 14);
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx + 158, by + 60, 18, 14);
  ctx.strokeRect(bx + 178, by + 60, 18, 14);

  // Nhãn tủ sách
  ctx.fillStyle = '#0F766E';
  ctx.beginPath();
  ctx.roundRect(bx + 4, by - 19, 110, 16, 6);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 9.5px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📚 TỦ SÁCH TRUYỆN', bx + 59, by - 8);
  ctx.restore();

  state.members.forEach((m) => {
    m.roomDecor.forEach((d) => {
      if (d.id === 'd_bookshelf') return;
      drawWorldDecorItem(ctx, d.id, d.x, d.y + yShift, findAnyCatalogItem);
    });
  });

  if (lighting.isNight) {
    rooms.forEach((r) => {
      if (r.isDisabled) return;
      const grad = ctx.createRadialGradient(r.x + r.w / 2, r.y + 45, 10, r.x + r.w / 2, r.y + 80, 180);
      grad.addColorStop(0, 'rgba(255, 243, 176, 0.36)');
      grad.addColorStop(1, 'rgba(255, 243, 176, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    });
  }
}

export function drawPrivateRoomWorld(
  ctx: CanvasRenderingContext2D,
  lighting: LightingInfo,
  room: HouseRoomDef | null,
  ownerMember: Member | null,
  me: Member,
  wardrobeOpenedRoomId: string | null,
  findAnyCatalogItem: (id: string) => any
) {
  const W = PRIVATE_ROOM_WORLD.width;
  const H = PRIVATE_ROOM_WORLD.height;
  const isOwner = Boolean(room && room.ownerIds && room.ownerIds.includes(me.id));

  ctx.fillStyle = '#1C2833';
  ctx.fillRect(-100, -100, W + 200, H + 200);

  const wallColor = (ownerMember && ownerMember.roomWall) || (room && room.wall) || '#D5F5E3';
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, W, 200);

  ctx.fillStyle = '#E59866';
  ctx.fillRect(0, 200, W, H - 200);

  ctx.strokeStyle = 'rgba(135, 54, 0, 0.16)';
  ctx.lineWidth = 2;
  for (let fy = 235; fy < H; fy += 35) {
    ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
  }

  ctx.fillStyle = '#873600';
  ctx.fillRect(0, 192, W, 10);

  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, W, H);

  ctx.fillStyle = lighting.isNight ? '#1C2541' : '#AED6F1';
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 3.5;
  ctx.fillRect(265, 42, 115, 88);
  ctx.strokeRect(265, 42, 115, 88);
  if (lighting.isNight) {
    ctx.fillStyle = '#F9E79F';
    ctx.beginPath(); ctx.arc(345, 68, 10, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(322.5, 42); ctx.lineTo(322.5, 130);
  ctx.moveTo(265, 86); ctx.lineTo(380, 86);
  ctx.stroke();

  ctx.fillStyle = '#8E44AD';
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(35, 145, 145, 110, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#F5EEF8';
  ctx.fillRect(44, 180, 127, 68);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(55, 154, 48, 20);
  ctx.fillRect(112, 154, 48, 20);
  ctx.fillStyle = '#2C3E50';
  ctx.font = 'bold 11px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🛏️ Giường ngủ', 107, 136);

  const isWardrobeOpen = Boolean(room && wardrobeOpenedRoomId === room.id);
  ctx.fillStyle = '#873600';
  ctx.beginPath(); ctx.roundRect(625, 95, 95, 135, 8); ctx.fill(); ctx.stroke();
  if (isWardrobeOpen) {
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(634, 105, 77, 110);
    ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71'].forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(640 + i * 17, 115, 13, 38);
    });
  } else {
    ctx.fillStyle = '#A04000';
    ctx.fillRect(633, 105, 37, 108); ctx.strokeRect(633, 105, 37, 108);
    ctx.fillRect(674, 105, 37, 108); ctx.strokeRect(674, 105, 37, 108);
    ctx.fillStyle = '#F1C40F';
    ctx.beginPath(); ctx.arc(665, 158, 3.5, 0, Math.PI * 2); ctx.arc(679, 158, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = isOwner ? '#27AE60' : '#34495E';
  ctx.beginPath(); ctx.roundRect(628, 68, 88, 20, 6); ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 11px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isOwner ? '🧥 Tủ quần áo' : '🔒 Tủ riêng', 672, 82);

  ctx.fillStyle = '#FADBD8';
  ctx.strokeStyle = '#E6B0AA';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(380, 290, 155, 52, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  const slotsMap = (ownerMember && ownerMember.roomSlots) || {};
  ROOM_DECOR_SLOTS.forEach((slot) => {
    const placedId = slotsMap[slot.id];
    const placedItem = placedId ? findAnyCatalogItem(placedId) : null;
    const slotScale = placedItem?.sizeScale || (placedItem?.labSpec?.sizeScale) || 1;
    const rx = Math.round(32 * Math.max(0.85, Math.min(1.45, slotScale)));
    const ry = Math.round(12 * Math.max(0.85, Math.min(1.45, slotScale)));
    ctx.save();
    ctx.strokeStyle = placedId ? 'rgba(44, 62, 80, 0.35)' : 'rgba(44, 62, 80, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(slot.x, slot.y + 18, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (placedId) {
      drawWorldDecorItem(ctx, placedId, slot.x, slot.y, findAnyCatalogItem);
    } else if (isOwner) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2C3E50';
      ctx.font = 'bold 14px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+', slot.x, slot.y + 5);
    }
    ctx.restore();
  });

  ctx.fillStyle = '#6E2C00';
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(330, H - 36, 100, 36, [8, 8, 0, 0]);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F9E79F';
  ctx.fillRect(342, H - 30, 32, 14);
  ctx.fillRect(386, H - 30, 32, 14);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 10.5px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🚪 RA HÀNH LANG', 380, H - 5);

  if (lighting.isNight) {
    const grad = ctx.createRadialGradient(380, 120, 15, 380, 160, 260);
    grad.addColorStop(0, 'rgba(255, 243, 176, 0.34)');
    grad.addColorStop(1, 'rgba(255, 243, 176, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
}

export function drawNeighborhoodMinimap(
  ctx: CanvasRenderingContext2D,
  mw: number,
  mh: number,
  state: B2KSState,
  me: Member,
  navTarget: NavDestination | null,
  locations: NavDestination[]
) {
  const sx = mw / STREET_WORLD.width;
  const sy = mh / STREET_WORLD.height;
  const now = Date.now();

  ctx.clearRect(0, 0, mw, mh);

  // Sky strip + Grass
  ctx.fillStyle = '#7DD3FC';
  ctx.fillRect(0, 0, mw, 240 * sy);
  ctx.fillStyle = '#4ADE80';
  ctx.fillRect(0, 225 * sy, mw, mh - 225 * sy);

  // Roads
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 465 * sy, mw, 130 * sy);
  ctx.fillRect(0, 1025 * sy, mw, 130 * sy);
  ctx.fillRect(1180 * sx, 225 * sy, 130 * sx, mh - 225 * sy);

  // Road dashes
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, 530 * sy); ctx.lineTo(mw, 530 * sy);
  ctx.moveTo(0, 1090 * sy); ctx.lineTo(mw, 1090 * sy);
  ctx.moveTo(1245 * sx, 230 * sy); ctx.lineTo(1245 * sx, mh);
  ctx.stroke();
  ctx.setLineDash([]);

  // Soccer green pitch box on minimap (synced to dynamic position!)
  const soccerLoc = locations.find((l) => l.id === 'soccer');
  const sPitchX = soccerLoc ? soccerLoc.x : 2060;
  const sPitchY = soccerLoc ? soccerLoc.y : 1400;
  ctx.fillStyle = '#15803D';
  ctx.fillRect((sPitchX - 170) * sx, (sPitchY - 105) * sy, 340 * sx, 210 * sy);

  // Landmarks / Buildings
  locations.forEach((loc) => {
    const lx = loc.x * sx;
    const ly = loc.y * sy;
    ctx.fillStyle = loc.color;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(lx, ly, loc.id === navTarget?.id ? 4.8 : 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // Other neighborhood family members
  state.members.forEach((m) => {
    if (m.id === me.id || m.scene !== 'neighborhood') return;
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(m.x * sx, m.y * sy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  const meMx = me.x * sx;
  const meMy = me.y * sy;

  // Navigation Route Line + Directional Arrow from Character -> Target
  if (navTarget) {
    const tx = navTarget.x * sx;
    const ty = navTarget.y * sy;
    const dx = tx - meMx;
    const dy = ty - meMy;
    const dist = Math.hypot(dx, dy);

    // Pulsing target halo
    const ringR = 5.5 + Math.sin(now / 160) * 2.2;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, ringR, 0, Math.PI * 2);
    ctx.stroke();

    if (dist > 3) {
      // Glowing dashed path
      ctx.save();
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -(now / 45) % 18;
      ctx.beginPath();
      ctx.moveTo(meMx, meMy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();

      // Animated Directional Arrow pointing from Player toward Destination
      const angle = Math.atan2(dy, dx);
      const arrowOffset = Math.min(dist * 0.45, 16 + Math.sin(now / 180) * 2.5);
      const ax = meMx + Math.cos(angle) * arrowOffset;
      const ay = meMy + Math.sin(angle) * arrowOffset;

      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-5, -5.5);
      ctx.lineTo(-2.5, 0);
      ctx.lineTo(-5, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Player dot (pulsing gold/red on top)
  ctx.fillStyle = '#FACC15';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(meMx, meMy, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

