import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config as loadEnv } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

function carregarEnvBackend() {
  const candidatos = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/backend/.env'),
  ];

  for (const arquivo of candidatos) {
    if (!fs.existsSync(arquivo)) continue;
    loadEnv({ path: arquivo, override: false });
    if (process.env.DATABASE_URL) return;
  }
}

async function bootstrap() {
  carregarEnvBackend();
  const app = await NestFactory.create(AppModule, { cors: true });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}
bootstrap();
