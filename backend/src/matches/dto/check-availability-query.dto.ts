import { IsDateString, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CheckAvailabilityQueryDto {
  @IsString()
  @IsNotEmpty()
  venueId!: string;

  @IsDateString()
  matchDate!: string;

  @IsOptional()
  @IsNumberString()
  durationMinutes?: string;

  @IsOptional()
  @IsNumberString()
  bufferMinutes?: string;

  @IsOptional()
  @IsString()
  excludeMatchId?: string;
}
