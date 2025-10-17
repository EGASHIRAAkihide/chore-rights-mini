type CsvRow = Record<string, unknown>;

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

export function stringifyCsv(
  rows: CsvRow[],
  options: { columns: string[]; header?: boolean } = { columns: [] },
): string {
  const { columns, header = true } = options;
  const resolvedColumns = columns.length > 0 ? columns : Object.keys(rows[0] ?? {});
  const lines: string[] = [];

  if (header) {
    lines.push(resolvedColumns.map(escapeCell).join(DEFAULT_SEPARATOR));
  }

  for (const row of rows) {
    const cells = resolvedColumns.map((column) => escapeCell(row[column]));
    lines.push(cells.join(DEFAULT_SEPARATOR));
  }

  return lines.join('\n');
}
