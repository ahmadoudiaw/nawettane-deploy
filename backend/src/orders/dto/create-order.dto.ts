import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  matchId!: string;

  @IsString()
  @IsNotEmpty()
  ticketCategoryId!: string;

  @IsString()
  @IsNotEmpty()
  buyerName!: string;

  @IsString()
  @IsNotEmpty()
  buyerPhone!: string;

  @IsOptional()
  @IsEmail()
  buyerEmail?: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
