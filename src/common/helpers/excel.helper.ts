import ExcelJS from 'exceljs';
import { StreamableFile } from '@nestjs/common';

export interface ExcelColumn<T> {
  header: string;
  key: string;
  width?: number;
  getValue: (row: T) => string | number | boolean | null | undefined;
}

export async function buildExcelBuffer<T>(
  sheetName: string,
  columns: ExcelColumn<T>[],
  rows: T[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SLJ Supply Center';
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width ?? 22,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 20;

  for (const row of rows) {
    const rowData: Record<string, unknown> = {};
    for (const col of columns) {
      const val = col.getValue(row);
      rowData[col.key] = val ?? '';
    }
    sheet.addRow(rowData);
  }

  // Freeze header row
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function toStreamableFile(buffer: Buffer, filename: string): StreamableFile {
  const encoded = encodeURIComponent(filename);
  return new StreamableFile(buffer, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    disposition: `attachment; filename="${encoded}.xlsx"; filename*=UTF-8''${encoded}.xlsx`,
  });
}
