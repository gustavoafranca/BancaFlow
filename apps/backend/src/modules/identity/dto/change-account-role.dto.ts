import { IsIn } from 'class-validator';

const ADMINISTRABLE_ROLES = ['ADMIN', 'USER'] as const;

export class ChangeAccountRoleDto {
  @IsIn(ADMINISTRABLE_ROLES)
  role!: (typeof ADMINISTRABLE_ROLES)[number];
}
