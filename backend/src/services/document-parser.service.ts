import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export interface ParseResult {
  text: string;
  metadata: Record<string, unknown>;
}

export const DocumentParserService = {
  async parse(buffer: Buffer, mimeType: string, filename: string): Promise<ParseResult> {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';

    if (mimeType === 'application/pdf' || ext === 'pdf') {
      return parsePdf(buffer);
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      return parseDocx(buffer);
    }

    if (mimeType === 'text/csv' || ext === 'csv') {
      return parseCsvBuffer(buffer, filename);
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      ext === 'xlsx' ||
      ext === 'xls'
    ) {
      return parseExcel(buffer, filename);
    }

    if (mimeType === 'application/json' || ext === 'json') {
      return parseJson(buffer, filename);
    }

    if (mimeType === 'text/markdown' || ext === 'md' || ext === 'markdown') {
      return parseMarkdown(buffer);
    }

    // Plain text fallback
    return { text: buffer.toString('utf-8'), metadata: { parser: 'plain_text' } };
  },
};

// PDF fonts often embed ligatures (fi, fl, ti, tt, ffi...) at font-specific glyph
// codepoints that pdf-parse cannot map back to standard Unicode, so they surface
// as mis-decoded characters. Built via charCode to avoid raw-literal source encoding issues.
const LIGATURE_MAP: Record<string, string> = {
  [String.fromCharCode(0xfb00)]: 'ff',
  [String.fromCharCode(0xfb01)]: 'fi',
  [String.fromCharCode(0xfb02)]: 'fl',
  [String.fromCharCode(0xfb03)]: 'ffi',
  [String.fromCharCode(0xfb04)]: 'ffl',
  [String.fromCharCode(0xfb05)]: 'st',
  [String.fromCharCode(0xfb06)]: 'st',
  [String.fromCharCode(0x014c)]: 'ti',
  [String.fromCharCode(0x013f)]: 'fi',
  [String.fromCharCode(0x01ab)]: 'tt',
};

const PRIVATE_USE_AREA_RE = /[-]/g;

function normalizePdfText(text: string): string {
  let out = text;
  for (const [bad, good] of Object.entries(LIGATURE_MAP)) {
    out = out.split(bad).join(good);
  }
  // Strip any remaining stray private-use-area glyphs pdf-parse could not map
  return out.replace(PRIVATE_USE_AREA_RE, '');
}

async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  // Dynamic import so startup is not blocked if pdf-parse is missing
  // pdf-parse v1 exports the function directly via CJS; dynamic import wraps it in { default }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('pdf-parse');
  const pdfParseFn = typeof mod.default === 'function' ? mod.default : mod;
  if (typeof pdfParseFn !== 'function') throw new Error('pdf-parse: no callable export found');
  const result = await pdfParseFn(buffer);
  return {
    text: normalizePdfText(result.text),
    metadata: {
      parser: 'pdf-parse',
      pages: result.numpages,
      info: result.info,
    },
  };
}

async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    metadata: {
      parser: 'mammoth',
      warnings: result.messages.map((m) => m.message),
    },
  };
}

function parseCsvBuffer(buffer: Buffer, filename: string): ParseResult {
  const rows = parseCsv(buffer, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Convert each row to "key: value" lines so it reads naturally in embeddings
  const lines = rows.map((row) =>
    headers.map((h) => `${h}: ${row[h] ?? ''}`).join(' | ')
  );

  return {
    text: lines.join('\n'),
    metadata: { parser: 'csv-parse', rows: rows.length, columns: headers, filename },
  };
}

function parseExcel(buffer: Buffer, filename: string): ParseResult {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];
  const sheetNames = wb.SheetNames;

  for (const sheetName of sheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    if (rows.length === 0) continue;

    const headers = Object.keys(rows[0]);
    parts.push(`[Sheet: ${sheetName}]`);
    parts.push(
      ...rows.map((row) =>
        headers.map((h) => `${h}: ${String(row[h] ?? '')}`).join(' | ')
      )
    );
  }

  return {
    text: parts.join('\n'),
    metadata: { parser: 'xlsx', sheets: sheetNames, filename },
  };
}

function parseJson(buffer: Buffer, filename: string): ParseResult {
  const obj = JSON.parse(buffer.toString('utf-8'));

  // Flatten to human-readable text
  function flatten(val: unknown, prefix = ''): string[] {
    if (val === null || val === undefined) return [`${prefix}: null`];
    if (typeof val !== 'object') return [`${prefix}: ${val}`];
    if (Array.isArray(val)) {
      return val.flatMap((item, i) => flatten(item, `${prefix}[${i}]`));
    }
    return Object.entries(val as Record<string, unknown>).flatMap(([k, v]) =>
      flatten(v, prefix ? `${prefix}.${k}` : k)
    );
  }

  return {
    text: flatten(obj).join('\n'),
    metadata: { parser: 'json', filename },
  };
}

function parseMarkdown(buffer: Buffer): ParseResult {
  // Strip markdown syntax, keep readable text
  const raw = buffer.toString('utf-8');
  const text = raw
    .replace(/^#{1,6}\s+/gm, '')        // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '')  // code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/^\s*[-*+]\s+/gm, '')      // list bullets
    .replace(/^\s*\d+\.\s+/gm, '')      // numbered lists
    .trim();

  return { text, metadata: { parser: 'markdown' } };
}
