import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAppSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  applicationTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  developerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  developerWebsite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  appDownloadAndroidUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  appDownloadIosUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  appDownloadHelpText?: string;
}
