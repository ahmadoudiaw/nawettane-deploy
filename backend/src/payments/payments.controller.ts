import { Body, Controller, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MockConfirmPaymentDto } from './dto/mock-confirm-payment.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post(':orderId/mock-confirm')
  async mockConfirm(
    @Param('orderId') orderId: string,
    @Body() dto: MockConfirmPaymentDto,
  ) {
    return this.paymentsService.mockConfirm(orderId, dto);
  }
}
