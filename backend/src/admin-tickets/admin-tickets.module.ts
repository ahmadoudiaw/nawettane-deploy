import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminTicketsController } from './admin-tickets.controller';
import { AdminTicketsService } from './admin-tickets.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminTicketsController],
  providers: [AdminTicketsService],
})
export class AdminTicketsModule {}
