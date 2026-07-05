import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** ตัวตนของพนักงานที่ยืนยัน PIN แล้ว — เซ็ตโดย ActorGuard ลงบน req.actor */
export interface ActorContext {
  employeeId: string;
  name: string;
  role: string;
  terminalId: string | null;
}

/**
 * ดึง actor (พนักงานที่ยืนยัน PIN) จาก request
 * ใช้คู่กับ @UseGuards(ActorGuard) เท่านั้น — ถ้าไม่มี guard ค่าจะเป็น undefined
 */
export const Actor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActorContext => {
    const req = ctx.switchToHttp().getRequest();
    return req.actor as ActorContext;
  },
);
