import 'dotenv/config';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './shared/errors/api-exception.filter';
import {
  buildCorsOptions,
  resolveCorsOrigins,
  resolveTrustedProxyIps,
  validateSecuritySecrets,
} from './config/security.config';

async function bootstrap() {
  // Falha o startup (exit 1) se `JWT_SECRET`/`REFRESH_TOKEN_SECRET` estiverem
  // ausentes, curtos (< 32 chars) ou iguais entre si (D11) — nunca um
  // fallback fixo tipo `'secret'` chega a produção.
  try {
    validateSecuritySecrets();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // Fronteira de proxy (D11): o Express só deve popular `req.ips`/`req.ip` a
  // partir de `X-Forwarded-*` quando o peer imediato é um proxy conhecido —
  // NUNCA `app.set('trust proxy', true)` (confiaria em qualquer peer). Sem
  // `TRUSTED_PROXY_IPS` configurada, a lista é vazia e nenhum peer é
  // confiável. A checagem robusta (decisiva para `X-Forwarded-Host`) é feita
  // diretamente pelo `TenantResolverMiddleware` via `req.socket.remoteAddress`.
  const trustedProxyIps = resolveTrustedProxyIps();
  app.set('trust proxy', trustedProxyIps);

  // Credenciais por cookie exigem allowlist explícita — NUNCA `origin: true`
  // (qualquer origem). `CORS_ORIGINS` é uma lista separada por vírgula.
  const allowedOrigins = resolveCorsOrigins();
  app.enableCors(buildCorsOptions(allowedOrigins));

  // DTOs com `class-validator`: rejeita corpo com campos desconhecidos ou
  // ausentes/mal-tipados antes de chegar a qualquer caso de uso.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 4000);
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(port);
}

void bootstrap();
