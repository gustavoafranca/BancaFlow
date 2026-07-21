import { IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsString()
  @MinLength(1)
  targetUserId!: string;
}
