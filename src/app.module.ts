import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { JwtAccessStrategy } from './auth/jwt-access.strategy';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { JwtRefreshStrategy } from './auth/jwt-refresh.strategy';
import { RolesGuard } from './auth/roles.guard';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { GlobalExceptionFilter } from './errors/global-exception.filter';
import { PermissionGuard } from './permissions/permission.guard';

@Module({
  imports: [PassportModule],
  controllers: [AppController],
  providers: [
    JwtAccessStrategy,
    JwtRefreshStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    RolesGuard,
    PermissionGuard,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
