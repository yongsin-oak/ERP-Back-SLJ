import { DateTime } from 'luxon';
import { nanoid } from 'nanoid';

interface GenerateIdOptions {
  prefix?: string;
  withDateTime?: boolean;
  length?: number; // ความยาวของ id ส่วนสุ่ม
}

export function generateIdWithPrefix(options: GenerateIdOptions = {}): string {
  const { prefix = '', withDateTime = true, length = 10 } = options;

  const timePart = withDateTime
    ? DateTime.now().setZone('Asia/Bangkok').toFormat('yyyyMMdd')
    : '';

  const randomPart = nanoid(length).toUpperCase();

  const id = `${prefix}-${timePart}-${randomPart}`;

  return id;
}
