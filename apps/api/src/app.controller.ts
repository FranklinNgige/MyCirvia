import { Controller, Get, InternalServerErrorException, UseGuards } from '@nestjs/common';
import { CurrentUser } from './auth/current-user.decorator';
import { Public } from './auth/public.decorator';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';

@Controller()
export class AppController {
  @Public()
  @Get('/public')
  publicEndpoint() {
    return { ok: true };
  }

  @Get('/protected')
  protectedEndpoint(@CurrentUser() user: { userId: string; email: string; role: string }) {
    return { user };
  }

  @Roles('admin')
  @UseGuards(RolesGuard)
  @Get('/admin')
  adminEndpoint() {
    return { ok: true };
  }

  @Get('/error')
  throwError() {
    throw new InternalServerErrorException('unique constraint violation: email');
  }

  @Public()
  @Get('/workers/health')
  workerHealth() {
    return { status: 'ok' };
  }
}
