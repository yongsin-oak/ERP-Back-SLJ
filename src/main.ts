import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe, LogLevel, VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import cookieParser from 'cookie-parser';
import { DateTime } from 'luxon';

async function bootstrap() {
  DateTime.now().setZone('Asia/Bangkok').toISO();

  const logLevels: LogLevel[] =
    process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'];

  const app = await NestFactory.create(AppModule, { logger: logLevels });
  const corsOrigin = [process.env.CORS_ORIGIN, 'http://localhost:5173'];
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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

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
  printLine(` Port: ${port} `);
  printLine(` CORS Origin: ${corsOrigin.join(', ')} `);
  printLine(` API Base URL: ${currentURL}/api/v1 `);
  printLine(` Swagger URL: ${currentURL}/swagger `);
  console.log('|' + '-'.repeat(LINE_WIDTH - 2) + '|');
}
bootstrap();
