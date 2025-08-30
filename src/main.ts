import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DateTime } from 'luxon';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  DateTime.now().setZone('Asia/Bangkok').toISO();
  const app = await NestFactory.create(AppModule);
  const corsOrigin = [process.env.CORS_ORIGIN, 'http://localhost:5173'];
  const key = process.env.ENCRYPTION_KEY;
  const port = process.env.PORT || 3000;
  const server = app.getHttpAdapter().getInstance();
  server.set('trust proxy', 1);
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  const config = new DocumentBuilder()
    .setTitle('ERP API')
    .setDescription('SLJ Supply Center API')
    .setVersion('1.0')
    .addTag('API')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(port, '0.0.0.0');

  const currentURL = await app.getUrl();

  const LINE_WIDTH = 72;

  const printLine = (content: string = '', repeat: string = '-') => {
    const pad = Math.max(0, (LINE_WIDTH - 2 - content.length) / 2);
    const padBeforeLength = pad;
    const padAfterLength = pad % 1 === 0 ? pad : pad + 1;
    const padded =
      repeat.repeat(Math.max(0, padBeforeLength)) +
      content +
      repeat.repeat(Math.max(0, padAfterLength));
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
