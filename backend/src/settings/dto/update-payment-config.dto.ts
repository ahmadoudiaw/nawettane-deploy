import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentConfigDto {
  @IsOptional()
  @IsBoolean()
  waveEnabled?: boolean;

  @IsOptional()
  @IsString()
  waveApiKey?: string;

  @IsOptional()
  @IsString()
  waveMerchantId?: string;

  @IsOptional()
  @IsBoolean()
  omEnabled?: boolean;

  @IsOptional()
  @IsString()
  omClientId?: string;

  @IsOptional()
  @IsString()
  omClientSecret?: string;

  @IsOptional()
  @IsString()
  omMerchantKey?: string;

  @IsOptional()
  @IsBoolean()
  sandbox?: boolean;
}
