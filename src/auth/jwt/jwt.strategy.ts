// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { config } from 'dotenv';

config();
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const token = req?.cookies?.token;
          console.log('🔍 Extracting JWT from cookies:', {
            hasCookies: !!req.cookies,
            hasToken: !!token,
            token: token ? `${token.substring(0, 20)}...` : 'none',
          });
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    console.log('🎯 JWT Payload validated:', {
      username: payload.username,
      role: payload.role,
      exp: payload.exp ? new Date(payload.exp * 1000) : 'no expiry',
    });
    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
