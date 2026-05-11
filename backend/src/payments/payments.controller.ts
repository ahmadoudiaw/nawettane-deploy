import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { WaveService } from './wave.service';
import { MockConfirmPaymentDto } from './dto/mock-confirm-payment.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly waveService: WaveService,
  ) {}

  // ─── Mock (existing, ne pas toucher) ─────────────────────────────────────

  @Public()
  @Post(':orderId/mock-confirm')
  async mockConfirm(
    @Param('orderId') orderId: string,
    @Body() dto: MockConfirmPaymentDto,
  ) {
    return this.paymentsService.mockConfirm(orderId, dto);
  }

  // ─── Wave réel ────────────────────────────────────────────────────────────

  @Public()
  @Post(':orderId/wave/initiate')
  async waveInitiate(@Param('orderId') orderId: string) {
    return this.waveService.initiate(orderId);
  }

  /**
   * Webhook Wave : route enregistrée AVANT /:orderId/wave/initiate
   * pour éviter tout conflit de routage.
   * Corps brut requis pour vérification HMAC-SHA256.
   */
  @Public()
  @Post('wave/webhook')
  async waveWebhook(@Req() req: RawBodyRequest<Request>) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const signature = (req.headers['x-wave-signature'] as string) ?? '';
    return this.waveService.handleWebhook(rawBody, signature);
  }

  // ─── Statut commande (polling mobile post-paiement) ──────────────────────

  @Public()
  @Get(':orderId/status')
  async orderStatus(@Param('orderId') orderId: string) {
    return this.waveService.getOrderStatus(orderId);
  }
}
