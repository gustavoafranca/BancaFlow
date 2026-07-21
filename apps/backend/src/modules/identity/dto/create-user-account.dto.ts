import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const ADMINISTRABLE_ROLES = ['ADMIN', 'USER'] as const;

export class CreateUserAccountDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsIn(ADMINISTRABLE_ROLES)
  role!: (typeof ADMINISTRABLE_ROLES)[number];
}
