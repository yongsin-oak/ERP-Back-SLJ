import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DateTime } from 'luxon';

async function bootstrap() {
  DateTime.now().setZone('Asia/Bangkok').toISO();
  const app = await NestFactory.create(AppModule);
  const corsOrigin = [process.env.CORS_ORIGIN, 'http://localhost:5173'];
  const key = process.env.ENCRYPTION_KEY;
  const port = process.env.PORT || 3001;
  app.use(cookieParser());
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
  await app.listen(port);

  console.log((await app.getUrl()).toString());
  console.log(`Cors enabled for origin: ${corsOrigin}`);
}
bootstrap();
