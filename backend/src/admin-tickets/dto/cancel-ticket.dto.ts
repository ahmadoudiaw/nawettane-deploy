import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CancelTicketDto {
  @IsNotEmpty({ message: 'Le motif est obligatoire.' })
  @IsString()
  @MinLength(5, { message: 'Le motif doit contenir au moins 5 caractères.' })
  cancelReason!: string;
}
