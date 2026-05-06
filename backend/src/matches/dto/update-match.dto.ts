import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AgeCategory, MatchStatus } from '@prisma/client';
import { MatchTicketCategoryDto } from './match-ticket-category.dto';

export class UpdateMatchDto {
  @IsOptional()
  @IsString()
  seasonId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsString()
  homeTeamId?: string;

  @IsOptional()
  @IsString()
  awayTeamId?: string;

  @IsOptional()
  @IsString()
  competitionName?: string;

  @IsOptional()
  @IsEnum(AgeCategory)
  category?: AgeCategory;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsDateString()
  matchDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ticketQuota?: number;

  @IsOptional()
  @IsString()
  ticketPrice?: string;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MatchTicketCategoryDto)
  ticketCategories?: MatchTicketCategoryDto[];
}
