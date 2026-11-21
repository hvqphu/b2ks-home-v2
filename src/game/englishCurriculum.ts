import { EnglishQuestion } from '../types/b2ks';
import { CURRICULUM_GRADES_6_7, RawUnitCurriculum } from './englishData67';
import { CURRICULUM_GRADES_8_9 } from './englishData89';

export const CURRICULUM_BANK_VERSION = 2; // Global Success 6-9 (1920 items)

export interface GlobalSuccessUnitMeta {
  grade: 6 | 7 | 8 | 9;
  unit: number;
  title: string;
  grammarFocus: string;
}

const ALL_RAW_UNITS: RawUnitCurriculum[] = [...CURRICULUM_GRADES_6_7, ...CURRICULUM_GRADES_8_9];

export const GLOBAL_SUCCESS_UNITS: GlobalSuccessUnitMeta[] = ALL_RAW_UNITS.map((u) => ({
  grade: u.grade,
  unit: u.unit,
  title: u.title,
  grammarFocus: u.grammarFocus,
}));

export function getGlobalSuccessUnitMeta(grade: number, unit: number): GlobalSuccessUnitMeta | undefined {
  return GLOBAL_SUCCESS_UNITS.find((u) => u.grade === grade && u.unit === unit);
}

export function getGlobalSuccessUnitTitle(grade: number, unit: number): string {
  const meta = getGlobalSuccessUnitMeta(grade, unit);
  return meta ? `Unit ${meta.unit}: ${meta.title}` : `Unit ${unit}`;
}

function buildFourOptions<T>(
  allItems: T[],
  correctIdx: number,
  seed: number,
  getLabel: (item: T) => string
): { opts: [string, string, string, string]; ans: number } {
  const correctLabel = getLabel(allItems[correctIdx]);
  const distractors: string[] = [];
  const total = allItems.length;
  for (let offset = 1; offset < total && distractors.length < 3; offset++) {
    const candidateIdx = (correctIdx + offset * 3 + seed) % total;
    const label = getLabel(allItems[candidateIdx]);
    if (label && label !== correctLabel && !distractors.includes(label)) {
      distractors.push(label);
    }
  }
  for (let i = 0; i < total && distractors.length < 3; i++) {
    const label = getLabel(allItems[i]);
    if (label && label !== correctLabel && !distractors.includes(label)) {
      distractors.push(label);
    }
  }
  const ansPos = (correctIdx * 3 + seed) % 4;
  const opts: string[] = [];
  let dPtr = 0;
  for (let pos = 0; pos < 4; pos++) {
    if (pos === ansPos) {
      opts.push(correctLabel);
    } else {
      opts.push(distractors[dPtr++] || 'N/A');
    }
  }
  return {
    opts: [opts[0], opts[1], opts[2], opts[3]],
    ans: ansPos,
  };
}

function expandCurriculumBank(): EnglishQuestion[] {
  const bank: EnglishQuestion[] = [];

  for (const unitDef of ALL_RAW_UNITS) {
    const unitTitle = `Unit ${unitDef.unit}: ${unitDef.title}`;
    const vList = unitDef.vocab;

    // 1. 10 Contextual fill-in-the-blank Vocab questions
    vList.forEach(([word, viMeaning, sentence], idx) => {
      const { opts, ans } = buildFourOptions(vList, idx, unitDef.unit + unitDef.grade, (item) => item[0]);
      bank.push({
        id: `gs_g${unitDef.grade}_u${unitDef.unit}_v${idx + 1}`,
        cat: 'vocab',
        grade: unitDef.grade,
        unit: unitDef.unit,
        unitTitle,
        q: sentence,
        opts,
        ans,
        exp: `"${word}" nghĩa là "${viMeaning}" (${unitTitle} - Lớp ${unitDef.grade}).`,
      });
    });

    // 2. 5 English -> Vietnamese + 5 Vietnamese -> English Vocab questions (Total = 20 Vocab / Unit)
    vList.forEach(([word, viMeaning], idx) => {
      if (idx < 5) {
        const { opts, ans } = buildFourOptions(vList, idx, unitDef.unit * 2 + 1, (item) => item[1]);
        bank.push({
          id: `gs_g${unitDef.grade}_u${unitDef.unit}_v${idx + 11}`,
          cat: 'vocab',
          grade: unitDef.grade,
          unit: unitDef.unit,
          unitTitle,
          q: `What does "${word}" mean in Vietnamese? (Global Success ${unitDef.grade} - Unit ${unitDef.unit})`,
          opts,
          ans,
          exp: `Trong ${unitTitle} (Lớp ${unitDef.grade}), "${word}" có nghĩa là "${viMeaning}".`,
        });
      } else {
        const { opts, ans } = buildFourOptions(vList, idx, unitDef.unit * 3 + 2, (item) => item[0]);
        bank.push({
          id: `gs_g${unitDef.grade}_u${unitDef.unit}_v${idx + 11}`,
          cat: 'vocab',
          grade: unitDef.grade,
          unit: unitDef.unit,
          unitTitle,
          q: `Which English word or phrase means "${viMeaning}"? (Unit ${unitDef.unit}: ${unitDef.title})`,
          opts,
          ans,
          exp: `Từ tiếng Anh tương ứng với "${viMeaning}" là "${word}".`,
        });
      }
    });

    // 3. 20 Distinct Grammar questions per Unit
    unitDef.grammar.forEach(([q, opts, ans, exp], idx) => {
      bank.push({
        id: `gs_g${unitDef.grade}_u${unitDef.unit}_g${idx + 1}`,
        cat: 'grammar',
        grade: unitDef.grade,
        unit: unitDef.unit,
        unitTitle,
        q,
        opts: [opts[0], opts[1], opts[2], opts[3]],
        ans,
        exp,
      });
    });
  }

  return bank;
}

