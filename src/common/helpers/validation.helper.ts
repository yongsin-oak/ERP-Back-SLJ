import { ValidationError } from 'class-validator';

/**
 * Centralized humanizer for class-validator errors. Wired into the global
 * `ValidationPipe.exceptionFactory` (see `main.ts`) so EVERY DTO produces
 * friendly Thai messages without per-field `message:` overrides.
 *
 * Why a single layer instead of per-decorator messages: end users are Thai and
 * must understand the error; class-validator's defaults are technical English
 * ("barcode must be a string"). Translating each decorator in every DTO is
 * repetitive and drifts — this keeps it in one place ("แก้ที่เดียวจบ").
 *
 * Convention: if a DTO author writes a custom `message:` it MUST be in Thai —
 * any message that already contains Thai characters is passed through verbatim
 * (treated as intentional); English text is regenerated from the constraint key.
 */

/** True when the string carries any Thai character (U+0E00–U+0E7F). */
export const containsThai = (s: string): boolean => /[฀-๿]/.test(s);

/**
 * Thai labels for DTO input fields. Keep this in sync with new DTO properties —
 * an unknown field degrades to a generic all-Thai message (never echoes the
 * raw English property name to the user).
 */
const FIELD_LABELS: Record<string, string> = {
  // product
  barcode: 'บาร์โค้ด',
  barcodes: 'รายการบาร์โค้ด',
  productBarcode: 'บาร์โค้ดสินค้า',
  name: 'ชื่อ',
  brandId: 'แบรนด์',
  categoryId: 'หมวดหมู่',
  parentId: 'หมวดหมู่หลัก',
  costPrice: 'ราคาทุน',
  sellPrice: 'ราคาขาย',
  costPricePerUnit: 'ราคาทุนต่อหน่วย',
  remaining: 'จำนวนคงเหลือ',
  minStock: 'สต็อกขั้นต่ำ',
  weight: 'น้ำหนัก',
  width: 'ความกว้าง',
  height: 'ความสูง',
  length: 'ความยาว',
  productDimensions: 'ขนาดสินค้า',
  cartonDimensions: 'ขนาดลัง',
  // quantities / units
  quantity: 'จำนวน',
  quantityPack: 'จำนวน (แพ็ค)',
  quantityCarton: 'จำนวน (ลัง)',
  countedQty: 'จำนวนที่นับได้',
  actualQuantity: 'จำนวนที่นับได้',
  pack: 'แพ็ค',
  carton: 'ลัง',
  piecesPerPack: 'จำนวนชิ้นต่อแพ็ค',
  packPerCarton: 'จำนวนแพ็คต่อลัง',
  // people / auth
  username: 'ชื่อผู้ใช้',
  password: 'รหัสผ่าน',
  currentPassword: 'รหัสผ่านปัจจุบัน',
  newPassword: 'รหัสผ่านใหม่',
  pin: 'รหัส PIN',
  role: 'สิทธิ์การใช้งาน',
  employeeId: 'พนักงาน',
  firstName: 'ชื่อจริง',
  lastName: 'นามสกุล',
  nickname: 'ชื่อเล่น',
  department: 'แผนก',
  // contact
  email: 'อีเมล',
  phone: 'เบอร์โทรศัพท์',
  phoneNumber: 'เบอร์โทรศัพท์',
  address: 'ที่อยู่',
  contactName: 'ชื่อผู้ติดต่อ',
  taxId: 'เลขประจำตัวผู้เสียภาษี',
  // terminal / shop / order
  terminalCode: 'รหัสเครื่อง',
  platform: 'แพลตฟอร์ม',
  shopId: 'ร้านค้า',
  orderId: 'ออเดอร์',
  note: 'หมายเหตุ',
  description: 'รายละเอียด',
  // dates / filters / paging
  effectiveFrom: 'วันที่เริ่มมีผล',
  effectiveTo: 'วันที่สิ้นสุด',
  dateFrom: 'วันที่เริ่มต้น',
  dateTo: 'วันที่สิ้นสุด',
  startDate: 'วันที่เริ่ม',
  days: 'จำนวนวัน',
  status: 'สถานะ',
  type: 'ประเภท',
  isActive: 'สถานะการใช้งาน',
  page: 'หน้า',
  limit: 'จำนวนต่อหน้า',
  search: 'คำค้นหา',
  groupBy: 'การจัดกลุ่ม',
  // collections
  ids: 'รายการที่เลือก',
  items: 'รายการ',
  products: 'รายการสินค้า',
  employees: 'รายการพนักงาน',
  entries: 'รายการ',
  adjustments: 'รายการปรับปรุง',
  orderDetails: 'รายการสินค้าในออเดอร์',
};

