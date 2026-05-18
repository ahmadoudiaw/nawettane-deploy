import { Module } from '@nestjs/common';
import { AgentOfflineController } from './agent-offline.controller';
import { AgentOfflineService } from './agent-offline.service';

@Module({
  controllers: [AgentOfflineController],
  providers: [AgentOfflineService],
})
export class AgentOfflineModule {}
