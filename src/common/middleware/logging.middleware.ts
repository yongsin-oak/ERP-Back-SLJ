import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const requestId = (req as any).requestId || 'unknown';

    // Log request details
    this.logger.log(`📥 [${requestId}] ${method} ${originalUrl} - IP: ${ip}`);

    // Log headers (excluding sensitive data)
    const filteredHeaders = { ...headers };
    delete filteredHeaders.authorization;
    delete filteredHeaders.cookie;
    this.logger.debug(
      `📋 [${requestId}] Headers: ${JSON.stringify(filteredHeaders, null, 2)}`,
    );

    // Log request body (excluding sensitive data)
    if (req.body && Object.keys(req.body).length > 0) {
      const filteredBody = { ...req.body };
      // Hide sensitive fields
      ['password', 'currentPassword', 'newPassword', 'currentPass', 'newPass'].forEach(
        (f) => { if (filteredBody[f]) filteredBody[f] = '***'; },
      );
      this.logger.debug(
        `📦 [${requestId}] Body: ${JSON.stringify(filteredBody, null, 2)}`,
      );
    }

    // Log cookies
    if (req.cookies && Object.keys(req.cookies).length > 0) {
      const cookies = { ...req.cookies };
      if (cookies.token) {
        cookies.token = `${cookies.token.substring(0, 20)}...`;
      }
      this.logger.debug(
        `🍪 [${requestId}] Cookies: ${JSON.stringify(cookies, null, 2)}`,
      );
    }

    // Log query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      this.logger.debug(
        `🔍 [${requestId}] Query: ${JSON.stringify(req.query, null, 2)}`,
      );
    }

    // Override res.send to capture response
    const originalSend = res.send;
    res.send = function (body: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log response
      const logger = new Logger('HTTP');
      logger.log(
        `📤 [${requestId}] ${method} ${originalUrl} - ${statusCode} - ${duration}ms`,
      );

      // Log response body (only for errors or if in debug mode)
      if (statusCode >= 400 || process.env.LOG_RESPONSE_BODY === 'true') {
        try {
          const responseBody =
            typeof body === 'string' ? JSON.parse(body) : body;
          logger.debug(
            `📨 [${requestId}] Response: ${JSON.stringify(responseBody, null, 2)}`,
          );
        } catch (error) {
          logger.debug(`📨 [${requestId}] Response: ${body}`);
        }
      }

      return originalSend.call(this, body);
    };

    next();
  }
}
