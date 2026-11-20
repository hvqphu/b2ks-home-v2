import React from 'react';
import { ComicDialogue, ComicPage, ComicPanel, PanelSceneId } from '../game/comicBooks';

interface ComicPageSvgProps {
  page: ComicPage;
  accentColor: string;
  activeSpeechIdx?: number | null;
  onSpeakLine: (text: string, idx?: number) => void;
}

interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function getPanelRects(layout: ComicPage['layout'], count: number): PanelRect[] {
  const pad = 20;
  const gap = 16;
  const W = 820 - pad * 2; // 780
  const H = 1040 - pad * 2; // 1000

  if (count === 2) {
    const h1 = Math.round((H - gap) * 0.52);
    const h2 = H - gap - h1;
    return [
      { x: pad, y: pad, w: W, h: h1 },
      { x: pad, y: pad + h1 + gap, w: W, h: h2 }
    ];
  }

  if (count === 3) {
    if (layout === 'hero-left') {
      const wLeft = Math.round((W - gap) * 0.52);
      const wRight = W - gap - wLeft;
      const hRight = Math.round((H - gap) / 2);
      return [
        { x: pad, y: pad, w: wLeft, h: H },
        { x: pad + wLeft + gap, y: pad, w: wRight, h: hRight },
        { x: pad + wLeft + gap, y: pad + hRight + gap, w: wRight, h: H - hRight - gap }
      ];
    }
    const hTop = Math.round((H - gap) * 0.48);
    const hBot = H - gap - hTop;
    const wHalf = Math.round((W - gap) / 2);
    return [
      { x: pad, y: pad, w: W, h: hTop },
      { x: pad, y: pad + hTop + gap, w: wHalf, h: hBot },
      { x: pad + wHalf + gap, y: pad + hTop + gap, w: W - wHalf - gap, h: hBot }
    ];
  }

  // Default 4 panels (2x2 grid)
  const wHalf = Math.round((W - gap) / 2);
  const hHalf = Math.round((H - gap) / 2);
  return [
    { x: pad, y: pad, w: wHalf, h: hHalf },
    { x: pad + wHalf + gap, y: pad, w: W - wHalf - gap, h: hHalf },
    { x: pad, y: pad + hHalf + gap, w: wHalf, h: H - hHalf - gap },
    { x: pad + wHalf + gap, y: pad + hHalf + gap, w: W - wHalf - gap, h: H - hHalf - gap }
  ];
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxCharsPerLine && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function getSceneTheme(scene: PanelSceneId): {
  skyTop: string;
  skyBot: string;
  ground: string;
  stars?: boolean;
  sun?: boolean;
} {
  if (scene.startsWith('witch_')) {
    if (scene === 'witch_arena_stage' || scene === 'witch_sparkle_victory') {
      return { skyTop: '#312E81', skyBot: '#6D28D9', ground: '#DDD6FE', stars: true };
    }
    if (scene === 'witch_boom_mistake') {
      return { skyTop: '#7C2D12', skyBot: '#F59E0B', ground: '#FDE68A' };
    }
    return { skyTop: '#1E1B4B', skyBot: '#4C1D95', ground: '#78350F', stars: true };
  }
  if (scene.startsWith('ada_')) {
    if (scene === 'ada_classroom_chart' || scene === 'ada_certificate') {
      return { skyTop: '#E0F2FE', skyBot: '#BAE6FD', ground: '#FDE68A' };
    }
    return { skyTop: '#020617', skyBot: '#1E3A8A', ground: '#334155', stars: true };
  }
  if (scene.startsWith('milo_')) {
    if (scene === 'milo_concert') {
      return { skyTop: '#FEF3C7', skyBot: '#FDE68A', ground: '#D97706' };
    }
    if (scene === 'milo_water_tank') {
      return { skyTop: '#0F172A', skyBot: '#0E7490', ground: '#065F46', stars: true };
    }
    return { skyTop: '#0F172A', skyBot: '#115E59', ground: '#78350F', stars: true };
  }
  if (scene.startsWith('code_')) {
    if (scene === 'code_club_badge') {
      return { skyTop: '#EEF2FF', skyBot: '#C7D2FE', ground: '#F1F5F9' };
    }
    return { skyTop: '#0F172A', skyBot: '#312E81', ground: '#475569', stars: true };
  }
  // Emerald bay
  if (scene === 'bay_coral_glow' || scene === 'bay_ghost_net' || scene === 'bay_turtle_free') {
    return { skyTop: '#0369A1', skyBot: '#0D9488', ground: '#0F766E' };
  }
  return { skyTop: '#FDBA74', skyBot: '#38BDF8', ground: '#0D9488', sun: true };
}

function renderCharacterFigure(
  speaker: string,
  cx: number,
  cy: number,
  scale = 1
): React.ReactNode {
  const s = speaker.toLowerCase();
  const isCat = s.includes('carrot') || s.includes('pip');
  const isDrone = s.includes('drone') || s.includes('computer');

  if (isDrone) {
    return (
      <g transform={`translate(${cx},${cy}) scale(${scale})`}>
        <ellipse cx="0" cy="42" rx="28" ry="7" fill="rgba(0,0,0,0.22)" />
        <line x1="-34" y1="-20" x2="-14" y2="-8" stroke="#1E293B" strokeWidth="4" />
        <line x1="34" y1="-20" x2="14" y2="-8" stroke="#1E293B" strokeWidth="4" />
        <ellipse cx="-36" cy="-22" rx="18" ry="4" fill="#38BDF8" stroke="#0F172A" strokeWidth="2" />
        <ellipse cx="36" cy="-22" rx="18" ry="4" fill="#38BDF8" stroke="#0F172A" strokeWidth="2" />
        <rect x="-24" y="-16" width="48" height="32" rx="12" fill="#E2E8F0" stroke="#0F172A" strokeWidth="3" />
        <circle cx="0" cy="0" r="10" fill="#0EA5E9" stroke="#0F172A" strokeWidth="2.5" />
        <circle cx="-3" cy="-3" r="3" fill="#FFF" />
      </g>
    );
  }

  if (isCat) {
    const isRobotCat = s.includes('pip');
    const fur = isRobotCat ? '#CBD5E1' : '#F97316';
    const ear = isRobotCat ? '#38BDF8' : '#EA580C';
    return (
      <g transform={`translate(${cx},${cy}) scale(${scale})`}>
        <ellipse cx="0" cy="38" rx="22" ry="6" fill="rgba(0,0,0,0.22)" />
        {/* Tail */}
        <path d="M 16 26 Q 38 14 32 -6" fill="none" stroke={fur} strokeWidth="7" strokeLinecap="round" />
        <path d="M 16 26 Q 38 14 32 -6" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
        {/* Body */}
        <ellipse cx="0" cy="18" rx="18" ry="20" fill={fur} stroke="#1E293B" strokeWidth="2.5" />
        {/* Ears */}
        <polygon points="-16,-8 -20,-28 -4,-16" fill={ear} stroke="#1E293B" strokeWidth="2.5" />
        <polygon points="16,-8 20,-28 4,-16" fill={ear} stroke="#1E293B" strokeWidth="2.5" />
        {/* Head */}
        <circle cx="0" cy="-6" r="18" fill={fur} stroke="#1E293B" strokeWidth="2.5" />
        {/* Eyes */}
        <circle cx="-6" cy="-8" r="4" fill={isRobotCat ? '#22D3EE' : '#FEF08A'} stroke="#1E293B" strokeWidth="1.8" />
        <circle cx="6" cy="-8" r="4" fill={isRobotCat ? '#22D3EE' : '#FEF08A'} stroke="#1E293B" strokeWidth="1.8" />
        <circle cx="-6" cy="-8" r="1.6" fill="#0F172A" />
        <circle cx="6" cy="-8" r="1.6" fill="#0F172A" />
        <polygon points="-3,-1 3,-1 0,3" fill="#EC4899" />
      </g>
    );
  }

  // Human comic characters styled per story
  let hair = '#451A03';
  let shirt = '#2563EB';
  let skin = '#FDBA74';
  let isWitchHat = false;
  let hasGlasses = false;
  let hasHeadphones = false;

  if (s.includes('pepper')) {
    hair = '#581C87';
    shirt = '#7C3AED';
    skin = '#FED7AA';
    isWitchHat = true;
  } else if (s.includes('saffron')) {
    hair = '#B91C1C';
    shirt = '#D97706';
    skin = '#FED7AA';
    isWitchHat = true;
  } else if (s.includes('ada')) {
    hair = '#451A03';
    shirt = '#EAB308';
    skin = '#FDBA74';
    hasGlasses = true;
  } else if (s.includes('milo')) {
    hair = '#1E293B';
    shirt = '#F59E0B';
    skin = '#C2855A';
    hasHeadphones = true;
  } else if (s.includes('linh') || s.includes('maya')) {
    hair = '#1E293B';
    shirt = '#EC4899';
    skin = '#FDBA74';
  } else if (s.includes('sam') || s.includes('ben') || s.includes('leo')) {
    hair = '#78350F';
    shirt = '#16A34A';
    skin = '#FED7AA';
  } else if (s.includes('ranger') || s.includes('judge') || s.includes('hoa') || s.includes('principal') || s.includes('teacher') || s.includes('lin')) {
    hair = '#334155';
    shirt = '#0F766E';
    skin = '#FDBA74';
  }

  return (
    <g transform={`translate(${cx},${cy}) scale(${scale})`}>
      <ellipse cx="0" cy="48" rx="26" ry="7" fill="rgba(0,0,0,0.24)" />
      {/* Arms */}
      <rect x="-26" y="4" width="10" height="24" rx="5" fill={shirt} stroke="#1E293B" strokeWidth="2.5" />
      <rect x="16" y="4" width="10" height="24" rx="5" fill={shirt} stroke="#1E293B" strokeWidth="2.5" />
      {/* Torso */}
      <rect x="-18" y="2" width="36" height="34" rx="9" fill={shirt} stroke="#1E293B" strokeWidth="2.8" />
      {/* Back Hair */}
      <circle cx="0" cy="-22" r="24" fill={hair} stroke="#1E293B" strokeWidth="2.5" />
      {/* Face */}
      <circle cx="0" cy="-20" r="20" fill={skin} stroke="#1E293B" strokeWidth="2.8" />
      {/* Eyes */}
      <circle cx="-7" cy="-21" r="3.4" fill="#1E293B" />
      <circle cx="7" cy="-21" r="3.4" fill="#1E293B" />
      <circle cx="-8" cy="-22.2" r="1.2" fill="#FFF" />
      <circle cx="6" cy="-22.2" r="1.2" fill="#FFF" />
      {/* Cheeks */}
      <ellipse cx="-12" cy="-15" rx="3.5" ry="2" fill="rgba(244,63,94,0.4)" />
      <ellipse cx="12" cy="-15" rx="3.5" ry="2" fill="rgba(244,63,94,0.4)" />
      {/* Smile */}
      <path d="M -5 -12 Q 0 -7 5 -12" fill="none" stroke="#991B1B" strokeWidth="2.3" strokeLinecap="round" />
      {/* Front Hair */}
      <path d="M -20 -24 Q -8 -40 0 -28 Q 10 -40 20 -24 Q 10 -34 -20 -24 Z" fill={hair} stroke="#1E293B" strokeWidth="2.2" />
      {hasGlasses && (
        <g stroke="#1E293B" strokeWidth="2.2" fill="rgba(255,255,255,0.25)">
          <circle cx="-7" cy="-21" r="6" />
          <circle cx="7" cy="-21" r="6" />
          <line x1="-1" y1="-21" x2="1" y2="-21" />
        </g>
      )}
      {hasHeadphones && (
        <g>
          <path d="M -22 -22 A 22 24 0 0 1 22 -22" fill="none" stroke="#F97316" strokeWidth="4.5" />
          <rect x="-25" y="-27" width="7" height="14" rx="3" fill="#EA580C" stroke="#1E293B" strokeWidth="2" />
          <rect x="18" y="-27" width="7" height="14" rx="3" fill="#EA580C" stroke="#1E293B" strokeWidth="2" />
        </g>
      )}
      {isWitchHat && (
        <g>
          <ellipse cx="0" cy="-35" rx="30" ry="7" fill="#4C1D95" stroke="#1E293B" strokeWidth="2.5" />
          <polygon points="-16,-36 16,-36 4,-66" fill="#6D28D9" stroke="#1E293B" strokeWidth="2.5" />
          <circle cx="-2" cy="-47" r="3" fill="#FACC15" />
        </g>
      )}
    </g>
  );
}

function renderPanelProp(scene: PanelSceneId, rect: PanelRect): React.ReactNode {
  const cx = rect.x + rect.w / 2;
  const bottomY = rect.y + rect.h;

  if (scene === 'witch_lab_brew' || scene === 'witch_boom_mistake') {
    return (
      <g>
        <ellipse cx={cx} cy={bottomY - 35} rx="52" ry="30" fill="#334155" stroke="#0F172A" strokeWidth="3" />
        <ellipse cx={cx} cy={bottomY - 58} rx="40" ry="11" fill={scene === 'witch_boom_mistake' ? '#F97316' : '#2DD4BF'} stroke="#0F172A" strokeWidth="2.5" />
        <circle cx={cx - 12} cy={bottomY - 78} r="7" fill="#5EEAD4" opacity="0.85" />
        <circle cx={cx + 15} cy={bottomY - 88} r="5" fill="#A7F3D0" opacity="0.85" />
      </g>
    );
  }
  if (scene === 'witch_herb_shelf' || scene === 'code_library_dusk' || scene === 'code_hidden_shelf') {
    return (
      <g>
        {[0, 1].map((row) => (
          <g key={row}>
            <rect x={rect.x + 25} y={bottomY - 125 + row * 48} width={rect.w - 50} height="10" rx="3" fill="#92400E" stroke="#1E293B" strokeWidth="2" />
            {[0, 1, 2, 3, 4, 5].map((bi) => (
              <rect
                key={bi}
                x={rect.x + 38 + bi * 32}
                y={bottomY - 155 + row * 48}
                width="20"
                height="30"
                rx="3"
                fill={['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'][bi % 6]}
                stroke="#1E293B"
                strokeWidth="2"
              />
            ))}
          </g>
        ))}
      </g>
    );
  }
  if (scene === 'ada_jupiter_comet') {
    return (
      <g>
        <circle cx={rect.x + rect.w * 0.34} cy={rect.y + rect.h * 0.45} r="44" fill="#F59E0B" stroke="#FDE68A" strokeWidth="2.5" />
        <path d={`M ${rect.x + rect.w * 0.23} ${rect.y + rect.h * 0.42} Q ${rect.x + rect.w * 0.34} ${rect.y + rect.h * 0.48} ${rect.x + rect.w * 0.45} ${rect.y + rect.h * 0.41}`} fill="none" stroke="#B45309" strokeWidth="6" />
        <circle cx={rect.x + rect.w * 0.72} cy={rect.y + rect.h * 0.38} r="14" fill="#38BDF8" />
        <path d={`M ${rect.x + rect.w * 0.72} ${rect.y + rect.h * 0.38} L ${rect.x + rect.w * 0.92} ${rect.y + rect.h * 0.25} L ${rect.x + rect.w * 0.85} ${rect.y + rect.h * 0.46} Z`} fill="rgba(103,232,249,0.55)" />
      </g>
    );
  }
  if (scene === 'ada_observatory_night' || scene === 'ada_telescope_lens') {
    return (
      <g>
        <path d={`M ${cx - 70} ${bottomY - 22} A 70 68 0 0 1 ${cx + 70} ${bottomY - 22} Z`} fill="#94A3B8" stroke="#0F172A" strokeWidth="3" />
        <rect x={cx + 5} y={bottomY - 102} width="54" height="16" rx="5" transform={`rotate(-32 ${cx + 5} ${bottomY - 102})`} fill="#0284C7" stroke="#0F172A" strokeWidth="2.5" />
      </g>
    );
  }
  if (scene === 'milo_sound_waves' || scene === 'milo_treehouse_midnight') {
    return (
      <g>
        {[24, 44, 64, 84].map((r, i) => (
          <circle
            key={r}
            cx={cx}
            cy={bottomY - 82}
            r={r}
            fill="none"
            stroke={i % 2 === 0 ? '#22D3EE' : '#FACC15'}
            strokeWidth="3"
            strokeDasharray="8 6"
            opacity={0.85 - i * 0.14}
          />
        ))}
      </g>
    );
  }
  if (scene === 'milo_owl_reveal') {
    return (
      <g transform={`translate(${cx},${bottomY - 96})`}>
        <ellipse cx="0" cy="8" rx="22" ry="26" fill="#D97706" stroke="#1E293B" strokeWidth="2.5" />
        <circle cx="0" cy="-14" r="18" fill="#FDE68A" stroke="#1E293B" strokeWidth="2.5" />
        <circle cx="-7" cy="-15" r="5" fill="#0F172A" />
        <circle cx="7" cy="-15" r="5" fill="#0F172A" />
        <polygon points="-3,-10 3,-10 0,-4" fill="#B45309" />
      </g>
    );
  }
  if (scene === 'bay_coral_glow' || scene === 'bay_ghost_net' || scene === 'bay_turtle_free') {
    return (
      <g>
        {/* Turtle silhouette */}
        <g transform={`translate(${cx + 10},${bottomY - 78})`}>
          <ellipse cx="0" cy="0" rx="28" ry="18" fill="#10B981" stroke="#064E3B" strokeWidth="2.5" />
          <circle cx="-30" cy="-4" r="10" fill="#34D399" stroke="#064E3B" strokeWidth="2" />
          <ellipse cx="-14" cy="18" rx="11" ry="6" fill="#34D399" stroke="#064E3B" strokeWidth="2" />
          <ellipse cx="14" cy="18" rx="10" ry="5" fill="#34D399" stroke="#064E3B" strokeWidth="2" />
        </g>
        {scene === 'bay_ghost_net' && (
          <path
            d={`M ${cx - 50} ${bottomY - 110} L ${cx + 60} ${bottomY - 50} M ${cx - 45} ${bottomY - 55} L ${cx + 55} ${bottomY - 105}`}
            stroke="#CBD5E1"
            strokeWidth="3"
            strokeDasharray="6 4"
          />
        )}
      </g>
    );
  }
  return null;
}

function renderSpeechBubble(
  dlg: ComicDialogue,
  panel: PanelRect,
  idx: number,
  totalInPanel: number,
  globalIdx: number,
  isActive: boolean,
  onSpeakLine: (text: string, idx: number) => void
): React.ReactNode {
  const maxChars = panel.w > 500 ? 44 : 27;
  const lines = wrapText(`${dlg.speaker}: ${dlg.text}`, maxChars);
  const lineH = 17;
  const boxW = Math.min(
    panel.w - 28,
    Math.max(150, Math.max(...lines.map((l) => l.length)) * 7.6 + 26)
  );
  const boxH = lines.length * lineH + 18;

  const yOffset = panel.y + 44 + idx * (boxH + 10);
  let bx = panel.x + 14;
  if (dlg.side === 'right') {
    bx = panel.x + panel.w - boxW - 14;
  } else if (dlg.side === 'center' || totalInPanel === 1) {
    bx = panel.x + (panel.w - boxW) / 2;
  }

  const tailX = bx + boxW * (dlg.side === 'right' ? 0.72 : dlg.side === 'left' ? 0.28 : 0.5);
  const isShout = dlg.bubbleType === 'shout';
  const isThought = dlg.bubbleType === 'thought';

  return (
    <g
      key={globalIdx}
      onClick={() => onSpeakLine(dlg.text, globalIdx)}
      style={{ cursor: 'pointer' }}
    >
      <polygon
        points={`${tailX - 8},${yOffset + boxH - 2} ${tailX + 8},${yOffset + boxH - 2} ${tailX},${yOffset + boxH + 13}`}
        fill={isActive ? '#FEF08A' : isShout ? '#FEF9C3' : '#FFFFFF'}
        stroke="#1E293B"
        strokeWidth="2.5"
      />
      <rect
        x={bx}
        y={yOffset}
        width={boxW}
        height={boxH}
        rx={isShout ? 6 : 14}
        fill={isActive ? '#FEF08A' : isShout ? '#FEF9C3' : '#FFFFFF'}
        stroke={isActive ? '#EA580C' : '#1E293B'}
        strokeWidth={isActive ? 3.5 : 2.5}
        strokeDasharray={isThought ? '5 3' : undefined}
      />
      {lines.map((ln, li) => (
        <text
          key={li}
          x={bx + 13}
          y={yOffset + 20 + li * lineH}
          fontSize="13.5"
          fontWeight={li === 0 ? '700' : '600'}
          fontFamily="Fredoka, Plus Jakarta Sans, sans-serif"
          fill="#0F172A"
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

export const ComicPageSvg: React.FC<ComicPageSvgProps> = ({
  page,
  accentColor,
  activeSpeechIdx,
  onSpeakLine
}) => {
  const rects = getPanelRects(page.layout, page.panels.length);
  let dialogueCounter = 0;

  return (
    <svg
      viewBox="0 0 820 1040"
      className="w-full h-auto block select-none bg-[#FFFDF7] rounded-xl shadow-md border-2 border-[#1E293B]"
      role="img"
      aria-label={`Comic page ${page.pageNumber}`}
    >
      <rect x="0" y="0" width="820" height="1040" fill="#FFFDF7" rx="10" />

      {page.panels.map((panel: ComicPanel, pIdx: number) => {
        const rect = rects[pIdx] || rects[rects.length - 1];
        const theme = getSceneTheme(panel.scene);
        const clipId = `panel-clip-${page.pageNumber}-${pIdx}`;
        const gradId = `panel-grad-${page.pageNumber}-${pIdx}`;

        // Determine speakers to place cleanly along bottom floor of panel
        const speakers = Array.from(new Set(panel.dialogues.map((d) => d.speaker))).slice(0, 2);
        const charBaseY = rect.y + rect.h - 48;
        const capLines = panel.caption ? wrapText(panel.caption, rect.w > 500 ? 72 : 38) : [];

        return (
          <g key={pIdx}>
            <defs>
              <clipPath id={clipId}>
                <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="10" />
              </clipPath>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.skyTop} />
                <stop offset="100%" stopColor={theme.skyBot} />
              </linearGradient>
            </defs>

            <g clipPath={`url(#${clipId})`}>
              {/* Background Sky */}
              <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={`url(#${gradId})`} />

              {/* Stars or Sun */}
              {theme.stars &&
                [0.14, 0.28, 0.48, 0.68, 0.85, 0.22, 0.6, 0.78].map((sx, si) => (
                  <circle
                    key={si}
                    cx={rect.x + rect.w * sx}
                    cy={rect.y + 34 + ((si * 37) % 110)}
                    r={si % 3 === 0 ? 2.4 : 1.5}
                    fill="#FEF9C3"
                    opacity="0.85"
                  />
                ))}
              {theme.sun && (
                <circle cx={rect.x + rect.w * 0.8} cy={rect.y + 72} r="32" fill="#FDE047" opacity="0.9" />
              )}

              {/* Floor */}
              <rect
                x={rect.x}
                y={rect.y + rect.h - 76}
                width={rect.w}
                height="76"
                fill={theme.ground}
                opacity="0.92"
              />

              {/* Scene Props */}
              {renderPanelProp(panel.scene, rect)}

              {/* Characters */}
              {speakers.length === 1 && renderCharacterFigure(speakers[0], rect.x + rect.w * 0.34, charBaseY, 1.05)}
              {speakers.length >= 2 && (
                <>
                  {renderCharacterFigure(speakers[0], rect.x + rect.w * 0.25, charBaseY, 1)}
                  {renderCharacterFigure(speakers[1], rect.x + rect.w * 0.75, charBaseY, 1)}
                </>
              )}

              {/* Yellow Narration Caption Strip */}
              {capLines.length > 0 && (
                <g>
                  <rect
                    x={rect.x + 10}
                    y={rect.y + 8}
                    width={rect.w - 20}
                    height={capLines.length * 16 + 10}
                    rx="6"
                    fill="#FEF3C7"
                    stroke="#1E293B"
                    strokeWidth="2"
                  />
                  {capLines.map((cl, ci) => (
                    <text
                      key={ci}
                      x={rect.x + 20}
                      y={rect.y + 24 + ci * 16}
                      fontSize="12.5"
                      fontWeight="700"
                      fontFamily="Plus Jakarta Sans, Fredoka, sans-serif"
                      fill="#78350F"
                    >
                      {cl}
                    </text>
                  ))}
                </g>
              )}

              {/* Comic SFX Burst */}
              {panel.sfx && (
                <g transform={`translate(${rect.x + rect.w - 78},${rect.y + rect.h - 108}) rotate(-9)`}>
                  <polygon
                    points="-48,-16 -18,-22 0,-36 18,-20 50,-22 34,0 48,18 14,16 0,32 -18,16 -46,20 -32,0"
                    fill="#FACC15"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                  />
                  <text
                    x="0"
                    y="6"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="900"
                    fontFamily="Fredoka, sans-serif"
                    fill="#B91C1C"
                  >
                    {panel.sfx}
                  </text>
                </g>
              )}

              {/* Speech Balloons */}
              {panel.dialogues.map((dlg, di) => {
                const currentIdx = dialogueCounter++;
                return renderSpeechBubble(
                  dlg,
                  rect,
                  di,
                  panel.dialogues.length,
                  currentIdx,
                  activeSpeechIdx === currentIdx,
                  onSpeakLine
                );
              })}
            </g>

            {/* Ink Panel Border */}
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.w}
              height={rect.h}
              rx="10"
              fill="none"
              stroke="#1E293B"
              strokeWidth="4"
            />
          </g>
        );
      })}

      {/* Bottom Page Folio */}
      <rect x="355" y="1012" width="110" height="22" rx="6" fill={accentColor} />
      <text
        x="410"
        y="1027"
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="#FFFFFF"
        fontFamily="Fredoka, sans-serif"
      >
        Page {page.pageNumber}
      </text>
    </svg>
  );
};
