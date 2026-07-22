import { Result } from '@bancaflow/shared';
import type { DuplicateCandidateDTO } from '../../shared/dto/betting-agent.dto';

/**
 * Sonda de possível duplicidade dentro da própria Banca. Coincidência por
 * telefone normalizado OU por par nome+apelido normalizado. Retorna apenas
 * candidatos mínimos tenant-scoped — nunca entidades nem dados de outra Banca.
 */
export interface DuplicateProbe {
  bancaId: string;
  /** Telefones já normalizados (dígitos). */
  phones: string[];
  name: string | null;
  nickname: string | null;
}

export interface PartyDuplicateQuery {
  findCandidates(probe: DuplicateProbe): Promise<Result<DuplicateCandidateDTO[]>>;
}
