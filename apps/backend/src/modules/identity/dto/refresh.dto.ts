import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}
