import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/] });
  app.useBodyParser('json', { limit: '50kb' });

  // Se o front já foi compilado (web/dist), a API também o serve em "/".
  const web = join(__dirname, '..', '..', 'web', 'dist');
  if (existsSync(web)) {
    app.useStaticAssets(web);
    const express = app.getHttpAdapter().getInstance();
    express.get(/^\/(?!api).*/, (_req: unknown, res: { sendFile: (p: string) => void }) => res.sendFile(join(web, 'index.html')));
  }

  const porta = Number(process.env.PORT ?? 3000);
  await app.listen(porta, '127.0.0.1');
  console.log(`API RENACH (demonstrativa) em http://localhost:${porta}/api — nenhuma transmissão externa.`);
}
bootstrap();
