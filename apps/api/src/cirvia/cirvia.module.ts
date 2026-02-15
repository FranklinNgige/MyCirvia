import { Module } from '@nestjs/common';
import { AuditLogService } from '../audit/audit-log.service';
import { NotificationService } from '../notifications/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { CirviaController } from './cirvia.controller';
import { CirviaService } from './cirvia.service';

@Module({
  controllers: [CirviaController],
  providers: [CirviaService, PrismaService, AuditLogService, NotificationService],
  exports: [CirviaService],
})
export class CirviaModule {}
