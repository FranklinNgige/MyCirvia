import { NestFactory } from '@nestjs/core';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './chat/redis-io.adapter';
import { env } from './env';


function resolvePort(): number {
  const portIndex = process.argv.findIndex((arg) => arg === '--port');
  if (portIndex >= 0) {
    const portArg = Number(process.argv[portIndex + 1]);
    if (!Number.isNaN(portArg) && portArg > 0) {
      return portArg;
    }
  }
  return env.PORT;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-RateLimit-Limit', process.env.RATE_LIMIT_MAX ?? '100');
    res.setHeader('X-RateLimit-Window', process.env.RATE_LIMIT_WINDOW ?? '60');
    next();
  });

  app.enableShutdownHooks();
  await app.listen(resolvePort());
}

void bootstrap();
