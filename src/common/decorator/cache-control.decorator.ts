import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { CacheControlInterceptor } from '../interceptors/cache-control.interceptor';

export const CACHE_CONTROL_KEY = 'cache_control';

export function CacheControl(value: string) {
  return applyDecorators(
    SetMetadata(CACHE_CONTROL_KEY, value),
    UseInterceptors(new CacheControlInterceptor(value)),
  );
}

// Predefined cache control decorators
export const NoCache = () =>
  CacheControl('no-cache, no-store, must-revalidate');
export const CacheForMinutes = (minutes: number) =>
  CacheControl(`public, max-age=${minutes * 60}`);
export const CacheForHours = (hours: number) =>
  CacheControl(`public, max-age=${hours * 3600}`);
export const CacheForDays = (days: number) =>
  CacheControl(`public, max-age=${days * 86400}`);
export const PrivateCache = (seconds: number) =>
  CacheControl(`private, max-age=${seconds}`);
export const PublicCache = (seconds: number) =>
  CacheControl(`public, max-age=${seconds}`);
