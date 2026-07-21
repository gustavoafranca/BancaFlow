import type { ToggleAccountStatusAction } from '@bancaflow/identity';
import { IsIn } from 'class-validator';

const ACTIONS: ToggleAccountStatusAction[] = [
  'activate',
  'deactivate',
  'block',
  'unblock',
];

export class ToggleAccountStatusDto {
  @IsIn(ACTIONS)
  action!: ToggleAccountStatusAction;
}
