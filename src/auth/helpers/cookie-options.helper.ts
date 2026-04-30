import { CookieOptions } from 'express';

export function getCookieOptions(): CookieOptions {
  return process.env.NODE_ENV === 'production'
    ? {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.sljsupply-center.com',
        path: '/',
      }
    : {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      };
}
