import { Controller, Get, Param, Query } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Public()
  @Get('by-phone')
  async getByPhone(@Query('phone') phone: string) {
    return this.ticketsService.getByPhone(phone);
  }

  @Public()
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.ticketsService.getById(id);
  }
}