/** Generic Thai noun used when a field has no known label, so we never leak English. */
const GENERIC_FIELD = 'ข้อมูล';

/**
 * Constraint-key → Thai message. `label` is the (already-Thai) field name.
 * `min`/`max`/length bounds use a generic phrasing on purpose — the numeric
 * bound is not reliably exposed on `ValidationError`, and a clear Thai sentence
 * beats a fragile regex over the English default.
 */
const CONSTRAINT_TEMPLATES: Record<string, (label: string) => string> = {
  isNotEmpty: (l) => `กรุณากรอก${l}`,
  isDefined: (l) => `กรุณากรอก${l}`,
  isNotEmptyObject: (l) => `กรุณากรอก${l}`,
  isString: (l) => `${l}ต้องเป็นข้อความ`,
  isInt: (l) => `${l}ต้องเป็นตัวเลขจำนวนเต็ม`,
  isNumber: (l) => `${l}ต้องเป็นตัวเลข`,
  isNumberString: (l) => `${l}ต้องเป็นตัวเลข`,
  isPositive: (l) => `${l}ต้องเป็นจำนวนบวก`,
  min: (l) => `${l}น้อยกว่าค่าที่กำหนด`,
  max: (l) => `${l}เกินค่าที่กำหนด`,
  minLength: (l) => `${l}สั้นเกินไป`,
  maxLength: (l) => `${l}ยาวเกินไป`,
  isEmail: () => `รูปแบบอีเมลไม่ถูกต้อง`,
  isEnum: (l) => `${l}ไม่ถูกต้อง`,
  isIn: (l) => `${l}ไม่ถูกต้อง`,
  isBoolean: (l) => `${l}ต้องเป็นค่าจริงหรือเท็จ`,
  isArray: (l) => `${l}ต้องเป็นรายการ`,
  arrayNotEmpty: (l) => `กรุณาเพิ่มอย่างน้อย 1 รายการใน${l}`,
  isObject: (l) => `${l}ไม่ถูกต้อง`,
  isUUID: (l) => `รูปแบบ${l}ไม่ถูกต้อง`,
  isDate: (l) => `รูปแบบวันที่ของ${l}ไม่ถูกต้อง`,
  isDateString: (l) => `รูปแบบวันที่ของ${l}ไม่ถูกต้อง`,
  matches: (l) => `รูปแบบ${l}ไม่ถูกต้อง`,
};

function buildMessage(property: string, constraintKey: string, defaultMsg: string): string {
  // A custom Thai message from the DTO is intentional — keep it verbatim.
  if (containsThai(defaultMsg)) return defaultMsg;

  // Extra/unknown property rejected by forbidNonWhitelisted — default message
  // would leak the raw key, so we always replace it.
  if (constraintKey === 'whitelistValidation') {
    return 'ไม่อนุญาตให้ส่งข้อมูลฟิลด์ที่ไม่รู้จัก';
  }

  const label = FIELD_LABELS[property] ?? GENERIC_FIELD;
  const template = CONSTRAINT_TEMPLATES[constraintKey];
  return template ? template(label) : `${label}ไม่ถูกต้อง`;
}

/**
 * Flatten a (possibly nested) class-validator error tree into a de-duplicated
 * list of friendly Thai messages. Nested/array DTOs (e.g. `createMultiple`,
 * `bulkUpdate`) carry their real constraints in `children`, so we recurse.
 */
export function humanizeValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  const visit = (errs: ValidationError[]): void => {
    for (const err of errs) {
      if (err.constraints) {
        for (const [key, defaultMsg] of Object.entries(err.constraints)) {
          messages.push(buildMessage(err.property, key, defaultMsg));
        }
      }
      if (err.children?.length) visit(err.children);
    }
  };

  visit(errors);
  return messages.length ? [...new Set(messages)] : ['ข้อมูลที่กรอกไม่ถูกต้อง'];
}
