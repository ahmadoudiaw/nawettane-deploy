import { Module } from '@nestjs/common';
import { DeletePreviewController } from './delete-preview.controller';
import { DeletePreviewService } from './delete-preview.service';

@Module({
  controllers: [DeletePreviewController],
  providers: [DeletePreviewService],
})
export class DeletePreviewModule {}
