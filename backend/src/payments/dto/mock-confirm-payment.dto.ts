import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class MockConfirmPaymentDto {
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @IsOptional()
  @IsString()
  providerReference?: string;
}