export const GLOBAL_SUCCESS_ENGLISH_BANK: EnglishQuestion[] = expandCurriculumBank();

function escapeCsvCell(val: string | number | undefined): string {
  const s = String(val ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportEnglishBankToCsv(questions: EnglishQuestion[]): string {
  const header = ['id', 'grade', 'unit', 'cat', 'q', 'optA', 'optB', 'optC', 'optD', 'ans', 'exp'];
  const ansLetters = ['A', 'B', 'C', 'D'];
  const lines = [header.join(',')];
  questions.forEach((item) => {
    const row = [
      escapeCsvCell(item.id),
      escapeCsvCell(item.grade ?? 6),
      escapeCsvCell(item.unit ?? 1),
      escapeCsvCell(item.cat),
      escapeCsvCell(item.q),
      escapeCsvCell(item.opts[0] || ''),
      escapeCsvCell(item.opts[1] || ''),
      escapeCsvCell(item.opts[2] || ''),
      escapeCsvCell(item.opts[3] || ''),
      escapeCsvCell(ansLetters[item.ans] || 'A'),
      escapeCsvCell(item.exp || ''),
    ];
    lines.push(row.join(','));
  });
  return '\uFEFF' + lines.join('\r\n');
}

export function parseCsvRows(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        row.push(cell);
        if (row.some((c) => c.trim() !== '')) rows.push(row);
        row = [];
        cell = '';
      } else if (ch === '\n') {
        row.push(cell);
        if (row.some((c) => c.trim() !== '')) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }
  return rows;
}

export function parseEnglishBankCsv(csvText: string): { questions: EnglishQuestion[]; errors: number } {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) return { questions: [], errors: 0 };

  let startIdx = 0;
  const firstRowLower = rows[0].map((c) => c.trim().toLowerCase());
  const colIdx = {
    id: firstRowLower.indexOf('id'),
    grade: firstRowLower.indexOf('grade'),
    unit: firstRowLower.indexOf('unit'),
    cat: firstRowLower.indexOf('cat'),
    q: firstRowLower.indexOf('q'),
    optA: firstRowLower.indexOf('opta'),
    optB: firstRowLower.indexOf('optb'),
    optC: firstRowLower.indexOf('optc'),
    optD: firstRowLower.indexOf('optd'),
    ans: firstRowLower.indexOf('ans'),
    exp: firstRowLower.indexOf('exp'),
  };

  if (colIdx.q !== -1 && colIdx.optA !== -1) {
    startIdx = 1;
  } else {
    // Fallback fixed column order: id,grade,unit,cat,q,optA,optB,optC,optD,ans,exp
    colIdx.id = 0;
    colIdx.grade = 1;
    colIdx.unit = 2;
    colIdx.cat = 3;
    colIdx.q = 4;
    colIdx.optA = 5;
    colIdx.optB = 6;
    colIdx.optC = 7;
    colIdx.optD = 8;
    colIdx.ans = 9;
    colIdx.exp = 10;
  }

  const out: EnglishQuestion[] = [];
  let errors = 0;

  for (let r = startIdx; r < rows.length; r++) {
    const cells = rows[r];
    const qText = (cells[colIdx.q] || '').trim();
    const o0 = (cells[colIdx.optA] || '').trim();
    const o1 = (cells[colIdx.optB] || '').trim();
    const o2 = (cells[colIdx.optC] || '').trim();
    const o3 = (cells[colIdx.optD] || '').trim();
    if (!qText || !o0 || !o1 || !o2 || !o3) {
      errors++;
      continue;
    }

    const gradeNum = Number((cells[colIdx.grade] || '6').trim());
    const grade = (gradeNum === 7 || gradeNum === 8 || gradeNum === 9 ? gradeNum : 6) as 6 | 7 | 8 | 9;
    const unitNum = Math.max(1, Math.min(12, Math.round(Number((cells[colIdx.unit] || '1').trim()) || 1)));
    const catRaw = (cells[colIdx.cat] || 'vocab').trim().toLowerCase();
    const cat: 'grammar' | 'vocab' = catRaw === 'grammar' || catRaw === 'ngữ pháp' ? 'grammar' : 'vocab';

    const ansRaw = (cells[colIdx.ans] || 'A').trim().toUpperCase();
    let ans = 0;
    if (ansRaw === 'B' || ansRaw === '1') ans = 1;
    else if (ansRaw === 'C' || ansRaw === '2') ans = 2;
    else if (ansRaw === 'D' || ansRaw === '3') ans = 3;
    else if (ansRaw === '4') ans = 3;
    else if (ansRaw === 'A' || ansRaw === '0') ans = 0;

    const rawId = (colIdx.id >= 0 ? cells[colIdx.id] : '')?.trim();
    const exp = (colIdx.exp >= 0 ? cells[colIdx.exp] : '')?.trim() || `Global Success ${grade} - Unit ${unitNum}`;

    out.push({
      id: rawId || `csv_g${grade}_u${unitNum}_${cat}_${r}_${Date.now()}`,
      grade,
      unit: unitNum,
      unitTitle: getGlobalSuccessUnitTitle(grade, unitNum),
      cat,
      q: qText,
      opts: [o0, o1, o2, o3],
      ans,
      exp,
      custom: !rawId || !rawId.startsWith('gs_'),
    });
  }

  return { questions: out, errors };
}
