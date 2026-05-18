import { IsNotEmpty, IsString } from 'class-validator';

export class OfflineTicketsQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'matchId est requis.' })
  matchId!: string;
}
