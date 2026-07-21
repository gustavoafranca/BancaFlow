import { Injectable } from '@nestjs/common';
import type { Clock } from '@bancaflow/identity';

/** Implementação de `Clock` baseada no relógio do sistema. */
@Injectable()
export class SystemClockProvider implements Clock {
  now(): Date {
    return new Date();
  }
}
