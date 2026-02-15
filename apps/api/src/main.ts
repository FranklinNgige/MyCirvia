import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { env } from './env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(env.PORT);
}

bootstrap();
