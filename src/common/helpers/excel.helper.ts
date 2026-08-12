import ExcelJS from 'exceljs';
import { StreamableFile } from '@nestjs/common';
import { PassThrough } from 'stream';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { badRequest } from './response';

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const WORKBOOK_CREATOR = 'SLJ Supply Center';
const DEFAULT_COLUMN_WIDTH = 22;
const HEADER_FONT_SIZE = 11;
const HEADER_ROW_HEIGHT = 20;
const HEADER_FILL_ARGB = 'FFD9E1F2';
/** Keeps the header visible while the user scrolls a long export. */
const FROZEN_HEADER_VIEW = { state: 'frozen', xSplit: 0, ySplit: 1 } as const;

/**
 * Hard ceiling for a single export request. Exports are unpaginated by design,
 * so without a ceiling one unfiltered click streams the whole table.
 */
export const EXCEL_EXPORT_MAX_ROWS = 50_000;

/** Rows fetched per DB round-trip while streaming an export. */
export const EXCEL_EXPORT_BATCH_SIZE = 500;

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

function xlsxDownloadOptions(filename: string): { type: string; disposition: string } {
  const encoded = encodeURIComponent(filename);
  return {
    type: XLSX_MIME_TYPE,
    disposition: `attachment; filename="${encoded}.xlsx"; filename*=UTF-8''${encoded}.xlsx`,
  };
}

export function toStreamableFile(buffer: Buffer, filename: string): StreamableFile {
  return new StreamableFile(buffer, xlsxDownloadOptions(filename));
}

export interface ExcelStreamOptions<T> {
  /** Worksheet tab name. */
  sheetName: string;
  /** Download name without the `.xlsx` suffix. */
  filename: string;
  columns: ExcelColumn<T>[];
  rows: AsyncIterable<T> | Iterable<T>;
}

/**
 * Stream an xlsx download instead of materialising it.
 *
 * `buildExcelBuffer` keeps every row of the sheet model in memory and then a
 * second full copy as the encoded workbook buffer. `WorkbookWriter` zips each
 * committed row straight into the response stream, so peak memory is one batch
 * of rows plus the zip window — regardless of how many rows are exported.
 * Shared strings stay off because that table would grow with the row count.
 *
 * The workbook is pumped in the background: the returned `StreamableFile` must
 * be piped to the response for the writer to make progress (an unread
 * `PassThrough` just stalls on backpressure). Validate everything that can fail
 * (row ceiling, permissions) *before* calling this — once the first byte is out,
 * the status code can no longer change.
 */
export function streamExcel<T>({ sheetName, filename, columns, rows }: ExcelStreamOptions<T>): StreamableFile {
  const output = new PassThrough();

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: output,
    useStyles: true,
    useSharedStrings: false,
  });
  workbook.creator = WORKBOOK_CREATOR;

  const sheet = workbook.addWorksheet(sheetName, { views: [FROZEN_HEADER_VIEW] });
  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width ?? DEFAULT_COLUMN_WIDTH,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: HEADER_FONT_SIZE };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_ARGB } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = HEADER_ROW_HEIGHT;

  void (async () => {
    try {
      for await (const row of rows) {
        const rowData: Record<string, unknown> = {};
        for (const col of columns) {
          const val = col.getValue(row);
          rowData[col.key] = val ?? '';
        }
        // Committing per row is what releases it from the sheet model.
        sheet.addRow(rowData).commit();
      }
      sheet.commit();
      await workbook.commit();
    } catch (error) {
      // Response headers are long gone by now, so a broken stream is the only
      // way left to tell the client the file is incomplete. Nest logs it.
      output.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return new StreamableFile(output, xlsxDownloadOptions(filename));
}

/**
 * Walk a query in fixed-size pages so an export never loads the whole result set.
 * The builder **must** carry a deterministic ORDER BY ending in a unique column —
 * without one Postgres may return the same row on two pages, or none at all.
 */
export async function* iterateQueryInBatches<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  batchSize: number = EXCEL_EXPORT_BATCH_SIZE,
): AsyncGenerator<T> {
  for (let offset = 0; ; offset += batchSize) {
    const batch = await qb.clone().skip(offset).take(batchSize).getMany();
    for (const row of batch) yield row;
    if (batch.length < batchSize) return;
  }
}

/**
 * Guard an export against an unfiltered "select the whole table" request.
 * Runs on a pre-count so the failure is still a normal JSON error response —
 * once `streamExcel` starts writing, only a truncated file could signal it.
 */
export function assertExportRowLimit(total: number, max: number = EXCEL_EXPORT_MAX_ROWS): void {
  if (total > max) {
    throw badRequest(
      `ข้อมูลที่ต้องการส่งออกมีจำนวน ${total} แถว ซึ่งเกินขีดจำกัด ${max} แถวต่อครั้ง กรุณากรองข้อมูลให้แคบลงแล้วส่งออกใหม่อีกครั้ง`,
    );
  }
}
