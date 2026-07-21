import {
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'AtLeastOneOfUsernameNameOrEmail', async: false })
class AtLeastOneOfUsernameNameOrEmailConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as UpdateUserAccountDto;
    return (
      dto.username !== undefined ||
      dto.name !== undefined ||
      dto.email !== undefined
    );
  }

  defaultMessage(): string {
    return 'At least one of username, name or email must be provided';
  }
}

export class UpdateUserAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsInt()
  @Validate(AtLeastOneOfUsernameNameOrEmailConstraint)
  version!: number;
}
