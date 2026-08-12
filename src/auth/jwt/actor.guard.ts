import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { Request } from 'express';
import { ErrorCode } from '@app/common/constants/error-code.enum';

/**
 * A PIN failure is a *secondary* identity failure — the session is often still
 * valid. Tagging it lets the client re-prompt for the PIN instead of running the
 * session-refresh/redirect-to-login path, which would throw away in-progress work.
 */
function actorUnauthorized(message: string): UnauthorizedException {
  return new UnauthorizedException({
    message,
    error: 'Unauthorized',
    code: ErrorCode.ActorTokenInvalid,
  });
}

@Injectable()
export class ActorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const actorToken = req.headers['x-actor-token'] as string;

    // Bypass ได้เฉพาะตอนที่ client ยังไม่ส่ง actor token มา — ถ้าส่งมาต้องตรวจจริงเสมอ
    // ไม่งั้น identity ปลอม (dev-bypass) จะกลืน token ที่ถูกต้องจนหา employee ไม่เจอ
    if (!actorToken && process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      (req as any).actor = {
        employeeId: 'dev-bypass',
        name: 'Dev Actor',
        role: 'SuperAdmin',
        terminalId: null,
      };
      return true;
    }

    if (!actorToken) throw actorUnauthorized('กรุณายืนยัน PIN ก่อนดำเนินการ');

    try {
      const payload = this.verifyToken(actorToken);
      if (payload.type !== 'actor') throw new Error('Wrong token type');
      (req as any).actor = {
        employeeId: payload.employeeId,
        name: payload.name,
        role: payload.role,
        terminalId: payload.terminalId,
      };
      return true;
    } catch {
      throw actorUnauthorized('การยืนยัน PIN หมดอายุ กรุณายืนยัน PIN ใหม่อีกครั้ง');
    }
  }

  private verifyToken(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
    const [header, payload, signature] = parts;
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const expected = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    if (signature !== expected) throw new Error('Invalid signature');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    return decoded;
  }
}
