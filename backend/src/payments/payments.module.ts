import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WaveService } from './wave.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, WaveService],
  exports: [PaymentsService, WaveService],
})
export class PaymentsModule {}
