export type CsvStringifyOptions = {
  header?: boolean;
  columns?: string[];
};

type Row = Record<string, unknown>;

const DEFAULT_SEPARATOR = ',';

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

export function stringify(rows: Row[], options: CsvStringifyOptions = {}): string {
  const columns = options.columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  const includeHeader = options.header ?? true;
  const lines: string[] = [];

  if (includeHeader) {
    lines.push(columns.map(escapeCell).join(DEFAULT_SEPARATOR));
  }

  for (const row of rows) {
    const cells = columns.map((column) => escapeCell(row[column]));
    lines.push(cells.join(DEFAULT_SEPARATOR));
  }

  return lines.join('\n');
}
