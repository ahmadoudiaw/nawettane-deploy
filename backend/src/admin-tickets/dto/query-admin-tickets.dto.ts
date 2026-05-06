import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryAdminTicketsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  matchId?: string;

  @IsOptional()
  @IsString()
  ticketCategoryId?: string;

  @IsOptional()
  @IsIn(['GENERATED', 'USED', 'CANCELLED'])
  status?: 'GENERATED' | 'USED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
