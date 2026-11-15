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

  // Local: só 127.0.0.1. Em contêiner (Coolify/Docker) defina HOST=0.0.0.0 para o proxy alcançar a porta.
  const porta = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '127.0.0.1';
  app.enableShutdownHooks();
  await app.listen(porta, host);
  console.log(`API RENACH (demonstrativa) em http://${host}:${porta}/api — nenhuma transmissão externa.`);
}
bootstrap();
