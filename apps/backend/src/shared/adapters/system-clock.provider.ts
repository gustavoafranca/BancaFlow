import { Injectable } from '@nestjs/common';
import type { Clock } from '@bancaflow/shared';

/**
 * Implementação compartilhada de `Clock` (porta comum a todos os módulos de
 * domínio) baseada no relógio do sistema. Usada por qualquer módulo que
 * precise de datas determinísticas em teste (Identity, Participants, ...).
 */
@Injectable()
export class SystemClockProvider implements Clock {
  now(): Date {
    return new Date();
  }
}
