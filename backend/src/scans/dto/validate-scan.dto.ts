import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ValidateScanDto {
  @IsString()
  @IsNotEmpty()
  ticketCode!: string;

  @IsString()
  @IsNotEmpty()
  matchId!: string;

  @IsOptional()
  @IsString()
  deviceLabel?: string;
}
