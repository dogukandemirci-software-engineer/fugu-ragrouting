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

async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  // Dynamic import so startup is not blocked if pdf-parse is missing
  // pdf-parse exports vary by bundler; handle both default and named export
  const mod = await import('pdf-parse');
  const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number; info: unknown }> =
    (mod as any).default ?? mod;
  const result = await pdfParse(buffer);
  return {
    text: result.text,
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
