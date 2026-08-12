import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import { DateTime } from 'luxon';
import { humanizeValidationErrors } from './common/helpers/validation.helper';

// Describe the DB target without leaking credentials (host:port/db only).
function describeDb(dataSource: DataSource): string {
  const opts = dataSource.options as { url?: string; host?: string; port?: number; database?: string };
  if (opts.url) {
    try {
      const u = new URL(opts.url);
      return `${u.host}${u.pathname}`;
    } catch {
      return 'DATABASE_URL';
    }
  }
  return `${opts.host}:${opts.port}/${opts.database}`;
}

async function bootstrap() {
  DateTime.now().setZone('Asia/Bangkok').toISO();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // TypeOrmModule opens the connection during create(); if it fails the app
  // never reaches here (see the bootstrap().catch below). Report the result.
  const dataSource = app.get(DataSource);
  const dbTarget = describeDb(dataSource);
  const dbStatus = dataSource.isInitialized ? `connected (${dbTarget})` : `NOT connected (${dbTarget})`;
  // MAIN_SITE_URL is the documented name; CORS_ORIGIN is kept as a fallback so
  // existing deployments keep working. Undefined entries are dropped — leaving
  // them in the array makes the allowlist harder to reason about.
  const corsOrigin = [
    process.env.MAIN_SITE_URL,
    process.env.CORS_ORIGIN,
    'http://localhost:5173',
  ].filter((origin): origin is string => !!origin);
  const port = process.env.PORT || 3000;

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      // Surface friendly Thai messages instead of class-validator's English defaults.
      exceptionFactory: (errors) => new BadRequestException(humanizeValidationErrors(errors)),
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('ERP API')
    .setDescription('SLJ Supply Center API')
    .setVersion('1.0')
    .addTag('API')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('swagger', app, () => SwaggerModule.createDocument(app, config));

  await app.listen(port, '0.0.0.0');

  const currentURL = await app.getUrl();
  const LINE_WIDTH = 72;
  const printLine = (content = '', repeat = '-') => {
    const pad = Math.max(0, (LINE_WIDTH - 2 - content.length) / 2);
    const padded =
      repeat.repeat(Math.max(0, pad)) +
      content +
      repeat.repeat(Math.max(0, pad % 1 === 0 ? pad : pad + 1));
    console.log(`|${padded}|`);
  };

  console.log('|' + '-'.repeat(LINE_WIDTH - 2) + '|');
  printLine(' SLJ Supply Center API ', ' ');
  console.log('|' + '-'.repeat(LINE_WIDTH - 2) + '|');
  printLine(` Environment: ${process.env.NODE_ENV || 'development'} `);
  printLine(` Database: ${dbStatus} `);
  printLine(` Port: ${port} `);
  printLine(` CORS Origin: ${corsOrigin.join(', ')} `);
  printLine(` API Base URL: ${currentURL}/api/v1 `);
  printLine(` Swagger URL: ${currentURL}/swagger `);
  console.log('|' + '-'.repeat(LINE_WIDTH - 2) + '|');
}
bootstrap().catch((err) => {
  // A DB connection failure during module init surfaces here too — the message
  // above ("Database: NOT connected") won't have printed in that case.
  console.error('❌ Failed to start:', err?.message ?? err);
  process.exit(1);
});
