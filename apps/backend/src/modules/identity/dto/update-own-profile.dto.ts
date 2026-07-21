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

@ValidatorConstraint({ name: 'AtLeastOneOfNameOrEmail', async: false })
class AtLeastOneOfNameOrEmailConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as UpdateOwnProfileDto;
    return dto.name !== undefined || dto.email !== undefined;
  }

  defaultMessage(): string {
    return 'At least one of name or email must be provided';
  }
}

export class UpdateOwnProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsInt()
  @Validate(AtLeastOneOfNameOrEmailConstraint)
  version!: number;
}
