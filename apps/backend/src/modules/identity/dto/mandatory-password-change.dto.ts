import { IsString, MinLength } from 'class-validator';

export class MandatoryPasswordChangeDto {
  @IsString()
  @MinLength(1)
  newPassword!: string;
}
