import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      const req = context.switchToHttp().getRequest();
      req.user = { sub: 'dev-bypass', username: 'dev', role: 'SuperAdmin' };
      return true;
    }
    return super.canActivate(context);
  }
}
